from django.db import models
from django.utils import timezone
from datetime import timedelta

class SafetyMetric(models.Model):
    """
    Store calculated safety metrics for each period
    
    Allows historical tracking and trend analysis
    """
    
    # Time period
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Work hours (for rate calculations)
    total_work_hours = models.PositiveIntegerField(
        default=0,
        help_text="Total work hours for this period"
    )
    
    # Incident counts
    total_incidents = models.PositiveIntegerField(default=0)
    lost_time_injuries = models.PositiveIntegerField(default=0)
    near_misses = models.PositiveIntegerField(default=0)
    
    # Severity metrics
    total_days_lost = models.PositiveIntegerField(default=0)
    total_hours_lost = models.PositiveIntegerField(default=0)
    
    # Calculated rates
    ltifr = models.FloatField(
        default=0.0,
        help_text="Lost Time Injury Frequency Rate"
    )
    trir = models.FloatField(
        default=0.0,
        help_text="Total Recordable Incident Rate"
    )
    severity_rate = models.FloatField(
        default=0.0,
        help_text="Average days lost per incident"
    )
    
    # Metadata
    calculated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-period_end']
        unique_together = ['period_start', 'period_end']
        indexes = [
            models.Index(fields=['-period_end']),
            models.Index(fields=['period_start', 'period_end']),
        ]
    
    def __str__(self):
        return f"Metrics {self.period_start} to {self.period_end}"
    
    def calculate_metrics(self):
        """Calculate all safety metrics"""
        if self.total_work_hours > 0:
            # LTIFR = (Lost Time Injuries × 1,000,000) / Total Hours
            self.ltifr = (self.lost_time_injuries * 1000000) / self.total_work_hours
            
            # TRIR = (Total Incidents × 200,000) / Total Hours
            self.trir = (self.total_incidents * 200000) / self.total_work_hours
        else:
            self.ltifr = 0.0
            self.trir = 0.0
        
        # Severity Rate = Total Days Lost / Number of Incidents
        if self.total_incidents > 0:
            self.severity_rate = self.total_days_lost / self.total_incidents
        else:
            self.severity_rate = 0.0
        
        self.save()

class DepartmentMetric(models.Model):
    """
    Store safety metrics per department
    """
    
    department = models.CharField(max_length=100)
    period_start = models.DateField()
    period_end = models.DateField()
    
    total_incidents = models.PositiveIntegerField(default=0)
    critical_incidents = models.PositiveIntegerField(default=0)
    high_severity = models.PositiveIntegerField(default=0)
    
    days_lost = models.PositiveIntegerField(default=0)
    
    calculated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-total_incidents']
        unique_together = ['department', 'period_start', 'period_end']
        indexes = [
            models.Index(fields=['department', '-period_end']),
        ]
    
    def __str__(self):
        return f"{self.department} - {self.period_start} to {self.period_end}"