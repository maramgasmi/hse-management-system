from rest_framework import serializers
from .models import Incident
from users.serializers import UserSerializer, UserBasicSerializer

class IncidentListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing incidents (list view)
    """
    
    reporter = UserBasicSerializer(read_only=True)
    assigned_to = UserBasicSerializer(read_only=True)
    
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    
    class Meta:
        model = Incident
        fields = [
            'id',
            'reference',
            'title',
            'incident_type',
            'incident_type_display',
            'severity',
            'severity_display',
            'status',
            'status_display',
            'incident_date',
            'location',
            'department',
            'reporter',
            'assigned_to',
            'created_at',
        ]
        read_only_fields = ['id', 'reference', 'created_at']

class IncidentDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for incident detail (single incident view)
    """
    
    reporter = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    
    class Meta:
        model = Incident
        fields = '__all__'
        read_only_fields = [
            'id',
            'reference',
            'reported_date',
            'created_at',
            'updated_at',
        ]
    
    def validate_title(self, value):
        """Validate title field"""
        if len(value) < 10:
            raise serializers.ValidationError(
                "Title must be at least 10 characters long."
            )
        return value
    
    def validate_work_hours_lost(self, value):
        """Validate work hours lost"""
        if value < 0:
            raise serializers.ValidationError(
                "Work hours lost cannot be negative."
            )
        return value
    
    def validate(self, data):
        """Object-level validation"""
        from django.utils import timezone
        
        if 'incident_date' in data:
            if data['incident_date'] > timezone.now():
                raise serializers.ValidationError({
                    'incident_date': 'Incident date cannot be in the future.'
                })
        
        if data.get('days_lost', 0) > 0 and not data.get('injuries'):
            raise serializers.ValidationError({
                'injuries': 'Please describe injuries if days were lost.'
            })
        
        return data

class IncidentCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating/updating incidents
    """
    
    class Meta:
        model = Incident
        fields = [
            'title',
            'description',
            'incident_type',
            'severity',
            'status',
            'incident_date',
            'location',
            'department',
            'reporter',
            'assigned_to',
            'injuries',
            'property_damage',
            'work_hours_lost',
            'days_lost',
        ]
    
    def validate_title(self, value):
        """Validate title"""
        if len(value) < 10:
            raise serializers.ValidationError(
                "Title must be at least 10 characters long."
            )
        return value
    
    def create(self, validated_data):
        """Create incident"""
        request = self.context.get('request')
        if request and not validated_data.get('reporter'):
            validated_data['reporter'] = request.user
        return super().create(validated_data)

class IncidentWithRelationsSerializer(serializers.ModelSerializer):
    """
    Complete incident serializer with all related data
    """
    
    from risk_assessment.serializers import RiskAssessmentSerializer
    from capas.serializers import CAPAListSerializer
    from evidence.serializers import EvidenceSerializer
    
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
        read_only_fields = [
            'id',
            'reference',
            'reported_date',
            'created_at',
            'updated_at',
        ]
    
    def get_capa_count(self, obj):
        """Get count of CAPAs"""
        return obj.capas.count()
    
    def get_evidence_count(self, obj):
        """Get count of evidence files"""
        return obj.evidence.count()