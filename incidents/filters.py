# incidents/filters.py

import django_filters
from django.db.models import Q
from django.utils import timezone
from .models import Incident

class IncidentFilter(django_filters.FilterSet):
    """
    Advanced filtering for Incident model
    """
    
    # ============================================
    # DATE FILTERS
    # ============================================
    
    incident_date_from = django_filters.DateTimeFilter(
        field_name='incident_date',
        lookup_expr='gte',
    )
    
    incident_date_to = django_filters.DateTimeFilter(
        field_name='incident_date',
        lookup_expr='lte',
    )
    
    # ============================================
    # MULTIPLE CHOICE - Use CharFilter with method
    # ============================================
    
    severity__in = django_filters.CharFilter(method='filter_severity_in')
    
    def filter_severity_in(self, queryset, name, value):
        """
        Filter by multiple severities
        Usage: ?severity__in=HIGH,CRITICAL
        """
        if not value:
            return queryset
        values = [v.strip().upper() for v in value.split(',')]
        return queryset.filter(severity__in=values)
    
    status__in = django_filters.CharFilter(method='filter_status_in')
    
    def filter_status_in(self, queryset, name, value):
        """
        Filter by multiple statuses
        Usage: ?status__in=SUBMITTED,UNDER_INVESTIGATION
        """
        if not value:
            return queryset
        values = [v.strip().upper() for v in value.split(',')]
        return queryset.filter(status__in=values)
    
    incident_type__in = django_filters.CharFilter(method='filter_type_in')
    
    def filter_type_in(self, queryset, name, value):
        """Filter by multiple incident types"""
        if not value:
            return queryset
        values = [v.strip().upper() for v in value.split(',')]
        return queryset.filter(incident_type__in=values)
    
    # ============================================
    # BOOLEAN FILTERS (these already work!)
    # ============================================
    
    has_injuries = django_filters.CharFilter(method='filter_has_injuries')
    
    def filter_has_injuries(self, queryset, name, value):
        """Filter by injury presence"""
        is_true = value.lower() in ('true', '1', 'yes')
        if is_true:
            return queryset.exclude(injuries__isnull=True).exclude(injuries='')
        else:
            return queryset.filter(Q(injuries__isnull=True) | Q(injuries=''))
    
    has_property_damage = django_filters.CharFilter(method='filter_has_property_damage')
    
    def filter_has_property_damage(self, queryset, name, value):
        """Filter by property damage presence"""
        is_true = value.lower() in ('true', '1', 'yes')
        if is_true:
            return queryset.exclude(property_damage__isnull=True).exclude(property_damage='')
        else:
            return queryset.filter(Q(property_damage__isnull=True) | Q(property_damage=''))
    
    is_assigned = django_filters.CharFilter(method='filter_is_assigned')
    
    def filter_is_assigned(self, queryset, name, value):
        """Filter by assignment status"""
        is_true = value.lower() in ('true', '1', 'yes')
        if is_true:
            return queryset.exclude(assigned_to__isnull=True)
        else:
            return queryset.filter(assigned_to__isnull=True)
    
    is_overdue = django_filters.CharFilter(method='filter_overdue')
    
    def filter_overdue(self, queryset, name, value):
        """Filter overdue incidents"""
        is_true = value.lower() in ('true', '1', 'yes')
        if not is_true:
            return queryset
        
        from datetime import timedelta
        two_days_ago = timezone.now() - timedelta(days=2)
        seven_days_ago = timezone.now() - timedelta(days=7)
        
        return queryset.filter(
            Q(status='SUBMITTED', reported_date__lt=two_days_ago) |
            Q(status='UNDER_INVESTIGATION', reported_date__lt=seven_days_ago)
        )
    
    has_time_lost = django_filters.CharFilter(method='filter_time_lost')
    
    def filter_time_lost(self, queryset, name, value):
        """Filter incidents with time lost"""
        is_true = value.lower() in ('true', '1', 'yes')
        if is_true:
            return queryset.filter(Q(work_hours_lost__gt=0) | Q(days_lost__gt=0))
        else:
            return queryset.filter(work_hours_lost=0, days_lost=0)
    
    # ============================================
    # TEXT SEARCH
    # ============================================
    
    title__icontains = django_filters.CharFilter(
        field_name='title',
        lookup_expr='icontains',
    )
    
    description__icontains = django_filters.CharFilter(
        field_name='description',
        lookup_expr='icontains',
    )
    
    location__icontains = django_filters.CharFilter(
        field_name='location',
        lookup_expr='icontains',
    )
    
    search = django_filters.CharFilter(method='filter_search')
    
    def filter_search(self, queryset, name, value):
        """Search across multiple fields"""
        return queryset.filter(
            Q(reference__icontains=value) |
            Q(title__icontains=value) |
            Q(description__icontains=value) |
            Q(location__icontains=value) |
            Q(department__icontains=value)
        )
    
    # ============================================
    # NUMERIC FILTERS
    # ============================================
    
    work_hours_lost__gte = django_filters.NumberFilter(
        field_name='work_hours_lost',
        lookup_expr='gte',
    )
    
    work_hours_lost__lte = django_filters.NumberFilter(
        field_name='work_hours_lost',
        lookup_expr='lte',
    )
    
    days_lost__gte = django_filters.NumberFilter(
        field_name='days_lost',
        lookup_expr='gte',
    )
    
    days_lost__lte = django_filters.NumberFilter(
        field_name='days_lost',
        lookup_expr='lte',
    )
    
    # ============================================
    # META - IMPORTANT: Don't include __in fields here!
    # ============================================
    
    class Meta:
        model = Incident
        fields = {
            'status': ['exact'],  
            'severity': ['exact'],  
            'incident_type': ['exact'],
            'department': ['exact'],
            'reporter': ['exact'],
            'assigned_to': ['exact'],
        }
        