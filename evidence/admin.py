from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Evidence

@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    """
    Admin interface for Evidence
    """
    
    list_display = [
        'thumbnail_preview',
        'filename_display',
        'file_type',
        'content_object',
        'file_size_display',
        'uploaded_by',
        'uploaded_at',
    ]
    
    list_filter = [
        'file_type',
        'uploaded_at',
        'content_type',
    ]
    
    search_fields = [
        'title',
        'description',
    ]
    
    readonly_fields = [
        'filename',
        'extension',
        'file_size',
        'uploaded_at',
        'file_preview',
    ]
    
    fieldsets = (
        ('File', {
            'fields': (
                'file',
                'file_preview',
                'file_type',
                'title',
                'description',
            ),
        }),
        ('Attached To', {
            'fields': (
                'content_type',
                'object_id',
            ),
        }),
        ('Metadata', {
            'fields': (
                'uploaded_by',
                'uploaded_at',
                'filename',
                'extension',
                'file_size',
            ),
            'classes': ('collapse',),
        }),
    )
    
    @admin.display(description='Thumbnail')
    def thumbnail_preview(self, obj):
        """Show thumbnail for images"""
        if obj.is_image() and obj.file:
            return mark_safe(
                f'<img src="{obj.file.url}" style="max-height: 50px; max-width: 50px;" />'
            )
        return "📄"
    
    @admin.display(description='Filename', ordering='file')
    def filename_display(self, obj):
        """Display filename"""
        return obj.filename
    
    @admin.display(description='Size')
    def file_size_display(self, obj):
        """Display file size in human-readable format"""
        if obj.file_size < 1024:
            return f"{obj.file_size} B"
        elif obj.file_size < 1024 * 1024:
            return f"{obj.file_size / 1024:.1f} KB"
        else:
            return f"{obj.file_size / (1024 * 1024):.2f} MB"
    
    @admin.display(description='Preview')
    def file_preview(self, obj):
        """Show preview of file"""
        if not obj.pk or not obj.file:
            return "Save to see preview"
        
        if obj.is_image():
            return mark_safe(
                f'<img src="{obj.file.url}" style="max-width: 400px; max-height: 400px;" />'
            )
        else:
            return format_html(
                '<a href="{}" target="_blank">Download {}</a>',
                obj.file.url,
                obj.filename
            )
    
    def save_model(self, request, obj, form, change):
        """Set uploaded_by on creation"""
        if not change:  # New upload
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)