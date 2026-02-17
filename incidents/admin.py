# incidents/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import Incident

@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    """
    Django Admin configuration for Incident model
    
    Provides a powerful interface for managing incidents:
    - List view with filters and search
    - Detailed form for editing
    - Custom display methods
    - Bulk actions
    """
    
    # ============================================
    # LIST VIEW CONFIGURATION
    # ============================================
    
    list_display = [
        'reference',           # Reference number
        'title_short',         # Truncated title (custom method)
        'incident_type',       # Type badge (custom method)
        'severity_badge',      # Severity with color (custom method)
        'status_badge',        # Status with color (custom method)
        'department',          # Department
        'incident_date',       # When it happened
        'reporter',            # Who reported it
        'is_overdue_badge',    # Overdue indicator (custom method)
    ]
    
    # Why these fields?
    # - Most important info at a glance
    # - Color-coded for quick scanning
    # - Shows status and urgency
    
    # Fields that are clickable (link to detail view)
    list_display_links = ['reference', 'title_short']
    
    # Fields to filter by (right sidebar)
    list_filter = [
        'status',              # Filter by status
        'severity',            # Filter by severity
        'incident_type',       # Filter by type
        'department',          # Filter by department
        'incident_date',       # Date hierarchy
        'reporter',            # Filter by reporter
    ]
    
    # Search functionality
    search_fields = [
        'reference',           # Search by reference
        'title',              # Search in title
        'description',        # Search in description
        'location',           # Search by location
        'department',         # Search by department
    ]
    
    # Default ordering (newest first)
    ordering = ['-incident_date']
    
    # How many items per page
    list_per_page = 25
    
    # Show total count
    show_full_result_count = True
    
    # ============================================
    # DETAIL VIEW (FORM) CONFIGURATION
    # ============================================
    
    # Read-only fields (can't be edited)
    readonly_fields = [
        'reference',           # Auto-generated
        'reported_date',       # Auto-set on creation
        'created_at',          # Auto-set on creation
        'updated_at',          # Auto-updated
        'severity_color_preview',  # Custom display (color swatch)
    ]
    
    # Organize fields into sections (fieldsets)
    fieldsets = (
        # Section 1: Basic Information
        ('Basic Information', {
            'fields': (
                'reference',       # Read-only
                'title',
                'description',
            ),
            'description': 'Core incident information'
        }),
        
        # Section 2: Classification
        ('Classification', {
            'fields': (
                'incident_type',
                'severity',
                'severity_color_preview',  # Shows color swatch
                'status',
            ),
            'description': 'Categorize the incident'
        }),
        
        # Section 3: Time & Location
        ('Time & Location', {
            'fields': (
                'incident_date',
                'location',
                'department',
            ),
        }),
        
        # Section 4: People
        ('People Involved', {
            'fields': (
                'reporter',
                'assigned_to',
            ),
        }),
        
        # Section 5: Impact (collapsible)
        ('Impact Details', {
            'fields': (
                'injuries',
                'property_damage',
                'work_hours_lost',
                'days_lost',
            ),
            'classes': ('collapse',),  # Collapsed by default
            'description': 'Details about injuries and damage'
        }),
        
        # Section 6: Metadata (collapsible)
        ('Metadata', {
            'fields': (
                'reported_date',
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',),  # Collapsed by default
        }),
    )
    
    # Why fieldsets?
    # - Organizes form into logical sections
    # - Makes complex forms easier to use
    # - Can collapse less-used sections
    
    # ============================================
    # CUSTOM DISPLAY METHODS
    # ============================================
    
    @admin.display(description='Title', ordering='title')
    def title_short(self, obj):
        """
        Display truncated title (max 50 characters)
        """
        if len(obj.title) > 50:
            return f"{obj.title[:50]}..."
        return obj.title
    
    @admin.display(description='Severity')
    def severity_badge(self, obj):
        """
        Display severity with color badge
        """
        colors = {
            'LOW': '#28a745',       # Green
            'MEDIUM': '#ffc107',    # Yellow
            'HIGH': '#fd7e14',      # Orange
            'CRITICAL': '#dc3545',  # Red
        }
        color = colors.get(obj.severity, '#6c757d')
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_severity_display()
        )
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        """
        Display status with color badge
        """
        colors = {
            'DRAFT': '#6c757d',              # Gray
            'SUBMITTED': '#17a2b8',          # Cyan
            'UNDER_INVESTIGATION': '#ffc107', # Yellow
            'VALIDATED': '#28a745',          # Green
            'CLOSED': '#6c757d',             # Gray
        }
        color = colors.get(obj.status, '#6c757d')
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    
    @admin.display(description='Type')
    def incident_type_display(self, obj):
        """
        Display incident type with icon
        """
        icons = {
            'ACCIDENT': '🚨',
            'NEAR_MISS': '⚠️',
            'UNSAFE_CONDITION': '⚡',
            'ENVIRONMENTAL': '🌍',
        }
        icon = icons.get(obj.incident_type, '📋')
        return f"{icon} {obj.get_incident_type_display()}"
    
    @admin.display(description='Overdue?', boolean=True)
    def is_overdue_badge(self, obj):
        """
        Display overdue status as boolean icon
        """
        return obj.is_overdue()
    
    @admin.display(description='Severity Color')
    def severity_color_preview(self, obj):
        """
        Display color swatch for severity
        """
        color = obj.get_severity_color()
        return format_html(
            '<div style="width: 50px; height: 20px; background-color: {}; '
            'border: 1px solid #ccc; border-radius: 3px;"></div>',
            color
        )
    
    # ============================================
    # ACTIONS (Bulk Operations)
    # ============================================
    
    actions = ['mark_as_validated', 'mark_as_closed', 'assign_to_me']
    
    @admin.action(description='Mark selected as Validated')
    def mark_as_validated(self, request, queryset):
        """
        Bulk action: Mark incidents as validated
        """
        updated = queryset.update(status='VALIDATED')
        self.message_user(
            request,
            f'{updated} incident(s) marked as validated.'
        )
    
    @admin.action(description='Mark selected as Closed')
    def mark_as_closed(self, request, queryset):
        """
        Bulk action: Mark incidents as closed
        """
        updated = queryset.update(status='CLOSED')
        self.message_user(
            request,
            f'{updated} incident(s) marked as closed.'
        )
    
    @admin.action(description='Assign to me')
    def assign_to_me(self, request, queryset):
        """
        Bulk action: Assign incidents to current user
        """
        updated = queryset.update(assigned_to=request.user)
        self.message_user(
            request,
            f'{updated} incident(s) assigned to you.'
        )
    
    # ============================================
    # PERMISSIONS
    # ============================================
    
    def has_delete_permission(self, request, obj=None):
        """
        Only superusers can delete incidents
        """
        return request.user.is_superuser
    
    # ============================================
    # SAVE HOOKS
    # ============================================
    
    def save_model(self, request, obj, form, change):
        """
        Called when saving an incident through admin
        
        If creating new incident and no reporter set, use current user
        """
        if not change and not obj.reporter_id:  # New incident
            obj.reporter = request.user
        super().save_model(request, obj, form, change)