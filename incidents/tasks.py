from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .emails import (
    send_incident_created_email,
    send_incident_assigned_email,
    send_incident_validated_email,
    send_daily_report_email,
)
@shared_task(bind=True, max_retries=3)
def send_incident_notification(self, incident_id, notification_type):
    """
    Send email notification for incident
    
    Args:
        incident_id: Incident ID
        notification_type: Type of notification (created, assigned, validated, etc.)
    
    This task runs in background and can retry on failure
    """
    try:
        from .models import Incident
        
        incident = Incident.objects.get(id=incident_id)
        
        # Determine recipient and subject based on type
        if notification_type == 'created':
            recipient = incident.reporter.email
            subject = f'Incident {incident.reference} Created'
            message = f'''
            Your incident has been created successfully.
            
            Reference: {incident.reference}
            Title: {incident.title}
            Severity: {incident.get_severity_display()}
            Status: {incident.get_status_display()}
            
            You can view it at: http://localhost:3000/incidents/{incident.id}
            '''
        
        elif notification_type == 'assigned':
            if not incident.assigned_to:
                return
            recipient = incident.assigned_to.email
            subject = f'Incident {incident.reference} Assigned to You'
            message = f'''
            You have been assigned to investigate incident {incident.reference}.
            
            Title: {incident.title}
            Severity: {incident.get_severity_display()}
            Location: {incident.location}
            
            Please review and take action.
            '''
        
        elif notification_type == 'validated':
            recipient = incident.reporter.email
            subject = f'Incident {incident.reference} Validated'
            message = f'''
            Your incident has been validated.
            
            Reference: {incident.reference}
            Title: {incident.title}
            
            Thank you for reporting.
            '''
        
        else:
            return
        
        # Send email 
        print(f"📧 Sending email to {recipient}")
        print(f"Subject: {subject}")
        print(f"Message: {message}")
        
        
        send_mail(
             subject=subject,
             message=message,
             from_email=settings.DEFAULT_FROM_EMAIL,
             recipient_list=[recipient],
             fail_silently=False,
         )
        
        return f"Email sent to {recipient}"
        
    except Exception as exc:
        # Retry task if it fails (max 3 times)
        print(f"❌ Task failed: {exc}")
        raise self.retry(exc=exc, countdown=60)  # Retry after 60 seconds

@shared_task
def generate_daily_incident_report():
    """
    Generate and send daily incident report
    
    This task runs automatically every day at 8 AM
    """
    from .models import Incident
    from django.contrib.auth.models import User
    
    yesterday = timezone.now() - timedelta(days=1)
    
    # Get yesterday's incidents
    incidents = Incident.objects.filter(
        created_at__date=yesterday.date()
    )
    
    # Count by severity
    high_severity = incidents.filter(severity='HIGH').count()
    critical_severity = incidents.filter(severity='CRITICAL').count()
    
    # Get overdue incidents
    two_days_ago = timezone.now() - timedelta(days=2)
    overdue = Incident.objects.filter(
        status='SUBMITTED',
        reported_date__lt=two_days_ago
    ).count()
    
    report = f'''
    Daily Incident Report - {timezone.now().strftime('%Y-%m-%d')}
    
    NEW INCIDENTS: {incidents.count()}
    - High Severity: {high_severity}
    - Critical Severity: {critical_severity}
    
    OVERDUE INCIDENTS: {overdue}
    
    Generated automatically by HSE Management System
    '''
    
    print("📊 Daily Report:")
    print(report)
    
    # Send to all superusers
    superusers = User.objects.filter(is_superuser=True)
    for user in superusers:
        print(f"📧 Sending report to {user.email}")
        # send_mail(...)
    
    return f"Report sent to {superusers.count()} administrators"

