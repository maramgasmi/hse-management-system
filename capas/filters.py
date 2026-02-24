import django_filters
from django.db.models import Q
from django.utils import timezone
from .models import CAPA

class CAPAFilter(django_filters.FilterSet):
    """Advanced filtering for CAPA model"""
    
    due_date_from = django_filters.DateFilter(
        field_name='due_date',
        lookup_expr='gte',
        label='Due Date From'
    )
    
    due_date_to = django_filters.DateFilter(
        field_name='due_date',
        lookup_expr='lte',
        label='Due Date To'
    )
    
    status__in = django_filters.MultipleChoiceFilter(
        field_name='status',
        choices=CAPA.STATUS_CHOICES
    )
    
    
    action_type__in = django_filters.MultipleChoiceFilter(
        field_name='action_type',
        choices=CAPA.TYPE_CHOICES
    )

    priority__gte = django_filters.NumberFilter(
        field_name='priority',
        lookup_expr='gte'
    )
    
    title__icontains = django_filters.CharFilter(
        field_name='title',
        lookup_expr='icontains'
    )
    
    description__icontains = django_filters.CharFilter(
        field_name='description',
        lookup_expr='icontains'
    )
    
    incident__reference = django_filters.CharFilter(
        field_name='incident__reference',
        lookup_expr='icontains',
        label='Incident Reference'
    )

    responsible_person__username = django_filters.CharFilter(
        field_name='responsible_person__username',
        lookup_expr='icontains'
    )
    
    is_overdue = django_filters.BooleanFilter(
        method='filter_overdue',
        label='Is Overdue'
    )
    
    def filter_overdue(self, queryset, name, value):
        today = timezone.now().date()
        
        if value:
            return queryset.filter(
                due_date__lt=today,
                status__in=['OPEN', 'IN_PROGRESS']
            )
        else:
            return queryset.exclude(
                due_date__lt=today,
                status__in=['OPEN', 'IN_PROGRESS']
            )
    
    is_completed = django_filters.BooleanFilter(
        method='filter_completed'
    )
    
    def filter_completed(self, queryset, name, value):
        """Filter completed CAPAs"""
        if value:
            return queryset.filter(
                status__in=['COMPLETED', 'VERIFIED', 'CLOSED']
            )
        else:
            return queryset.exclude(
                status__in=['COMPLETED', 'VERIFIED', 'CLOSED']
            )
    
    # Search across fields
    search = django_filters.CharFilter(
        method='filter_search',
        label='Search All'
    )
    
    def filter_search(self, queryset, name, value):
        """Search in multiple fields"""
        return queryset.filter(
            Q(reference__icontains=value) |
            Q(title__icontains=value) |
            Q(description__icontains=value) |
            Q(root_cause__icontains=value) |
            Q(incident__reference__icontains=value)
        )
    
    class Meta:
        model = CAPA
        fields = {
            'status': ['exact'],
            'action_type': ['exact'],
            'priority': ['exact'],
            'incident': ['exact'],
            'responsible_person': ['exact'],
        }