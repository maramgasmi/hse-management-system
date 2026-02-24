from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from drf_spectacular.utils import extend_schema

from .tasks import send_incident_notification
from .filters import IncidentFilter
from .models import Incident
from .serializers import (
    IncidentListSerializer,
    IncidentDetailSerializer,
    IncidentCreateUpdateSerializer,
    IncidentWithRelationsSerializer,
)

class IncidentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Incident model
    
    Provides full CRUD API:
    GET    /api/incidents/          → List incidents
    POST   /api/incidents/          → Create incident
    GET    /api/incidents/{id}/     → Get incident
    PUT    /api/incidents/{id}/     → Full update
    PATCH  /api/incidents/{id}/     → Partial update
    DELETE /api/incidents/{id}/     → Delete incident
    
    Custom Actions:
    POST   /api/incidents/{id}/validate_incident/   → Validate
    POST   /api/incidents/{id}/close_incident/      → Close
    GET    /api/incidents/my_incidents/             → My incidents
    GET    /api/incidents/overdue/                  → Overdue incidents
    GET    /api/incidents/statistics/               → Statistics
    """
    
    permission_classes = [IsAuthenticated]

    schema = None

    # Filtering, searching, ordering
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    
    # Fields to filter by exact match
    filterset_class = IncidentFilter
    
    # Fields to search in
    search_fields = [
        'reference',
        'title',
        'description',
        'location',
        'department',
    ]
    
    # Fields to order by
    ordering_fields = [
        'incident_date',
        'severity',
        'status',
        'created_at',
        'department',
    ]
    
    # Default ordering
    ordering = ['-incident_date']
    
    # ============================================
    # QUERYSET
    # ============================================
    
    def get_queryset(self):
        """
        Return queryset based on user permissions
        
        - Superusers: See all incidents
        - Staff: See all incidents
        - Regular users: See only their own incidents
        """
        user = self.request.user
        
        if user.is_superuser or user.is_staff:
            return Incident.objects.all().select_related(
                'reporter',
                'assigned_to',
            ).prefetch_related(
                'capas',
                'evidence',
            )
        else:
            # Regular users see only incidents they reported
            return Incident.objects.filter(
                reporter=user
            ).select_related(
                'reporter',
                'assigned_to',
            )
        
        # select_related: Fetches ForeignKey in one SQL JOIN
        # prefetch_related: Fetches ManyToMany/reverse FK separately
        # Both prevent N+1 query problems
    
    # ============================================
    # SERIALIZER SELECTION
    # ============================================
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action
        
        - list: Lightweight (IncidentListSerializer)
        - retrieve: Full with relations (IncidentWithRelationsSerializer)
        - create/update: Write fields only (IncidentCreateUpdateSerializer)
        """
        if self.action == 'list':
            return IncidentListSerializer
        elif self.action == 'retrieve':
            return IncidentWithRelationsSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return IncidentCreateUpdateSerializer
        else:
            return IncidentDetailSerializer
    
    # ============================================
    # OVERRIDE DEFAULT METHODS
    # ============================================
    
    def perform_create(self, serializer):
        """
        Called when creating an incident
        Automatically sets reporter to current user
        """
        serializer.save(reporter=self.request.user)
    
    def perform_update(self, serializer):
        """
        Called when updating an incident
        """
        serializer.save()
    
    # ============================================
    # CUSTOM ACTIONS
    # ============================================
    
    @action(detail=True, methods=['post'], url_path='validate-incident')
    def validate_incident(self, request, pk=None):
        """
        Validate an incident
        
        POST /api/incidents/{id}/validate-incident/
        
        Changes status from SUBMITTED/UNDER_INVESTIGATION to VALIDATED
        """
        incident = self.get_object()
        
        if not incident.can_be_validated():
            return Response(
                {
                    'error': f'Incident cannot be validated from status: {incident.status}',
                    'allowed_statuses': ['SUBMITTED', 'UNDER_INVESTIGATION']
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = incident.validate(request.user)
        
        if success:
            serializer = IncidentDetailSerializer(incident)
            return Response(
                {
                    'message': f'Incident {incident.reference} validated successfully',
                    'incident': serializer.data
                },
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'error': 'Failed to validate incident'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'], url_path='close-incident')
    def close_incident(self, request, pk=None):
        """
        Close an incident
        
        POST /api/incidents/{id}/close-incident/
        """
        incident = self.get_object()
        
        if incident.status == Incident.STATUS_CLOSED:
            return Response(
                {'error': 'Incident is already closed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if incident.status != Incident.STATUS_VALIDATED:
            return Response(
                {'error': 'Only validated incidents can be closed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        incident.status = Incident.STATUS_CLOSED
        incident.save()
        
        serializer = IncidentDetailSerializer(incident)
        return Response(
            {
                'message': f'Incident {incident.reference} closed',
                'incident': serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'], url_path='my-incidents')
    def my_incidents(self, request):
        """
        Get incidents reported by or assigned to current user
        
        GET /api/incidents/my-incidents/
        """
        user = request.user
        
        incidents = Incident.objects.filter(
            reporter=user
        ).select_related('reporter', 'assigned_to')
        
        page = self.paginate_queryset(incidents)
        if page is not None:
            serializer = IncidentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = IncidentListSerializer(incidents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='overdue')
    def overdue(self, request):
        """
        Get overdue incidents
        
        GET /api/incidents/overdue/
        """
        from datetime import timedelta
        
        two_days_ago = timezone.now() - timedelta(days=2)
        
        overdue_incidents = Incident.objects.filter(
            status__in=['SUBMITTED', 'UNDER_INVESTIGATION'],
            reported_date__lt=two_days_ago
        ).select_related('reporter', 'assigned_to')
        
        serializer = IncidentListSerializer(overdue_incidents, many=True)
        return Response({
            'count': overdue_incidents.count(),
            'incidents': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Get incident statistics
        
        GET /api/incidents/statistics/
        
        Returns counts by status, severity, type, department
        """
        from django.db.models import Count
        
        queryset = self.get_queryset()
        
        # Count by status
        by_status = dict(
            queryset.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        
        # Count by severity
        by_severity = dict(
            queryset.values('severity')
            .annotate(count=Count('id'))
            .values_list('severity', 'count')
        )
        
        # Count by type
        by_type = dict(
            queryset.values('incident_type')
            .annotate(count=Count('id'))
            .values_list('incident_type', 'count')
        )
        
        # Count by department
        by_department = dict(
            queryset.values('department')
            .annotate(count=Count('id'))
            .values_list('department', 'count')
        )
        
        return Response({
            'total': queryset.count(),
            'by_status': by_status,
            'by_severity': by_severity,
            'by_type': by_type,
            'by_department': by_department,
        })
    def perform_create(self, serializer):
        """Called when creating an incident"""
        incident = serializer.save(reporter=self.request.user)
        
        # Queue background task to send notification
        send_incident_notification.delay(
            incident_id=incident.id,
            notification_type='created')
    
    def perform_update(self, serializer):
        """Called when updating an incident"""
        incident = serializer.save()
        
        # If assigned_to changed, send notification
        if 'assigned_to' in serializer.validated_data:
            if incident.assigned_to:
                send_incident_notification.delay(
                    incident_id=incident.id,
                    notification_type='assigned'
                )