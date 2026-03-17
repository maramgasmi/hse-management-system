from rest_framework import serializers
from django.utils import timezone

from .models import Incident
from users.serializers import UserSerializer, UserBasicSerializer
from capas.serializers import CAPAListSerializer
from evidence.serializers import EvidenceSerializer
from risk_assessment.serializers import RiskAssessmentSerializer

# ==========================================
# BASE VALIDATION (The "Clean" Inheritance)
# ==========================================
class IncidentBaseValidationSerializer(serializers.ModelSerializer):
    """
    Base serializer containing shared validation logic.
    Other serializers inherit from this to avoid repeating code.
    """
    def validate_title(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters long.")
        return value

    def validate_work_hours_lost(self, value):
        if value < 0:
            raise serializers.ValidationError("Work hours lost cannot be negative.")
        return value

    def validate_incident_date(self, value):
        if value > timezone.now():
            raise serializers.ValidationError("Incident date cannot be in the future.")
        return value

    def validate(self, data):
        # .get() prevents KeyErrors during partial PATCH requests
        days_lost = data.get('days_lost', 0)
        injuries = data.get('injuries')
        
        if days_lost > 0 and not injuries:
            raise serializers.ValidationError({
                'injuries': 'Please describe injuries if days were lost.'
            })
        return data


# ==========================================
# API SERIALIZERS
# ==========================================

class IncidentListSerializer(serializers.ModelSerializer):
    """Serializer for listing incidents (lightweight)"""
    reporter = UserBasicSerializer(read_only=True)
    assigned_to = UserBasicSerializer(read_only=True)
    
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    
    class Meta:
        model = Incident
        fields = [
            'id', 'reference', 'title', 'incident_type', 'incident_type_display',
            'severity', 'severity_display', 'status', 'status_display',
            'incident_date', 'location', 'department', 'reporter', 
            'assigned_to', 'created_at',
        ]
        read_only_fields = ['id', 'reference', 'created_at']


class IncidentDetailSerializer(IncidentBaseValidationSerializer):
    """Serializer for single incident view. Inherits base validation."""
    reporter = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    
    class Meta:
        model = Incident
        fields = '__all__'
        read_only_fields = ['id', 'reference', 'reported_date', 'created_at', 'updated_at']


# incidents/serializers.py
# ... (keep all existing code until IncidentCreateUpdateSerializer)

class IncidentCreateUpdateSerializer(IncidentBaseValidationSerializer):
    """Serializer for creating/updating. Inherits base validation."""
    class Meta:
        model = Incident
        fields = [
            'title', 
            'description', 
            'incident_type', 
            'severity',
            'incident_date',
            'location', 
            'department', 
            'assigned_to', 
            'injuries', 
            'property_damage', 
            'work_hours_lost', 
            'days_lost',
        ]
        # ✅ REMOVED 'status' from read_only_fields
        # Status will use model's default value
    
    def create(self, validated_data):
        """Create with reporter from request context"""
        request = self.context.get('request')
        if request and not validated_data.get('reporter'):
            validated_data['reporter'] = request.user
        
        # ✅ Set default status if not provided
        if 'status' not in validated_data:
            validated_data['status'] = 'DRAFT'
        
        return super().create(validated_data)




class IncidentWithRelationsSerializer(serializers.ModelSerializer):
    """Complete serializer with nested relations."""
    reporter = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    
    risk_assessment = RiskAssessmentSerializer(read_only=True)
    capas = CAPAListSerializer(many=True, read_only=True)
    evidence = EvidenceSerializer(many=True, read_only=True)
    
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    
    capa_count = serializers.SerializerMethodField()
    evidence_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Incident
        fields = '__all__'
        read_only_fields = ['id', 'reference', 'reported_date', 'created_at', 'updated_at']
    
    def get_capa_count(self, obj):
        # Safe check to prevent 500 crashes
        return obj.capas.count() if hasattr(obj, 'capas') else 0
    
    def get_evidence_count(self, obj):
        # Safe check to prevent 500 crashes
        return obj.evidence.count() if hasattr(obj, 'evidence') else 0