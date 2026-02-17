from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from incidents.models import Incident
from datetime import datetime
from django.contrib.contenttypes.fields import GenericRelation

class CAPA(models.Model):
    """
    CAPA Model - Corrective and Preventive Actions
    
    Tracks actions taken to:
    - Correct the immediate problem (Corrective)
    - Prevent recurrence (Preventive)
    
    Each action has:
    - Reference number (CAPA-YYYY-NNNNN)
    - Due date
    - Responsible person
    - Status tracking
    """
    
    # ============================================
    # TYPE CHOICES
    # ============================================
    TYPE_CORRECTIVE = 'CORRECTIVE'
    TYPE_PREVENTIVE = 'PREVENTIVE'
    
    TYPE_CHOICES = [
        (TYPE_CORRECTIVE, 'Corrective Action - Fix the problem'),
        (TYPE_PREVENTIVE, 'Preventive Action - Prevent recurrence'),
    ]
    
    # ============================================
    # STATUS CHOICES
    # ============================================
    STATUS_OPEN = 'OPEN'
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_VERIFIED = 'VERIFIED'
    STATUS_CLOSED = 'CLOSED'
    STATUS_CANCELLED = 'CANCELLED'
    
    STATUS_CHOICES = [
        (STATUS_OPEN, 'Open - Not started'),
        (STATUS_IN_PROGRESS, 'In Progress - Being worked on'),
        (STATUS_COMPLETED, 'Completed - Awaiting verification'),
        (STATUS_VERIFIED, 'Verified - Effectiveness confirmed'),
        (STATUS_CLOSED, 'Closed - Fully complete'),
        (STATUS_CANCELLED, 'Cancelled - No longer needed'),
    ]
    
    # ============================================
    # RELATIONSHIP TO INCIDENT (ForeignKey)
    # ============================================
    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name='capas',
        help_text="The incident this action addresses"
    )
    # ForeignKey: Many CAPAs can belong to one Incident
    # on_delete=CASCADE: Delete CAPAs when incident deleted
    # related_name: Access via incident.capas.all()
    
    # ============================================
    # IDENTIFICATION
    # ============================================
    reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        blank=True,
        help_text="Auto-generated reference (CAPA-YYYY-NNNNN)"
    )
    
    
    action_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        help_text="Corrective or Preventive?"
    )
    
    # ============================================
    # ACTION DETAILS
    # ============================================
    title = models.CharField(
        max_length=200,
        help_text="Brief description of the action"
    )
    
    
    description = models.TextField(
        help_text="Detailed description of what needs to be done"
    )
    
    root_cause = models.TextField(
        blank=True,
        help_text="What caused the problem? (For preventive actions)"
    )
    # Why did the incident happen?
    # Example: "Floor became slippery when wet due to smooth surface"
    
    # ============================================
    # RESPONSIBILITY & TIMING
    # ============================================
    responsible_person = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_capas',
        help_text="Who is responsible for this action?"
    )
    # Person accountable for completing the action
    
    due_date = models.DateField(
        help_text="When should this be completed?"
    )
    # Deadline for completion
    
    priority = models.IntegerField(
        choices=[
            (1, 'Low'),
            (2, 'Medium'),
            (3, 'High'),
            (4, 'Critical'),
        ],
        default=2,
        help_text="Priority level"
    )
    # How urgent is this action?
    
    # ============================================
    # STATUS TRACKING
    # ============================================
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_OPEN,
        help_text="Current status"
    )
    
    completion_date = models.DateField(
        null=True,
        blank=True,
        help_text="When was this actually completed?"
    )
    
    verification_date = models.DateField(
        null=True,
        blank=True,
        help_text="When was effectiveness verified?"
    )
    
    
    verification_notes = models.TextField(
        blank=True,
        help_text="Notes from verification/effectiveness check"
    )
    # Did the action solve the problem?
    
    # ============================================
    # METADATA
    # ============================================
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_capas',
        help_text="Who created this action?"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # ============================================
    # META OPTIONS
    # ============================================
    class Meta:
        verbose_name = "CAPA"
        verbose_name_plural = "CAPAs"
        ordering = ['-created_at']
        
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['priority']),
        ]
    
    # ============================================
    # STRING REPRESENTATION
    # ============================================
    def __str__(self):
        return f"{self.reference} - {self.title}"
    
    # ============================================
    # SAVE METHOD (Auto-generate reference)
    # ============================================
    def save(self, *args, **kwargs):
        if not self.reference:
            current_year = datetime.now().year
            
            # Find last CAPA of this year
            last_capa = CAPA.objects.filter(
                reference__startswith=f'CAPA-{current_year}'
            ).order_by('reference').last()
            
            if last_capa:
                last_number = int(last_capa.reference.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1
            
            self.reference = f'CAPA-{current_year}-{new_number:05d}'
        
        super().save(*args, **kwargs)
    
    # ============================================
    # CUSTOM METHODS
    # ============================================
    def is_overdue(self):
        """
        Check if CAPA is overdue
        
        Overdue if:
        - Not completed or closed
        - Due date has passed
        """
        if self.status in [self.STATUS_COMPLETED, self.STATUS_VERIFIED, self.STATUS_CLOSED]:
            return False
        
        return self.due_date < timezone.now().date()
    
    def days_until_due(self):
        """
        Calculate days until due date
        
        Returns:
            int: Positive if future, negative if overdue
        """
        delta = self.due_date - timezone.now().date()
        return delta.days
    
    def complete(self, user):
        """
        Mark CAPA as completed
        
        Args:
            user: User completing the action
        
        Returns:
            bool: True if completed, False if not allowed
        """
        if self.status == self.STATUS_OPEN or self.status == self.STATUS_IN_PROGRESS:
            self.status = self.STATUS_COMPLETED
            self.completion_date = timezone.now().date()
            self.save()
            return True
        return False
    
    def verify(self, user, notes=''):
        """
        Verify CAPA effectiveness
        
        Args:
            user: User verifying the action
            notes: Verification notes
        
        Returns:
            bool: True if verified, False if not allowed
        """
        if self.status == self.STATUS_COMPLETED:
            self.status = self.STATUS_VERIFIED
            self.verification_date = timezone.now().date()
            self.verification_notes = notes
            self.save()
            return True
        return False
    
    def get_priority_color(self):
        colors = {
            1: '#28a745',    # Green
            2: '#ffc107',    # Yellow
            3: '#fd7e14',    # Orange
            4: '#dc3545',    # Red
        }
        return colors.get(self.priority, '#6c757d')
    # ============================================
    # GENERIC RELATIONS
    # ============================================
    
    evidence = GenericRelation(
        'evidence.Evidence',
        related_query_name='capa'
    )
    # Access evidence: capa.evidence.all()