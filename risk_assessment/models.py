from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from incidents.models import Incident

class RiskAssessment(models.Model):
    """
    Risk Assessment Model - Evaluates incident risk
    
    Uses a 5×5 risk matrix:
    - Probability: 1-5 (1=Very Unlikely, 5=Almost Certain)
    - Impact: 1-5 (1=Negligible, 5=Catastrophic)
    - Risk Level: Probability × Impact (1-25)
    
    Automatically categorizes risk level based on score
    """
    # ============================================
    # PROBABILITY CHOICES (1-5)
    # ============================================
    PROBABILITY_CHOICES = [
        (1, 'Very Unlikely - Rare occurrence (< 1%)'),
        (2, 'Unlikely - Could happen (1-10%)'),
        (3, 'Possible - Might happen (10-50%)'),
        (4, 'Likely - Probably will happen (50-90%)'),
        (5, 'Almost Certain - Expected to occur (> 90%)'),
    ]
    
    # ============================================
    # IMPACT CHOICES (1-5)
    # ============================================
    IMPACT_CHOICES = [
        (1, 'Negligible - No injury, minimal damage'),
        (2, 'Minor - First aid, minor damage'),
        (3, 'Moderate - Medical treatment, significant damage'),
        (4, 'Major - Hospitalization, extensive damage'),
        (5, 'Catastrophic - Fatality, disaster'),
    ]
    
    # ============================================
    # RELATIONSHIP TO INCIDENT (OneToOne)
    # ============================================
    incident = models.OneToOneField(
        Incident,
        on_delete=models.CASCADE,
        related_name='risk_assessment',
        primary_key=True,
        help_text="The incident being assessed"
    )
    # OneToOneField: Each incident has ONE risk assessment
    # on_delete=CASCADE: Delete risk assessment when incident deleted
    # primary_key=True: Use incident_id as primary key (no separate id)
    # related_name: Access via incident.risk_assessment
    
    # ============================================
    # ASSESSMENT FIELDS
    # ============================================
    probability = models.IntegerField(
        choices=PROBABILITY_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Likelihood of recurrence (1-5)"
    )
    # How likely is this to happen again?
    # 1 = Rare, 5 = Almost certain
    
    impact = models.IntegerField(
        choices=IMPACT_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Severity of consequences (1-5)"
    )
    # How bad would it be if it happens?
    # 1 = Negligible, 5 = Catastrophic
    
    risk_level = models.IntegerField(
        editable=False,
        help_text="Calculated: Probability × Impact (1-25)"
    )
    # Automatically calculated: probability × impact
    # editable=False: Can't be manually changed
    # Range: 1 (lowest) to 25 (highest)
    
    risk_category = models.CharField(
        max_length=20,
        editable=False,
        help_text="Category: Very Low, Low, Medium, High, Critical"
    )
    # Automatically assigned based on risk_level
    # editable=False: Can't be manually changed
    
    # ============================================
    # ADDITIONAL ASSESSMENT DATA
    # ============================================
    existing_controls = models.TextField(
        blank=True,
        help_text="What controls are currently in place?"
    )
    # What are we already doing to prevent this?
    # Example: "Safety signs posted, training provided"
    
    recommended_controls = models.TextField(
        blank=True,
        help_text="What additional controls are recommended?"
    )
    # What more should we do?
    # Example: "Install non-slip flooring, improve lighting"
    
    assessment_notes = models.TextField(
        blank=True,
        help_text="Additional notes or considerations"
    )
    # Any other relevant information
    
    # ============================================
    # METADATA
    # ============================================
    assessed_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='risk_assessments',
        help_text="Who performed this assessment?"
    )
    # Track who did the risk assessment
    
    assessed_date = models.DateTimeField(
        auto_now_add=True,
        help_text="When was this assessment performed?"
    )
    # When was this assessed?
    
    updated_at = models.DateTimeField(
        auto_now=True
    )
    # Last time assessment was updated
    
    # ============================================
    # META OPTIONS
    # ============================================
    class Meta:
        verbose_name = "Risk Assessment"
        verbose_name_plural = "Risk Assessments"
        ordering = ['-risk_level']  # Highest risk first
    
    # ============================================
    # STRING REPRESENTATION
    # ============================================
    def __str__(self):
        return f"Risk Assessment for {self.incident.reference} - {self.risk_category}"
    
    # ============================================
    # SAVE METHOD (Auto-calculate risk)
    # ============================================
    def save(self, *args, **kwargs):
        """
        Override save to automatically calculate risk level and category
        
        Risk Level = Probability × Impact
        
        Categories:
        - 1-5: Very Low
        - 6-10: Low
        - 11-15: Medium
        - 16-20: High
        - 21-25: Critical
        """
        # Calculate risk level
        self.risk_level = self.probability * self.impact
        
        # Determine risk category based on risk level
        if self.risk_level <= 5:
            self.risk_category = 'VERY_LOW'
        elif self.risk_level <= 10:
            self.risk_category = 'LOW'
        elif self.risk_level <= 15:
            self.risk_category = 'MEDIUM'
        elif self.risk_level <= 20:
            self.risk_category = 'HIGH'
        else:  
            self.risk_category = 'CRITICAL'
        
        # Save to database
        super().save(*args, **kwargs)
    
    # ============================================
    # CUSTOM METHODS
    # ============================================
    def get_risk_color(self):
        """
        Return color code for risk level (for UI)
        """
        colors = {
            'VERY_LOW': '#28a745',    # Green
            'LOW': '#20c997',         # Teal
            'MEDIUM': '#ffc107',      # Yellow
            'HIGH': '#fd7e14',        # Orange
            'CRITICAL': '#dc3545',    # Red
        }
        return colors.get(self.risk_category, '#6c757d')
    
    def get_risk_display(self):
        """
        Return human-readable risk category
        """
        displays = {
            'VERY_LOW': 'Very Low Risk',
            'LOW': 'Low Risk',
            'MEDIUM': 'Medium Risk',
            'HIGH': 'High Risk',
            'CRITICAL': 'Critical Risk',
        }
        return displays.get(self.risk_category, 'Unknown')
    
    def requires_management_review(self):
        """
        Check if this risk requires management review
        
        Business rule: HIGH and CRITICAL risks need management approval
        """
        return self.risk_category in ['HIGH', 'CRITICAL']
    
    def get_matrix_position(self):
        """
        Return position in risk matrix as (row, col)
        For visualization purposes
        """
        return (self.impact, self.probability)