@shared_task
def check_overdue_incidents():
    """
    Check for overdue incidents and send reminders
    
    Runs every hour
    """
    from .models import Incident
    
    two_days_ago = timezone.now() - timedelta(days=2)
    seven_days_ago = timezone.now() - timedelta(days=7)
    
    # Find overdue incidents
    overdue_submitted = Incident.objects.filter(
        status='SUBMITTED',
        reported_date__lt=two_days_ago
    )
    
    overdue_investigation = Incident.objects.filter(
        status='UNDER_INVESTIGATION',
        reported_date__lt=seven_days_ago
    )
    
    print(f"⚠️ Found {overdue_submitted.count()} overdue submitted incidents")
    print(f"⚠️ Found {overdue_investigation.count()} overdue investigations")
    
    # Send reminders
    for incident in overdue_submitted:
        if incident.assigned_to:
            print(f"📧 Sending reminder for {incident.reference} to {incident.assigned_to.email}")
    
    return f"Checked {overdue_submitted.count() + overdue_investigation.count()} overdue incidents"

@shared_task
def cleanup_old_incidents():
    """
    Archive old closed incidents
    
    Runs once a month
    """
    from .models import Incident
    
    one_year_ago = timezone.now() - timedelta(days=365)
    
    old_incidents = Incident.objects.filter(
        status='CLOSED',
        updated_at__lt=one_year_ago
    )
    
    count = old_incidents.count()
    print(f"🗄️ Archiving {count} old incidents")
    
    # In real system, you'd archive to separate storage
    # For now, just log
    
    return f"Archived {count} incidents"

# incidents/tasks.py (add at the end)

@shared_task
def send_weekly_summary():
    """
    Send weekly incident summary to management
    
    Runs every Monday at 9 AM
    """
    from .models import Incident
    
    # Last 7 days
    week_ago = timezone.now() - timedelta(days=7)
    
    incidents = Incident.objects.filter(created_at__gte=week_ago)
    
    # Statistics
    total = incidents.count()
    by_severity = {
        'CRITICAL': incidents.filter(severity='CRITICAL').count(),
        'HIGH': incidents.filter(severity='HIGH').count(),
        'MEDIUM': incidents.filter(severity='MEDIUM').count(),
        'LOW': incidents.filter(severity='LOW').count(),
    }
    
    by_status = {
        'SUBMITTED': incidents.filter(status='SUBMITTED').count(),
        'UNDER_INVESTIGATION': incidents.filter(status='UNDER_INVESTIGATION').count(),
        'VALIDATED': incidents.filter(status='VALIDATED').count(),
        'CLOSED': incidents.filter(status='CLOSED').count(),
    }
    
    report = f'''
    ═══════════════════════════════════════
    WEEKLY INCIDENT SUMMARY
    {week_ago.strftime('%Y-%m-%d')} to {timezone.now().strftime('%Y-%m-%d')}
    ═══════════════════════════════════════
    
    TOTAL INCIDENTS: {total}
    
    BY SEVERITY:
    • Critical: {by_severity['CRITICAL']}
    • High: {by_severity['HIGH']}
    • Medium: {by_severity['MEDIUM']}
    • Low: {by_severity['LOW']}
    
    BY STATUS:
    • Submitted: {by_status['SUBMITTED']}
    • Under Investigation: {by_status['UNDER_INVESTIGATION']}
    • Validated: {by_status['VALIDATED']}
    • Closed: {by_status['CLOSED']}
    
    ═══════════════════════════════════════
    HSE Management System - Automated Report
    '''
    
    print("📊 WEEKLY SUMMARY:")
    print(report)
    
    return f"Weekly summary generated: {total} incidents"

@shared_task
def escalate_critical_incidents():
    """
    Check for critical incidents that need escalation
    
    Runs every 30 minutes
    """
    from .models import Incident
    
    # Critical incidents open for more than 4 hours
    four_hours_ago = timezone.now() - timedelta(hours=4)
    
    critical_unassigned = Incident.objects.filter(
        severity='CRITICAL',
        assigned_to__isnull=True,
        created_at__lt=four_hours_ago
    )
    
    critical_stale = Incident.objects.filter(
        severity='CRITICAL',
        status='SUBMITTED',
        created_at__lt=four_hours_ago
    )
    
    print(f"🚨 CRITICAL ESCALATION CHECK:")
    print(f"   Unassigned critical: {critical_unassigned.count()}")
    print(f"   Stale critical: {critical_stale.count()}")
    
    # Send escalation emails
    for incident in critical_unassigned:
        print(f"   ⚠️ Escalating {incident.reference} - UNASSIGNED")
    
    for incident in critical_stale:
        print(f"   ⚠️ Escalating {incident.reference} - STALE")
    
    return f"Escalated {critical_unassigned.count() + critical_stale.count()} incidents"

