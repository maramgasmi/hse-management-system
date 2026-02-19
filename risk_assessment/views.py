from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import RiskAssessment
from .serializers import RiskAssessmentSerializer

class RiskAssessmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for RiskAssessment
    
    GET    /api/risk-assessments/           → List
    POST   /api/risk-assessments/           → Create
    GET    /api/risk-assessments/{id}/      → Get
    PUT    /api/risk-assessments/{id}/      → Update
    PATCH  /api/risk-assessments/{id}/      → Partial update
    DELETE /api/risk-assessments/{id}/      → Delete
    
    Custom:
    GET    /api/risk-assessments/high-risk/ → High/Critical risks
    """
    
    queryset = RiskAssessment.objects.all().select_related(
        'incident',
        'assessed_by',
    )
    serializer_class = RiskAssessmentSerializer
    permission_classes = [IsAuthenticated]
    
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
    ]
    
    filterset_fields = [
        'risk_category',
        'probability',
        'impact',
    ]
    
    ordering_fields = ['risk_level', 'assessed_date']
    ordering = ['-risk_level']
    
    def perform_create(self, serializer):
        """Set assessed_by to current user"""
        serializer.save(assessed_by=self.request.user)
    
    @action(detail=False, methods=['get'], url_path='high-risk')
    def high_risk(self, request):
        """
        Get high and critical risk assessments
        
        """
        high_risk = RiskAssessment.objects.filter(
            risk_category__in=['HIGH', 'CRITICAL']
        ).select_related('incident', 'assessed_by')
        
        serializer = RiskAssessmentSerializer(high_risk, many=True)
        return Response({
            'count': high_risk.count(),
            'risk_assessments': serializer.data
        })