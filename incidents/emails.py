from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags

def send_html_email(subject, template_name, context, recipient_list, from_email=None):
    """
    Send HTML email using template
    
    Args:
        subject: Email subject
        template_name: Path to HTML template (e.g., 'emails/incident_created.html')
        context: Dictionary of template variables
        recipient_list: List of recipient email addresses
        from_email: Sender email (optional, uses DEFAULT_FROM_EMAIL if not provided)
    
    Returns:
        Number of emails sent
    """
    if from_email is None:
        from_email = settings.DEFAULT_FROM_EMAIL
    
    # Render HTML content
    html_content = render_to_string(template_name, context)
    
    # Create plain text version (strip HTML tags)
    text_content = strip_tags(html_content)
    
    # Create email message
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,  # Plain text fallback
        from_email=from_email,
        to=recipient_list
    )
    
    # Attach HTML version
    email.attach_alternative(html_content, "text/html")
    
    # Send email
    return email.send()

def send_incident_created_email(incident):
    """Send email when incident is created"""
    context = {
        'incident': incident,
        'recipient_name': incident.reporter.get_full_name() or incident.reporter.username,
        'subject': f'Incident {incident.reference} Created'
    }
    
    return send_html_email(
        subject=f'Incident {incident.reference} Created',
        template_name='emails/incident_created.html',
        context=context,
        recipient_list=[incident.reporter.email]
    )

def send_incident_assigned_email(incident):
    """Send email when incident is assigned"""
    if not incident.assigned_to:
        return 0
    
    context = {
        'incident': incident,
        'recipient_name': incident.assigned_to.get_full_name() or incident.assigned_to.username,
        'subject': f'Incident {incident.reference} Assigned to You'
    }
    
    return send_html_email(
        subject=f'Incident {incident.reference} Assigned to You',
        template_name='emails/incident_assigned.html',
        context=context,
        recipient_list=[incident.assigned_to.email]
    )

def send_incident_validated_email(incident, validated_by):
    """Send email when incident is validated"""
    context = {
        'incident': incident,
        'recipient_name': incident.reporter.get_full_name() or incident.reporter.username,
        'validated_by': validated_by.get_full_name() or validated_by.username,
        'subject': f'Incident {incident.reference} Validated'
    }
    
    return send_html_email(
        subject=f'Incident {incident.reference} Validated',
        template_name='emails/incident_validated.html',
        context=context,
        recipient_list=[incident.reporter.email]
    )

def send_daily_report_email(recipient_list, stats, recent_incidents):
    """Send daily incident report"""
    from django.utils import timezone
    
    context = {
        'recipient_name': 'Team',
        'report_date': timezone.now().strftime('%B %d, %Y'),
        'stats': stats,
        'recent_incidents': recent_incidents,
        'subject': 'Daily Incident Report'
    }
    
    return send_html_email(
        subject=f'Daily Incident Report - {timezone.now().strftime("%Y-%m-%d")}',
        template_name='emails/daily_report.html',
        context=context,
        recipient_list=recipient_list
    )