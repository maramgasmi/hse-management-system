from django.contrib import admin
from django.utils.html import format_html
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Admin interface for Notifications
    """
    
    list_display = [
        'read_indicator',
        'title_short',
        'notification_type',
        'recipient',
        'created_at',
        'email_sent',
    ]
    
    list_filter = [
        'is_read',
        'notification_type',
        'email_sent',
        'created_at',
    ]
    
    search_fields = [
        'title',
        'message',
        'recipient__username',
        'recipient__email',
    ]
    
    readonly_fields = [
        'created_at',
        'read_at',
        'email_sent_at',
    ]
    
    fieldsets = (
        ('Recipient', {
            'fields': (
                'recipient',
                'notification_type',
            ),
        }),
        ('Content', {
            'fields': (
                'title',
                'message',
                'link',
            ),
        }),
        ('Status', {
            'fields': (
                'is_read',
                'read_at',
                'email_sent',
                'email_sent_at',
            ),
        }),
        ('Metadata', {
            'fields': (
                'created_at',
            ),
            'classes': ('collapse',),
        }),
    )
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    @admin.display(description='', boolean=True)
    def read_indicator(self, obj):
        """Show read/unread status"""
        return obj.is_read
    
    @admin.display(description='Title', ordering='title')
    def title_short(self, obj):
        """Truncated title"""
        if len(obj.title) > 50:
            return f"{obj.title[:50]}..."
        return obj.title
    
    @admin.action(description='Mark as Read')
    def mark_as_read(self, request, queryset):
        """Bulk mark as read"""
        count = 0
        for notification in queryset:
            if notification.mark_as_read():
                count += 1
        self.message_user(request, f'{count} notification(s) marked as read.')
    
    @admin.action(description='Mark as Unread')
    def mark_as_unread(self, request, queryset):
        """Bulk mark as unread"""
        count = 0
        for notification in queryset:
            if notification.mark_as_unread():
                count += 1
        self.message_user(request, f'{count} notification(s) marked as unread.')