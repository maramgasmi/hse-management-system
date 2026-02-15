# incidents/models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator
from datetime import datetime

class Incident(models.Model):
    """
    Incident Model - Core model for HSE incident management
    
    Stores information about workplace incidents including:
    - Accidents (injuries, property damage)
    - Near misses (potential accidents)
    - Unsafe conditions
    - Environmental incidents
    
    Each incident gets a unique reference number (INC-YYYY-NNNNN)
    and follows a workflow: DRAFT → SUBMITTED → VALIDATED → CLOSED
    """
    
    # ============================================
    # INCIDENT TYPE CHOICES
    # ============================================
    TYPE_ACCIDENT = 'ACCIDENT'
    TYPE_NEAR_MISS = 'NEAR_MISS'
    TYPE_UNSAFE_CONDITION = 'UNSAFE_CONDITION'
    TYPE_ENVIRONMENTAL = 'ENVIRONMENTAL'
    
    INCIDENT_TYPE_CHOICES = [
        (TYPE_ACCIDENT, 'Accident'),
        (TYPE_NEAR_MISS, 'Near Miss'),
        (TYPE_UNSAFE_CONDITION, 'Unsafe Condition'),
        (TYPE_ENVIRONMENTAL, 'Environmental Incident'),
    ]
    
    # Why these types?
    # - ACCIDENT: Actual incidents with harm/damage
    # - NEAR_MISS: Could have caused harm but didn't
    # - UNSAFE_CONDITION: Hazards that could cause accidents
    # - ENVIRONMENTAL: Spills, emissions, waste issues
    
    # ============================================
    # SEVERITY CHOICES
    # ============================================
    SEVERITY_LOW = 'LOW'
    SEVERITY_MEDIUM = 'MEDIUM'
    SEVERITY_HIGH = 'HIGH'
    SEVERITY_CRITICAL = 'CRITICAL'
    
    SEVERITY_CHOICES = [
        (SEVERITY_LOW, 'Low - Minor injury, no time lost'),
        (SEVERITY_MEDIUM, 'Medium - Medical treatment, limited time lost'),
        (SEVERITY_HIGH, 'High - Significant injury, extended time lost'),
        (SEVERITY_CRITICAL, 'Critical - Fatality or permanent disability'),
    ]
    
    # Severity determines response urgency
    # LOW: Minor first aid
    # MEDIUM: Medical attention required
    # HIGH: Hospitalization, serious injury
    # CRITICAL: Life-threatening, fatality
    
    # ============================================
    # STATUS CHOICES (Workflow)
    # ============================================
    STATUS_DRAFT = 'DRAFT'
    STATUS_SUBMITTED = 'SUBMITTED'
    STATUS_UNDER_INVESTIGATION = 'UNDER_INVESTIGATION'
    STATUS_VALIDATED = 'VALIDATED'
    STATUS_CLOSED = 'CLOSED'
    
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_UNDER_INVESTIGATION, 'Under Investigation'),
        (STATUS_VALIDATED, 'Validated'),
        (STATUS_CLOSED, 'Closed'),
    ]
    
    # Workflow:
    # DRAFT → Reporter is still writing
    # SUBMITTED → Reported and awaiting review
    # UNDER_INVESTIGATION → Being investigated
    # VALIDATED → Investigation complete, actions defined
    # CLOSED → All actions completed
    
    # ============================================
    # CORE IDENTIFICATION FIELDS
    # ============================================
    
    reference = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        blank=True,
        help_text="Auto-generated reference number (INC-YYYY-NNNNN)"
    )
    # Why editable=False?
    # - Generated automatically, users shouldn't change it
    # Why blank=True?
    # - Allows creation without reference (we'll add it in save())
    # Format: INC-2026-00001, INC-2026-00002, etc.
    
    title = models.CharField(
        max_length=200,
        help_text="Brief description of the incident (max 200 characters)"
    )
    # Short, clear title for lists and reports
    # Example: "Worker slipped in warehouse"
    
    description = models.TextField(
        help_text="Detailed description of what happened"
    )
    # Full narrative of the incident
    # Who, what, when, where, how, why
    
    # ============================================
    # CLASSIFICATION FIELDS
    # ============================================
    
    incident_type = models.CharField(
        max_length=20,
        choices=INCIDENT_TYPE_CHOICES,
        help_text="Type of incident"
    )
    
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default=SEVERITY_LOW,
        help_text="Severity level of the incident"
    )
    
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        help_text="Current status in the workflow"
    )
    
    # ============================================
    # TIME & LOCATION FIELDS
    # ============================================
    
    incident_date = models.DateTimeField(
        help_text="When did the incident occur?"
    )
    # Exact date and time of the incident
    # Important for analysis and compliance
    
    location = models.CharField(
        max_length=200,
        help_text="Where did the incident occur? (e.g., 'Warehouse A, Zone 3')"
    )
    # Specific location helps identify hazard zones
    
    department = models.CharField(
        max_length=100,
        help_text="Which department? (e.g., 'Production', 'Maintenance')"
    )
    # For analysis by department
    # Identifies which areas have most incidents
    
    # ============================================
    # PEOPLE INVOLVED
    # ============================================
    
    reporter = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='reported_incidents',
        help_text="Who reported this incident?"
    )
    # PROTECT: Can't delete user if they reported incidents
    # related_name: user.reported_incidents.all()
    
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_incidents',
        help_text="Who is investigating this incident?"
    )
    # SET_NULL: If investigator is deleted, just clear assignment
    # null=True, blank=True: Optional field
    # related_name: manager.assigned_incidents.all()
    
    # ============================================
    # IMPACT FIELDS
    # ============================================
    
    injuries = models.TextField(
        blank=True,
        null=True,
        help_text="Description of any injuries sustained"
    )
    # Optional: Only for accidents with injuries
    
    property_damage = models.TextField(
        blank=True,
        null=True,
        help_text="Description of property/equipment damage"
    )
    # Optional: Only if there was damage
    
    work_hours_lost = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Total work hours lost due to incident"
    )
    # For calculating frequency rate
    # PositiveIntegerField: Can't be negative
    
    days_lost = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Total work days lost due to incident"
    )
    # For calculating severity rate (Taux de Gravité)
    # Important KPI for HSE management
    
    # ============================================
    # METADATA FIELDS (Automatically managed)
    # ============================================
    
    reported_date = models.DateTimeField(
        auto_now_add=True,
        editable=False,
        help_text="When was this incident reported?"
    )
    # auto_now_add: Set once on creation, never changes
    # editable=False: Can't be changed in admin
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        editable=False
    )
    # When the record was created in database
    
    updated_at = models.DateTimeField(
        auto_now=True,
        editable=False
    )
    # auto_now: Updates every time save() is called
    # Tracks last modification
    
    # ============================================
    # MODEL META OPTIONS
    # ============================================
    
    class Meta:
        # Plural name in admin
        verbose_name = "Incident"
        verbose_name_plural = "Incidents"
        
        # Default ordering (newest first)
        ordering = ['-incident_date']
        # The '-' means descending order
        
        # Database indexes for faster queries
        indexes = [
            models.Index(fields=['incident_date']),
            models.Index(fields=['status']),
            models.Index(fields=['severity']),
            models.Index(fields=['department']),
            models.Index(fields=['-incident_date', 'status']),
        ]
        # Why indexes?
        # - We'll frequently filter by these fields
        # - Indexes make queries much faster
        # - Trade-off: Slightly slower writes, much faster reads
        
        # Permissions (for future use)
        permissions = [
            ("can_validate_incident", "Can validate incidents"),
            ("can_assign_incident", "Can assign incidents to investigators"),
            ("can_close_incident", "Can close incidents"),
        ]
        # Custom permissions for different roles
    
    # ============================================
    # STRING REPRESENTATION
    # ============================================
    
    def __str__(self):
        """
        String representation of the incident
        Used in admin, shell, and error messages
        """
        return f"{self.reference} - {self.title}"
    
    # Example output: "INC-2026-00001 - Worker slipped in warehouse"
    
    # ============================================
    # SAVE METHOD (Auto-generate reference)
    # ============================================
    
    def save(self, *args, **kwargs):
        """
        Override save method to auto-generate reference number
        
        Format: INC-YYYY-NNNNN
        Example: INC-2026-00001
        
        Logic:
        1. Check if this is a new incident (no reference yet)
        2. Get current year
        3. Find the highest incident number for this year
        4. Increment by 1
        5. Format as INC-YYYY-NNNNN
        """
        if not self.reference:  # Only generate if reference is empty
            # Get current year
            current_year = datetime.now().year
            
            # Find the last incident of this year
            # reference__startswith: SQL LIKE 'INC-2026%'
            last_incident = Incident.objects.filter(
                reference__startswith=f'INC-{current_year}'
            ).order_by('reference').last()
            
            if last_incident:
                # Extract the number from last reference
                # Example: "INC-2026-00042" → "00042" → 42
                last_number = int(last_incident.reference.split('-')[-1])
                new_number = last_number + 1
            else:
                # First incident of the year
                new_number = 1
            
            # Format as INC-YYYY-NNNNN (5 digits, zero-padded)
            # Example: 1 → "00001", 42 → "00042", 123 → "00123"
            self.reference = f'INC-{current_year}-{new_number:05d}'
            # {new_number:05d} means:
            # - : format specifier
            # - 0: pad with zeros
            # - 5: total width of 5 characters
            # - d: decimal (integer)
        
        # Call the parent save method to actually save to database
        super().save(*args, **kwargs)
    
    # ============================================
    # CUSTOM METHODS (Business Logic)
    # ============================================
    
    def is_overdue(self):
        """
        Check if incident is overdue for action
        
        Business rule:
        - SUBMITTED incidents open > 48 hours are overdue
        - UNDER_INVESTIGATION incidents open > 7 days are overdue
        """
        if self.status == self.STATUS_CLOSED:
            return False
        
        now = timezone.now()
        days_open = (now - self.reported_date).days
        
        if self.status == self.STATUS_SUBMITTED:
            return days_open > 2  # 48 hours
        elif self.status == self.STATUS_UNDER_INVESTIGATION:
            return days_open > 7  # 7 days
        
        return False
    
    def get_severity_color(self):
        """
        Return color code for severity (for UI)
        """
        colors = {
            self.SEVERITY_LOW: '#28a745',      # Green
            self.SEVERITY_MEDIUM: '#ffc107',   # Yellow
            self.SEVERITY_HIGH: '#fd7e14',     # Orange
            self.SEVERITY_CRITICAL: '#dc3545',  # Red
        }
        return colors.get(self.severity, '#6c757d')  # Default gray
    
    def can_be_validated(self):
        """
        Check if incident can be validated
        
        Business rule: Only SUBMITTED or UNDER_INVESTIGATION can be validated
        """
        return self.status in [
            self.STATUS_SUBMITTED,
            self.STATUS_UNDER_INVESTIGATION
        ]
    
    def validate(self, user):
        """
        Validate the incident
        
        Args:
            user: The user validating the incident
        
        Returns:
            bool: True if validated, False if not allowed
        """
        if not self.can_be_validated():
            return False
        
        self.status = self.STATUS_VALIDATED
        self.assigned_to = user
        self.save()
        return True
