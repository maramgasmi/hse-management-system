from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from datetime import timedelta, datetime
from incidents.models import Incident
from capas.models import CAPA

def get_date_range(period='month'):
    """
    Get start and end dates for analysis period
    
    Args:
        period: 'today', 'week', 'month', 'quarter', 'year', 'ytd'
    
    Returns:
        tuple: (start_date, end_date)
    """
    today = timezone.now()
    
    if period == 'today':
        start = today.replace(hour=0, minute=0, second=0, microsecond=0)
        end = today
    
    elif period == 'week':
        start = today - timedelta(days=7)
        end = today
    
    elif period == 'month':
        start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = today
    
    elif period == 'quarter':
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        start = today.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = today
    
    elif period == 'year':
        start = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = today
    
    elif period == 'ytd':  # Year to date
        start = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = today
    
    else:  # Default to last 30 days
        start = today - timedelta(days=30)
        end = today
    
    return start, end

def calculate_dashboard_stats(start_date=None, end_date=None):
    """
    Calculate overall dashboard statistics
    
    Returns:
        dict: Dashboard statistics
    """
    if not start_date or not end_date:
        start_date, end_date = get_date_range('month')
    
    # Get incidents in period
    incidents = Incident.objects.filter(
        incident_date__gte=start_date,
        incident_date__lte=end_date
    )
    
    # Basic counts
    total_incidents = incidents.count()
    
    # By severity
    by_severity = incidents.values('severity').annotate(
        count=Count('id')
    ).order_by('-count')
    
    severity_counts = {
        'CRITICAL': 0,
        'HIGH': 0,
        'MEDIUM': 0,
        'LOW': 0,
    }
    for item in by_severity:
        severity_counts[item['severity']] = item['count']
    
    # By status
    by_status = incidents.values('status').annotate(
        count=Count('id')
    )
    
    status_counts = {}
    for item in by_status:
        status_counts[item['status']] = item['count']
    
    # By type
    by_type = incidents.values('incident_type').annotate(
        count=Count('id')
    )
    
    type_counts = {}
    for item in by_type:
        type_counts[item['incident_type']] = item['count']
    
    # Calculate time lost
    time_lost = incidents.aggregate(
        total_days_lost=Sum('days_lost'),
        total_hours_lost=Sum('work_hours_lost')
    )
    
    # Incidents with injuries
    with_injuries = incidents.exclude(injuries__isnull=True).exclude(injuries='').count()
    
    # Overdue incidents
    two_days_ago = timezone.now() - timedelta(days=2)
    overdue = incidents.filter(
        status='SUBMITTED',
        reported_date__lt=two_days_ago
    ).count()
    
    # CAPAs
    capas = CAPA.objects.filter(
        created_at__gte=start_date,
        created_at__lte=end_date
    )
    
    total_capas = capas.count()
    overdue_capas = capas.filter(
        due_date__lt=timezone.now().date(),
        status__in=['OPEN', 'IN_PROGRESS']
    ).count()
    
    completed_capas = capas.filter(
        status__in=['COMPLETED', 'VERIFIED', 'CLOSED']
    ).count()
    
    return {
        'period': {
            'start': start_date,
            'end': end_date,
        },
        'incidents': {
            'total': total_incidents,
            'by_severity': severity_counts,
            'by_status': status_counts,
            'by_type': type_counts,
            'with_injuries': with_injuries,
            'overdue': overdue,
        },
        'time_lost': {
            'days': time_lost['total_days_lost'] or 0,
            'hours': time_lost['total_hours_lost'] or 0,
        },
        'capas': {
            'total': total_capas,
            'overdue': overdue_capas,
            'completed': completed_capas,
            'completion_rate': (completed_capas / total_capas * 100) if total_capas > 0 else 0,
        }
    }

def calculate_trends(days=30):
    """
    Calculate incident trends over time
    
    Returns:
        list: Daily incident counts and cumulative
    """
    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)
    
    # Get incidents
    incidents = Incident.objects.filter(
        incident_date__gte=start_date,
        incident_date__lte=end_date
    )
    
    # Group by date
    by_date = incidents.extra(
        select={'date': 'DATE(incident_date)'}
    ).values('date').annotate(
        count=Count('id'),
        critical=Count('id', filter=Q(severity='CRITICAL')),
        high=Count('id', filter=Q(severity='HIGH')),
    ).order_by('date')
    
    # Create daily series
    trends = []
    cumulative = 0
    
    for i in range(days + 1):
        date = (start_date + timedelta(days=i)).date()
        
        # Find count for this date
        day_data = next((item for item in by_date if str(item['date']) == str(date)), None)
        
        count = day_data['count'] if day_data else 0
        critical = day_data['critical'] if day_data else 0
        high = day_data['high'] if day_data else 0
        
        cumulative += count
        
        trends.append({
            'date': date,
            'count': count,
            'critical': critical,
            'high': high,
            'cumulative': cumulative,
        })
    
    return trends

