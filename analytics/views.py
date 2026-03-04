# analytics/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime, timedelta

from .utils import (
    calculate_dashboard_stats,
    calculate_trends,
    calculate_by_department,
    calculate_by_location,
    calculate_safety_metrics,
    calculate_monthly_comparison,
    get_date_range,
)

class AnalyticsViewSet(viewsets.ViewSet):
    """
    Analytics and KPI endpoints
    
    Provides aggregated statistics and metrics
    """
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        GET /api/analytics/dashboard/
        
        Overall dashboard statistics
        
        Query params:
        - period: 'today', 'week', 'month', 'quarter', 'year' (default: 'month')
        """
        period = request.query_params.get('period', 'month')
        start_date, end_date = get_date_range(period)
        
        stats = calculate_dashboard_stats(start_date, end_date)
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """
        GET /api/analytics/trends/
        
        Incident trends over time
        
        Query params:
        - days: Number of days to analyze (default: 30)
        """
        days = int(request.query_params.get('days', 30))
        
        if days > 365:
            return Response(
                {'error': 'Maximum 365 days'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        trends = calculate_trends(days=days)
        
        return Response({
            'period_days': days,
            'data': trends
        })
    
    @action(detail=False, methods=['get'], url_path='by-department')
    def by_department(self, request):
        """
        GET /api/analytics/by-department/
        
        Incidents grouped by department
        """
        data = calculate_by_department()
        
        return Response({
            'departments': data
        })
    
    @action(detail=False, methods=['get'], url_path='by-location')
    def by_location(self, request):
        """
        GET /api/analytics/by-location/
        
        Top incident locations (hotspots)
        """
        data = calculate_by_location()
        
        return Response({
            'locations': data
        })
    
    @action(detail=False, methods=['get'], url_path='safety-metrics')
    def safety_metrics(self, request):
        """
        GET /api/analytics/safety-metrics/
        
        Calculate safety KPIs (LTIFR, TRIR, Severity Rate)
        
        Query params:
        - period: 'month', 'quarter', 'year' (default: 'month')
        - work_hours: Total work hours (optional)
        """
        period = request.query_params.get('period', 'month')
        work_hours = request.query_params.get('work_hours')
        
        if work_hours:
            work_hours = int(work_hours)
        
        start_date, end_date = get_date_range(period)
        
        metrics = calculate_safety_metrics(start_date, end_date, work_hours)
        
        return Response(metrics)
    
    @action(detail=False, methods=['get'], url_path='monthly-comparison')
    def monthly_comparison(self, request):
        """
        GET /api/analytics/monthly-comparison/
        
        Compare current month vs last month
        """
        comparison = calculate_monthly_comparison()
        
        return Response(comparison)