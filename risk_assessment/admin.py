from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import RiskAssessment

@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    """
    Admin interface for Risk Assessment
    """
    
    list_display = [
        'incident',
        'probability',
        'impact',
        'risk_level',
        'risk_category_badge',
        'assessed_by',
        'assessed_date',
    ]
    
    list_filter = [
        'risk_category',
        'probability',
        'impact',
        'assessed_date',
    ]
    
    search_fields = [
        'incident__reference',
        'incident__title',
        'existing_controls',
        'recommended_controls',
    ]
    
    readonly_fields = [
        'risk_level',
        'risk_category',
        'assessed_date',
        'updated_at',
        'risk_matrix_display',
    ]
    
    fieldsets = (
        ('Incident', {
            'fields': ('incident',),
        }),
        ('Assessment', {
            'fields': (
                'probability',
                'impact',
                'risk_level',
                'risk_category',
                'risk_matrix_display',
            ),
        }),
        ('Controls', {
            'fields': (
                'existing_controls',
                'recommended_controls',
                'assessment_notes',
            ),
        }),
        ('Metadata', {
            'fields': (
                'assessed_by',
                'assessed_date',
                'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )
    
    @admin.display(description='Risk Category')
    def risk_category_badge(self, obj):
        """Display risk category with color"""
        color = obj.get_risk_color()
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_risk_display()
        )
    
    @admin.display(description='Risk Matrix')
    def risk_matrix_display(self, obj):
        """Display visual risk matrix"""
        # Only show matrix if object exists (not on add page)
        if not obj.pk:
            return "Save to see risk matrix"
        
        matrix_html = '<table style="border-collapse: collapse;">'
        
        for impact in range(5, 0, -1):
            matrix_html += '<tr>'
            for prob in range(1, 6):
                risk = impact * prob
                if impact == obj.impact and prob == obj.probability:
                    # Current position - highlight
                    matrix_html += f'<td style="border: 2px solid black; padding: 10px; background-color: yellow; font-weight: bold;">{risk}</td>'
                else:
                    # Other cells
                    if risk <= 5:
                        color = '#28a745'
                    elif risk <= 10:
                        color = '#ffc107'
                    elif risk <= 15:
                        color = '#fd7e14'
                    elif risk <= 20:
                        color = '#dc3545'
                    else:
                        color = '#6f0000'
                    matrix_html += f'<td style="border: 1px solid #ccc; padding: 10px; background-color: {color}; color: white;">{risk}</td>'
            matrix_html += '</tr>'
        
        matrix_html += '</table>'
        return mark_safe(matrix_html)