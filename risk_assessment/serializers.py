from rest_framework import serializers
from .models import RiskAssessment
from users.serializers import UserBasicSerializer
from drf_spectacular.utils import extend_schema_field
class RiskAssessmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Risk Assessment
    """
    
    @extend_schema_field(serializers.CharField()) 
    def get_risk_display(self, obj):
        return obj.risk_display()

    @extend_schema_field(serializers.CharField()) 
    def get_risk_color(self, obj):
        return obj.risk_color()
        
    @extend_schema_field(serializers.BooleanField()) 
    def get_requires_management_review(self, obj):
        return obj.get_requires_management_review()
    
    assessed_by = UserBasicSerializer(read_only=True)
    
    risk_display = serializers.SerializerMethodField()
    risk_color = serializers.SerializerMethodField()
    requires_management_review = serializers.SerializerMethodField()
    
    class Meta:
        model = RiskAssessment
        fields = [
            'incident',
            'probability',
            'impact',
            'risk_level',
            'risk_category',
            'risk_display',
            'risk_color',
            'existing_controls',
            'recommended_controls',
            'assessment_notes',
            'assessed_by',
            'assessed_date',
            'updated_at',
            'requires_management_review',
        ]
        read_only_fields = [
            'risk_level',
            'risk_category',
            'assessed_date',
            'updated_at',
        ]
    
     
    def validate_probability(self, value):
        """Validate probability is between 1 and 5"""
        if not 1 <= value <= 5:
            raise serializers.ValidationError(
                "Probability must be between 1 and 5."
            )
        return value
    
    def validate_impact(self, value):
        """Validate impact is between 1 and 5"""
        if not 1 <= value <= 5:
            raise serializers.ValidationError(
                "Impact must be between 1 and 5."
            )
        return value