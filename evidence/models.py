# evidence/models.py

import os
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.conf import settings

def validate_file_extension(value):
    """
    Validate that uploaded file has an allowed extension
    
    Args:
        value: The uploaded file
        
    Raises:
        ValidationError: If extension is not allowed
    """
    ext = os.path.splitext(value.name)[1].lower()  # Get extension (e.g., '.jpg')
    
    if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
        raise ValidationError(
            f'File extension "{ext}" is not allowed. '
            f'Allowed extensions: {", ".join(settings.ALLOWED_UPLOAD_EXTENSIONS)}'
        )

def validate_file_size(value):
    """
    Validate that uploaded file is not too large
    
    Args:
        value: The uploaded file
        
    Raises:
        ValidationError: If file is too large
    """
    filesize = value.size  # Size in bytes
    
    if filesize > settings.MAX_UPLOAD_SIZE:
        max_size_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
        current_size_mb = filesize / (1024 * 1024)
        raise ValidationError(
            f'File size {current_size_mb:.2f}MB exceeds maximum allowed size of {max_size_mb}MB'
        )

def evidence_upload_path(instance, filename):
    """
    Generate upload path for evidence files
    
    Organizes files by:
    - Content type (incident, capa, etc.)
    - Year
    - Month
    - Filename
    
    Args:
        instance: The Evidence instance
        filename: Original filename
        
    Returns:
        str: Path where file should be saved
    """
    from datetime import datetime
    
    # Get content type name (e.g., 'incident', 'capa')
    content_type = instance.content_type.model
    
    # Get current date
    now = datetime.now()
    year = now.year
    month = now.month
    
    # Build path: evidence/{content_type}/{year}/{month}/{filename}
    return f'evidence/{content_type}/{year}/{month:02d}/{filename}'
    
    # Why organize this way?
    # - Easy to find files by type
    # - Easy to backup/archive by date
    # - Prevents too many files in one directory
    # - Cleaner file system structure

class Evidence(models.Model):
    """
    Evidence Model - File attachments for incidents, CAPAs, etc.
    
    Can attach files to ANY model using GenericForeignKey:
    - Photos of incident scenes
    - Documents related to CAPAs
    - Reports, certificates, etc.
    
    Supports images, documents, videos, archives
    """
    
    # ============================================
    # FILE TYPE CHOICES
    # ============================================
    TYPE_PHOTO = 'PHOTO'
    TYPE_DOCUMENT = 'DOCUMENT'
    TYPE_VIDEO = 'VIDEO'
    TYPE_AUDIO = 'AUDIO'
    TYPE_OTHER = 'OTHER'
    
    FILE_TYPE_CHOICES = [
        (TYPE_PHOTO, 'Photo/Image'),
        (TYPE_DOCUMENT, 'Document'),
        (TYPE_VIDEO, 'Video'),
        (TYPE_AUDIO, 'Audio'),
        (TYPE_OTHER, 'Other'),
    ]
    
    # ============================================
    # GENERIC RELATIONSHIP (can attach to any model)
    # ============================================
    
    # Step 1: ForeignKey to ContentType (which model?)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        help_text="Type of object this evidence is attached to"
    )
    # ContentType stores: app_label + model name
    
    # Step 2: ID of the specific object
    object_id = models.PositiveIntegerField(
        help_text="ID of the object this evidence is attached to"
    )
    
    # Step 3: GenericForeignKey combines the above
    content_object = GenericForeignKey('content_type', 'object_id')
    # This is NOT a real database field
    # It's a Python descriptor that:
    # 1. Uses content_type to find the model
    # 2. Uses object_id to find the instance
    # 3. Returns the actual object
    
    # Usage:
    # evidence.content_object = incident  # Attach to incident
    # evidence.content_object = capa      # Attach to CAPA
    # print(evidence.content_object)      # Get the related object
    
    # ============================================
    # FILE INFORMATION
    # ============================================
    
    file = models.FileField(
        upload_to=evidence_upload_path,
        validators=[validate_file_extension, validate_file_size],
        help_text="The uploaded file"
    )
    # upload_to: Function that determines where to save file
    # validators: Check extension and size before saving
    # Actual file stored in: MEDIA_ROOT/evidence/...
    # Database stores: Path to the file (string)
    
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        help_text="Type of file"
    )
    # Categorize files for filtering/display
    
    title = models.CharField(
        max_length=200,
        blank=True,
        help_text="Optional title/description of the file"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Optional detailed description"
    )
    
    # ============================================
    # METADATA
    # ============================================
    
    uploaded_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_evidence',
        help_text="Who uploaded this file?"
    )
    # Track who uploaded for accountability
    
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When was this file uploaded?"
    )
    # Automatic timestamp
    
    file_size = models.PositiveIntegerField(
        default=0,
        help_text="File size in bytes"
    )
    # Store size for display and management
    
    # ============================================
    # META OPTIONS
    # ============================================
    
    class Meta:
        verbose_name = "Evidence"
        verbose_name_plural = "Evidence"
        ordering = ['-uploaded_at']  # Newest first
        
        indexes = [
            # Speed up queries by content_type and object_id
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['file_type']),
        ]
    
    # ============================================
    # STRING REPRESENTATION
    # ============================================
    
    def __str__(self):
        return f"{self.get_file_type_display()} - {self.filename}"
    
    # ============================================
    # PROPERTIES & METHODS
    # ============================================
    
    @property
    def filename(self):
        """
        Get just the filename (without path)
        
        Returns:
            str: Filename
        """
        return os.path.basename(self.file.name)
    
    @property
    def extension(self):
        """
        Get file extension
        
        Returns:
            str: Extension (e.g., '.jpg', '.pdf')
        """
        return os.path.splitext(self.file.name)[1].lower()
    
    @property
    def file_size_mb(self):
        """
        Get file size in megabytes
        
        Returns:
            float: Size in MB
        """
        return self.file_size / (1024 * 1024)
    
    def is_image(self):
        """
        Check if file is an image
        
        Returns:
            bool: True if image
        """
        image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']
        return self.extension in image_extensions
    
    def is_document(self):
        """
        Check if file is a document
        
        Returns:
            bool: True if document
        """
        doc_extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt']
        return self.extension in doc_extensions
    
    def is_video(self):
        """
        Check if file is a video
        
        Returns:
            bool: True if video
        """
        video_extensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv']
        return self.extension in video_extensions
    
    def save(self, *args, **kwargs):
        """
        Override save to set file_size and auto-detect file_type
        """
        if self.file:
            self.file_size = self.file.size
            
            if not self.file_type:
                if self.is_image():
                    self.file_type = self.TYPE_PHOTO
                elif self.is_document():
                    self.file_type = self.TYPE_DOCUMENT
                elif self.is_video():
                    self.file_type = self.TYPE_VIDEO
                else:
                    self.file_type = self.TYPE_OTHER
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """
        Override delete to also delete the file from disk
        """
        # Delete file from filesystem
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        
        # Delete database record
        super().delete(*args, **kwargs)