def calculate_by_department():
    """
    Calculate incidents by department
    
    Returns:
        list: Department statistics
    """
    start_date, end_date = get_date_range('month')
    
    departments = Incident.objects.filter(
        incident_date__gte=start_date,
        incident_date__lte=end_date
    ).values('department').annotate(
        total=Count('id'),
        critical=Count('id', filter=Q(severity='CRITICAL')),
        high=Count('id', filter=Q(severity='HIGH')),
        days_lost=Sum('days_lost'),
    ).order_by('-total')
    
    return list(departments)

def calculate_by_location():
    """
    Calculate incidents by location (hotspots)
    
    Returns:
        list: Location statistics
    """
    start_date, end_date = get_date_range('month')
    
    locations = Incident.objects.filter(
        incident_date__gte=start_date,
        incident_date__lte=end_date
    ).values('location').annotate(
        total=Count('id'),
        critical=Count('id', filter=Q(severity='CRITICAL')),
    ).order_by('-total')[:10]  # Top 10 locations
    
    return list(locations)

def calculate_safety_metrics(start_date, end_date, work_hours=None):
    """
    Calculate safety KPIs
    
    Args:
        start_date: Period start
        end_date: Period end
        work_hours: Total work hours (if None, estimates based on days)
    
    Returns:
        dict: Safety metrics
    """
    incidents = Incident.objects.filter(
        incident_date__gte=start_date,
        incident_date__lte=end_date
    )
    
    total_incidents = incidents.count()
    
    # Lost time injuries (incidents with days lost)
    lost_time_injuries = incidents.filter(days_lost__gt=0).count()
    
    # Near misses
    near_misses = incidents.filter(incident_type='NEAR_MISS').count()
    
    # Time lost
    time_lost = incidents.aggregate(
        days=Sum('days_lost'),
        hours=Sum('work_hours_lost')
    )
    
    total_days_lost = time_lost['days'] or 0
    total_hours_lost = time_lost['hours'] or 0
    
    # Estimate work hours if not provided
    if not work_hours:
        # Assume 100 employees × 8 hours × days in period
        days_in_period = (end_date - start_date).days
        work_hours = 100 * 8 * days_in_period
    
    # Calculate rates
    if work_hours > 0:
        ltifr = (lost_time_injuries * 1000000) / work_hours
        trir = (total_incidents * 200000) / work_hours
    else:
        ltifr = 0.0
        trir = 0.0
    
    # Severity rate
    if total_incidents > 0:
        severity_rate = total_days_lost / total_incidents
    else:
        severity_rate = 0.0
    
    return {
        'period': {
            'start': start_date,
            'end': end_date,
        },
        'work_hours': work_hours,
        'incidents': {
            'total': total_incidents,
            'lost_time_injuries': lost_time_injuries,
            'near_misses': near_misses,
        },
        'time_lost': {
            'days': total_days_lost,
            'hours': total_hours_lost,
        },
        'rates': {
            'ltifr': round(ltifr, 2),
            'trir': round(trir, 2),
            'severity_rate': round(severity_rate, 2),
        },
        'benchmarks': {
            'ltifr': {
                'target': 1.0,
                'status': 'good' if ltifr < 1.0 else 'needs_improvement'
            },
            'trir': {
                'target': 3.0,
                'status': 'good' if trir < 3.0 else 'needs_improvement'
            }
        }
    }

def calculate_monthly_comparison():
    """
    Compare current month vs last month
    
    Returns:
        dict: Comparison data
    """
    today = timezone.now()
    
    # Current month
    current_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_month_end = today
    
    # Last month
    last_month_end = current_month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate for both periods
    current_stats = calculate_dashboard_stats(current_month_start, current_month_end)
    last_stats = calculate_dashboard_stats(last_month_start, last_month_end)
    
    # Calculate changes
    current_total = current_stats['incidents']['total']
    last_total = last_stats['incidents']['total']
    
    if last_total > 0:
        change_percent = ((current_total - last_total) / last_total) * 100
    else:
        change_percent = 100 if current_total > 0 else 0
    
    return {
        'current_month': current_stats,
        'last_month': last_stats,
        'comparison': {
            'incidents_change': current_total - last_total,
            'incidents_change_percent': round(change_percent, 1),
            'trend': 'increasing' if change_percent > 0 else 'decreasing' if change_percent < 0 else 'stable'
        }
    }