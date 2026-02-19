from rest_framework import serializers
from .models import Evidence
from users.serializers import UserBasicSerializer

class EvidenceSerializer(serializers.ModelSerializer):
    """
    Serializer for Evidence
    """
    
    uploaded_by = UserBasicSerializer(read_only=True)
    
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    
    filename = serializers.CharField(read_only=True)
    extension = serializers.CharField(read_only=True)
    file_size_mb = serializers.FloatField(read_only=True)
    
    is_image = serializers.SerializerMethodField()
    is_document = serializers.SerializerMethodField()
    is_video = serializers.SerializerMethodField()
    
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Evidence
        fields = [
            'id',
            'content_type',
            'object_id',
            'file',
            'file_url',
            'file_type',
            'file_type_display',
            'title',
            'description',
            'uploaded_by',
            'uploaded_at',
            'file_size',
            'file_size_mb',
            'filename',
            'extension',
            'is_image',
            'is_document',
            'is_video',
        ]
        read_only_fields = [
            'id',
            'uploaded_by',
            'uploaded_at',
            'file_size',
        ]
    
    def get_file_url(self, obj):
        """Get full URL for file"""
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_is_image(self, obj):
        """Check if file is image"""
        return obj.is_image()
    
    def get_is_document(self, obj):
        """Check if file is document"""
        return obj.is_document()
    
    def get_is_video(self, obj):
        """Check if file is video"""
        return obj.is_video()
    
    def create(self, validated_data):
        """Set uploaded_by to current user"""
        request = self.context.get('request')
        if request:
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)