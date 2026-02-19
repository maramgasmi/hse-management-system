from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from django.utils import timezone

from .models import CAPA
from .serializers import (
    CAPAListSerializer,
    CAPADetailSerializer,
    CAPACreateUpdateSerializer,
)

class CAPAViewSet(viewsets.ModelViewSet):
    """
    ViewSet for CAPA model
    
    GET    /api/capas/                   → List CAPAs
    POST   /api/capas/                   → Create CAPA
    GET    /api/capas/{id}/              → Get CAPA
    PUT    /api/capas/{id}/              → Full update
    PATCH  /api/capas/{id}/              → Partial update
    DELETE /api/capas/{id}/              → Delete CAPA
    
    Custom Actions:
    POST   /api/capas/{id}/complete/     → Mark complete
    POST   /api/capas/{id}/verify/       → Verify completion
    GET    /api/capas/my-capas/          → My assigned CAPAs
    GET    /api/capas/overdue/           → Overdue CAPAs
    """
    
    permission_classes = [IsAuthenticated]

    schema = None
    
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    
    filterset_fields = [
        'status',
        'action_type',
        'priority',
        'incident',
        'responsible_person',
    ]
    
    search_fields = [
        'reference',
        'title',
        'description',
        'incident__reference',
        'incident__title',
    ]
    
    ordering_fields = [
        'due_date',
        'priority',
        'status',
        'created_at',
    ]
    
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_superuser or user.is_staff:
            return CAPA.objects.all().select_related(
                'incident',
                'responsible_person',
                'created_by',
            )
        else:
            return CAPA.objects.filter(
                responsible_person=user
            ).select_related(
                'incident',
                'responsible_person',
                'created_by',
            )
    
    def get_serializer_class(self):
        """Return appropriate serializer"""
        if self.action == 'list':
            return CAPAListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CAPACreateUpdateSerializer
        else:
            return CAPADetailSerializer
    
    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark CAPA as completed
        """
        capa = self.get_object()
        success = capa.complete(request.user)
        
        if success:
            serializer = CAPADetailSerializer(capa)
            return Response({
                'message': f'CAPA {capa.reference} marked as completed',
                'capa': serializer.data
            })
        
        return Response(
            {'error': f'Cannot complete CAPA with status: {capa.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Verify CAPA completion
        
        POST /api/capas/{id}/verify/
        Body: {"notes": "Verification notes here"}
        """
        capa = self.get_object()
        notes = request.data.get('notes', '')
        success = capa.verify(request.user, notes)
        
        if success:
            serializer = CAPADetailSerializer(capa)
            return Response({
                'message': f'CAPA {capa.reference} verified',
                'capa': serializer.data
            })
        
        return Response(
            {'error': f'Cannot verify CAPA with status: {capa.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'], url_path='my-capas')
    def my_capas(self, request):
        """
        Get CAPAs assigned to current user
        
        GET /api/capas/my-capas/
        """
        capas = CAPA.objects.filter(
            responsible_person=request.user
        ).select_related('incident', 'responsible_person')
        
        page = self.paginate_queryset(capas)
        if page is not None:
            serializer = CAPAListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = CAPAListSerializer(capas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """
        Get overdue CAPAs
        
        GET /api/capas/overdue/
        """
        today = timezone.now().date()
        
        overdue_capas = CAPA.objects.filter(
            due_date__lt=today,
            status__in=['OPEN', 'IN_PROGRESS']
        ).select_related('incident', 'responsible_person')
        
        serializer = CAPAListSerializer(overdue_capas, many=True)
        return Response({
            'count': overdue_capas.count(),
            'capas': serializer.data
        })