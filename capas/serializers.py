# capas/serializers.py

from rest_framework import serializers
from .models import CAPA
from users.serializers import UserBasicSerializer

class CAPAListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing CAPAs
    """
    
    responsible_person = UserBasicSerializer(read_only=True)
    created_by = UserBasicSerializer(read_only=True)
    
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    is_overdue = serializers.SerializerMethodField()
    days_until_due = serializers.SerializerMethodField()
    
    class Meta:
        model = CAPA
        fields = [
            'id',
            'reference',
            'incident',
            'action_type',
            'action_type_display',
            'title',
            'status',
            'status_display',
            'priority',
            'responsible_person',
            'due_date',
            'is_overdue',
            'days_until_due',
            'created_by',
            'created_at',
        ]
        read_only_fields = ['id', 'reference', 'created_at']
    
    def get_is_overdue(self, obj):
        """Check if CAPA is overdue"""
        return obj.is_overdue()
    
    def get_days_until_due(self, obj):
        """Get days until due"""
        return obj.days_until_due()

class CAPADetailSerializer(serializers.ModelSerializer):
    """
    Serializer for CAPA detail
    """
    
    responsible_person = UserBasicSerializer(read_only=True)
    created_by = UserBasicSerializer(read_only=True)
    
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    is_overdue = serializers.SerializerMethodField()
    days_until_due = serializers.SerializerMethodField()
     
    class Meta:
        model = CAPA
        fields = '__all__'
        read_only_fields = [
            'reference',
            'created_at',
            'updated_at',
        ]
    
    def get_is_overdue(self, obj):
        """Check if CAPA is overdue"""
        return obj.is_overdue()
    
    def get_days_until_due(self, obj):
        """Get days until due"""
        return obj.days_until_due()
    
    
    
    def validate_title(self, value):
        """Validate title"""
        if len(value) < 10:
            raise serializers.ValidationError(
                "Title must be at least 10 characters long."
            )
        return value
    
    def validate(self, data):
        """Object-level validation"""
        from django.utils import timezone
        
        if 'due_date' in data:
            if data['due_date'] < timezone.now().date():
                raise serializers.ValidationError({
                    'due_date': 'Due date cannot be in the past.'
                })
        
        return data

class CAPACreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating CAPAs
    """
    
    class Meta:
        model = CAPA
        fields = [
            'incident',
            'action_type',
            'title',
            'description',
            'root_cause',
            'responsible_person',
            'due_date',
            'priority',
            'status',
            'completion_date',
            'verification_date',
            'verification_notes',
        ]
    
    def create(self, validated_data):
        """Set created_by to current user"""
        request = self.context.get('request')
        if request:
            validated_data['created_by'] = request.user
        return super().create(validated_data)