from rest_framework import serializers
from .models import Notification
from users.serializers import UserBasicSerializer

class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification
    """
    
    recipient = UserBasicSerializer(read_only=True)

    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True
    )
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'notification_type',
            'notification_type_display',
            'title',
            'message',
            'link',
            'is_read',
            'read_at',
            'email_sent',
            'email_sent_at',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'recipient',
            'created_at',
            'read_at',
            'email_sent_at',
        ]
    
    def update(self, instance, validated_data):
        """
        Custom update to handle marking as read/unread
        """
        if validated_data.get('is_read') and not instance.is_read:
            from django.utils import timezone
            validated_data['read_at'] = timezone.now()
        
        if 'is_read' in validated_data and not validated_data['is_read']:
            validated_data['read_at'] = None
        
        return super().update(instance, validated_data)