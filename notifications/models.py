from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Notification(models.Model):
    """
    Notification Model - System notifications for users
    
    Sends notifications when:
    - Incident is created/assigned
    - CAPA is assigned/overdue
    - Risk assessment needs review
    - etc.
    
    Can be:
    - In-app notifications (shown in UI)
    - Email notifications (sent via email)
    - Both
    """
    
    # ============================================
    # NOTIFICATION TYPE CHOICES
    # ============================================
    TYPE_INCIDENT_CREATED = 'INCIDENT_CREATED'
    TYPE_INCIDENT_ASSIGNED = 'INCIDENT_ASSIGNED'
    TYPE_INCIDENT_VALIDATED = 'INCIDENT_VALIDATED'
    TYPE_INCIDENT_CLOSED = 'INCIDENT_CLOSED'
    
    TYPE_CAPA_CREATED = 'CAPA_CREATED'
    TYPE_CAPA_ASSIGNED = 'CAPA_ASSIGNED'
    TYPE_CAPA_DUE_SOON = 'CAPA_DUE_SOON'
    TYPE_CAPA_OVERDUE = 'CAPA_OVERDUE'
    TYPE_CAPA_COMPLETED = 'CAPA_COMPLETED'
    
    TYPE_RISK_HIGH = 'RISK_HIGH'
    TYPE_RISK_CRITICAL = 'RISK_CRITICAL'
    
    TYPE_SYSTEM = 'SYSTEM'
    
    NOTIFICATION_TYPE_CHOICES = [
        # Incident notifications
        (TYPE_INCIDENT_CREATED, 'Incident Created'),
        (TYPE_INCIDENT_ASSIGNED, 'Incident Assigned to You'),
        (TYPE_INCIDENT_VALIDATED, 'Incident Validated'),
        (TYPE_INCIDENT_CLOSED, 'Incident Closed'),
        
        # CAPA notifications
        (TYPE_CAPA_CREATED, 'CAPA Created'),
        (TYPE_CAPA_ASSIGNED, 'CAPA Assigned to You'),
        (TYPE_CAPA_DUE_SOON, 'CAPA Due Soon'),
        (TYPE_CAPA_OVERDUE, 'CAPA Overdue'),
        (TYPE_CAPA_COMPLETED, 'CAPA Completed'),
        
        # Risk notifications
        (TYPE_RISK_HIGH, 'High Risk Identified'),
        (TYPE_RISK_CRITICAL, 'Critical Risk Identified'),
        
        # System notifications
        (TYPE_SYSTEM, 'System Notification'),
    ]
    
    # ============================================
    # NOTIFICATION DATA
    # ============================================
    
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="Who receives this notification?"
    )
    # The user who will see this notification
    
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
        help_text="Type of notification"
    )
    # What kind of notification is this?
    
    title = models.CharField(
        max_length=200,
        help_text="Notification title"
    )
    # Example: "New Incident Assigned to You"
    
    message = models.TextField(
        help_text="Notification message"
    )
    # Example: "Incident INC-2026-00001 has been assigned to you for investigation."
    
    link = models.CharField(
        max_length=500,
        blank=True,
        help_text="Link to related object (e.g., /incidents/1/)"
    )
    # Where should clicking the notification take the user?
    # Example: "/admin/incidents/incident/1/change/"
    
    # ============================================
    # STATUS TRACKING
    # ============================================
    
    is_read = models.BooleanField(
        default=False,
        help_text="Has the user read this notification?"
    )
    # False = unread (show badge)
    # True = read (don't show badge)
    
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When was this notification read?"
    )
    # Timestamp when user marked as read
    
    email_sent = models.BooleanField(
        default=False,
        help_text="Was an email sent for this notification?"
    )
    # Track if we sent an email
    
    email_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When was the email sent?"
    )
    # Timestamp when email was sent
    
    # ============================================
    # METADATA
    # ============================================
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When was this notification created?"
    )
    # When the notification was generated
    
    # ============================================
    # META OPTIONS
    # ============================================
    
    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']  # Newest first
        
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', 'created_at']),
            models.Index(fields=['notification_type']),
        ]
    
    # ============================================
    # STRING REPRESENTATION
    # ============================================
    
    def __str__(self):
        status = "✓" if self.is_read else "●"
        return f"{status} {self.title} - {self.recipient.username}"
    
    # ============================================
    # METHODS
    # ============================================
    
    def mark_as_read(self):
        """
        Mark notification as read
        
        Returns:
            bool: True if marked as read, False if already read
        """
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
            return True
        return False
    
    def mark_as_unread(self):
        """
        Mark notification as unread
        
        Returns:
            bool: True if marked as unread, False if already unread
        """
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.save()
            return True
        return False
    
    @classmethod
    def create_notification(cls, recipient, notification_type, title, message, link=''):
        """
        Create a new notification
        
        Args:
            recipient: User to notify
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            link: Optional link to related object
            
        Returns:
            Notification: Created notification
        """
        return cls.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link
        )
    
    @classmethod
    def notify_incident_assigned(cls, incident, assigned_to):
        """
        Create notification when incident is assigned
        
        Args:
            incident: The incident
            assigned_to: User assigned to
            
        Returns:
            Notification: Created notification
        """
        return cls.create_notification(
            recipient=assigned_to,
            notification_type=cls.TYPE_INCIDENT_ASSIGNED,
            title=f"Incident {incident.reference} Assigned to You",
            message=f"You have been assigned to investigate incident: {incident.title}",
            link=f"/admin/incidents/incident/{incident.id}/change/"
        )
    
    @classmethod
    def notify_capa_assigned(cls, capa, assigned_to):
        """
        Create notification when CAPA is assigned
        
        Args:
            capa: The CAPA
            assigned_to: User assigned to
            
        Returns:
            Notification: Created notification
        """
        return cls.create_notification(
            recipient=assigned_to,
            notification_type=cls.TYPE_CAPA_ASSIGNED,
            title=f"CAPA {capa.reference} Assigned to You",
            message=f"You are responsible for: {capa.title}. Due: {capa.due_date}",
            link=f"/admin/capas/capa/{capa.id}/change/"
        )
    
    @classmethod
    def notify_capa_overdue(cls, capa):
        """
        Create notification when CAPA is overdue
        
        Args:
            capa: The overdue CAPA
            
        Returns:
            Notification: Created notification (if responsible person exists)
        """
        if capa.responsible_person:
            return cls.create_notification(
                recipient=capa.responsible_person,
                notification_type=cls.TYPE_CAPA_OVERDUE,
                title=f"CAPA {capa.reference} is Overdue!",
                message=f"Action overdue: {capa.title}. Was due: {capa.due_date}",
                link=f"/admin/capas/capa/{capa.id}/change/"
            )
        return None