@shared_task
def calculate_safety_metrics():
    """
    Calculate monthly safety KPIs
    
    Runs on 1st of every month
    """
    from .models import Incident
    from datetime import datetime
    
    # Last month
    today = timezone.now()
    first_day_this_month = today.replace(day=1)
    last_day_last_month = first_day_this_month - timedelta(days=1)
    first_day_last_month = last_day_last_month.replace(day=1)
    
    incidents = Incident.objects.filter(
        incident_date__gte=first_day_last_month,
        incident_date__lte=last_day_last_month
    )
    
    # Calculate metrics
    total_incidents = incidents.count()
    total_injuries = incidents.exclude(injuries__isnull=True).exclude(injuries='').count()
    total_days_lost = sum(incidents.values_list('days_lost', flat=True))
    total_hours_lost = sum(incidents.values_list('work_hours_lost', flat=True))
    
    # LTIFR (Lost Time Injury Frequency Rate)
    # Assuming 200,000 work hours per month (example)
    work_hours = 200000
    ltifr = (total_injuries / work_hours) * 1000000 if work_hours > 0 else 0
    
    metrics = f'''
    ═══════════════════════════════════════
    SAFETY METRICS - {last_day_last_month.strftime('%B %Y')}
    ═══════════════════════════════════════
    
    INCIDENTS: {total_incidents}
    INJURIES: {total_injuries}
    DAYS LOST: {total_days_lost}
    HOURS LOST: {total_hours_lost}
    LTIFR: {ltifr:.2f}
    
    ═══════════════════════════════════════
    '''
    
    print("📈 SAFETY METRICS:")
    print(metrics)
    
    return f"Metrics calculated for {last_day_last_month.strftime('%B %Y')}"


@shared_task(bind=True, max_retries=3)
def send_incident_notification(self, incident_id, notification_type):
    """
    Send email notification for incident
    
    Now uses beautiful HTML templates!
    """
    try:
        from .models import Incident
        
        incident = Incident.objects.get(id=incident_id)
        
        if notification_type == 'created':
            result = send_incident_created_email(incident)
            return f"Created email sent: {result}"
        
        elif notification_type == 'assigned':
            result = send_incident_assigned_email(incident)
            return f"Assignment email sent: {result}"
        
        elif notification_type == 'validated':
            # Need validated_by user - for now use reporter
            result = send_incident_validated_email(incident, incident.reporter)
            return f"Validation email sent: {result}"
        
        return "Unknown notification type"
        
    except Exception as exc:
        print(f"❌ Email task failed: {exc}")
        raise self.retry(exc=exc, countdown=60)

@shared_task
def generate_daily_incident_report():
    """
    Generate and send daily incident report with HTML template
    """
    from .models import Incident
    from django.contrib.auth.models import User
    
    yesterday = timezone.now() - timedelta(days=1)
    
    # Get yesterday's incidents
    incidents = Incident.objects.filter(
        created_at__date=yesterday.date()
    )
    
    # Statistics
    stats = {
        'total': incidents.count(),
        'critical': incidents.filter(severity='CRITICAL').count(),
        'high': incidents.filter(severity='HIGH').count(),
        'overdue': Incident.objects.filter(
            status='SUBMITTED',
            reported_date__lt=timezone.now() - timedelta(days=2)
        ).count(),
    }
    
    # Recent incidents (last 10)
    recent_incidents = incidents.order_by('-created_at')[:10]
    
    # Send to all superusers
    superusers = User.objects.filter(is_superuser=True)
    recipient_list = [user.email for user in superusers if user.email]
    
    if recipient_list:
        result = send_daily_report_email(recipient_list, stats, recent_incidents)
        return f"Daily report sent to {len(recipient_list)} administrators"
    
    return "No recipients found"