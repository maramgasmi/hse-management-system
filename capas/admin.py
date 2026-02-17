# capas/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import CAPA

@admin.register(CAPA)
class CAPAAdmin(admin.ModelAdmin):
    """
    Admin interface for CAPA
    """
    
    list_display = [
        'reference',
        'title_short',
        'incident',
        'action_type',
        'priority_badge',
        'status_badge',
        'responsible_person',
        'due_date',
        'is_overdue_indicator',
    ]
    
    list_filter = [
        'status',
        'action_type',
        'priority',
        'due_date',
        'responsible_person',
    ]
    
    search_fields = [
        'reference',
        'title',
        'description',
        'incident__reference',
        'incident__title',
    ]
    
    readonly_fields = [
        'reference',
        'created_at',
        'updated_at',
        'days_remaining',
    ]
    
    fieldsets = (
        ('Incident Link', {
            'fields': ('incident',),
        }),
        ('Action Details', {
            'fields': (
                'reference',
                'action_type',
                'title',
                'description',
                'root_cause',
            ),
        }),
        ('Responsibility', {
            'fields': (
                'responsible_person',
                'priority',
                'due_date',
                'days_remaining',
            ),
        }),
        ('Status', {
            'fields': (
                'status',
                'completion_date',
                'verification_date',
                'verification_notes',
            ),
        }),
        ('Metadata', {
            'fields': (
                'created_by',
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )
    
    actions = ['mark_completed', 'mark_verified']
    
    @admin.display(description='Title', ordering='title')
    def title_short(self, obj):
        """Truncated title"""
        if len(obj.title) > 40:
            return f"{obj.title[:40]}..."
        return obj.title
    
    @admin.display(description='Priority')
    def priority_badge(self, obj):
        """Display priority with color"""
        color = obj.get_priority_color()
        labels = {1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical'}
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px;">{}</span>',
            color,
            labels.get(obj.priority)
        )
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        """Display status with color"""
        colors = {
            'OPEN': '#6c757d',
            'IN_PROGRESS': '#17a2b8',
            'COMPLETED': '#ffc107',
            'VERIFIED': '#28a745',
            'CLOSED': '#6c757d',
            'CANCELLED': '#dc3545',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    
    @admin.display(description='Overdue?', boolean=True)
    def is_overdue_indicator(self, obj):
        """Show if CAPA is overdue"""
        return obj.is_overdue()
    
    @admin.display(description='Days Remaining')
    def days_remaining(self, obj):
        """Show days until due"""
        # Check if object exists and has a due date
        if not obj.pk or not obj.due_date:
            return "Not set"
        
        days = obj.days_until_due()
        if days < 0:
            return format_html(
                '<span style="color: red; font-weight: bold;">{} days overdue</span>',
                abs(days)
            )
        elif days == 0:
            return format_html('<span style="color: orange;">Due today</span>')
        else:
            return f"{days} days"
    
    @admin.action(description='Mark as Completed')
    def mark_completed(self, request, queryset):
        """Bulk complete CAPAs"""
        count = 0
        for capa in queryset:
            if capa.complete(request.user):
                count += 1
        self.message_user(request, f'{count} CAPA(s) marked as completed.')
    
    @admin.action(description='Mark as Verified')
    def mark_verified(self, request, queryset):
        """Bulk verify CAPAs"""
        count = 0
        for capa in queryset:
            if capa.verify(request.user):
                count += 1
        self.message_user(request, f'{count} CAPA(s) marked as verified.')
    
    def save_model(self, request, obj, form, change):
        """Set created_by on creation"""
        if not change:  # New CAPA
            obj.created_by = request.user
        super().save_model(request, obj, form, change)