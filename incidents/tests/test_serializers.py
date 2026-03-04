import pytest
from django.utils import timezone
from incidents.serializers import (
    IncidentDetailSerializer,
    IncidentCreateUpdateSerializer,
)
from incidents.models import Incident

pytestmark = pytest.mark.unit

@pytest.mark.django_db
class TestIncidentSerializers:
    """Test suite for Incident serializers"""
    
    def test_incident_detail_serializer_read(self, user):
        """Test serializing an incident to JSON"""
        incident = Incident.objects.create(
            title='Test incident for serialization',
            description='Test description',
            incident_type='ACCIDENT',
            severity='HIGH',
            status='SUBMITTED',
            incident_date=timezone.now(),
            location='Test Location',
            department='IT',
            reporter=user
        )
        
        serializer = IncidentDetailSerializer(incident)
        data = serializer.data
        
        assert data['id'] == incident.id
        assert data['title'] == 'Test incident for serialization'
        assert data['severity'] == 'HIGH'
        assert 'reporter' in data
        assert data['reporter']['id'] == user.id
    
    def test_incident_create_serializer_write(self, user):
        """Test deserializing JSON to create incident"""
        data = {
            'title': 'New incident from serializer test',
            'description': 'Created via serializer',
            'incident_type': 'ACCIDENT',
            'severity': 'MEDIUM',
            'incident_date': timezone.now().isoformat(),
            'location': 'Test Location',
            'department': 'IT',
        }
        
        serializer = IncidentCreateUpdateSerializer(data=data)
        
        assert serializer.is_valid(), serializer.errors
        
        # Save (creates in database)
        incident = serializer.save(reporter=user)
        
        assert incident.id is not None
        assert incident.title == 'New incident from serializer test'
        assert incident.severity == 'MEDIUM'
    
    def test_validation_title_too_short(self):
        """Test that title validation catches short titles"""
        data = {
            'title': 'Short',  # Less than 10 chars
            'incident_type': 'ACCIDENT',
            'severity': 'HIGH',
            'incident_date': timezone.now().isoformat(),
            'location': 'Test',
            'department': 'Test',
        }
        
        serializer = IncidentCreateUpdateSerializer(data=data)
        
        # Should be invalid
        assert not serializer.is_valid()
        assert 'title' in serializer.errors
    
    def test_validation_future_date(self):
        """Test that future incident dates are rejected"""
        from datetime import timedelta
        
        future_date = timezone.now() + timedelta(days=10)
        
        data = {
            'title': 'Future incident test',
            'description': 'A required description',
            'incident_type': 'ACCIDENT',
            'severity': 'HIGH',
            'incident_date': future_date.isoformat(),
            'location': 'Test',
            'department': 'Test',
        }
        
        serializer = IncidentCreateUpdateSerializer(data=data)
        
        # Should be invalid
        assert not serializer.is_valid()
        assert 'incident_date' in serializer.errors or 'non_field_errors' in serializer.errors
    
    def test_serializer_display_fields(self, user):
        """Test that display fields are included"""
        incident = Incident.objects.create(
            title='Display fields test',
            incident_type='ACCIDENT',
            severity='HIGH',
            status='SUBMITTED',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        serializer = IncidentDetailSerializer(incident)
        data = serializer.data
       
        # Should include display versions
        assert 'severity_display' in data
        assert data['severity_display'] == 'High - Significant injury, extended time lost'
        assert 'status_display' in data
        assert data['status_display'] in ['Submitted', 'SUBMITTED']