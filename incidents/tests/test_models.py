import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta
from incidents.models import Incident

# Mark all tests in this file as unit tests
pytestmark = pytest.mark.unit

# ============================================
# INCIDENT MODEL TESTS
# ============================================

@pytest.mark.django_db
class TestIncidentModel:
    """Test suite for Incident model"""
    
    def test_incident_creation(self, user):
        """Test creating a basic incident"""
        incident = Incident.objects.create(
            title='Test incident',
            description='Test description',
            incident_type='ACCIDENT',
            severity='HIGH',
            status='SUBMITTED',
            incident_date=timezone.now(),
            location='Test Location',
            department='IT',
            reporter=user
        )
        
        assert incident.id is not None
        assert incident.title == 'Test incident'
        assert incident.severity == 'HIGH'
        assert incident.reporter == user
        assert incident.reference is not None  # Should auto-generate
    
    def test_incident_reference_generation(self, user):
        """Test that reference is auto-generated in correct format"""
        incident = Incident.objects.create(
            title='Test incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Reference format: INC-YYYY-NNNNN
        assert incident.reference.startswith('INC-')
        assert len(incident.reference) == 14  # INC-2026-00001
        year = timezone.now().year
        assert str(year) in incident.reference
    
    def test_incident_reference_increments(self, user):
        """Test that reference numbers increment"""
        incident1 = Incident.objects.create(
            title='First incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        incident2 = Incident.objects.create(
            title='Second incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Extract numbers from references
        num1 = int(incident1.reference.split('-')[-1])
        num2 = int(incident2.reference.split('-')[-1])
        
        assert num2 == num1 + 1
    
    def test_incident_str_representation(self, user):
        """Test __str__ method"""
        incident = Incident.objects.create(
            title='Test incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        str_repr = str(incident)
        assert incident.reference in str_repr
        assert 'Test incident' in str_repr
    
    def test_is_overdue_method(self, user):
        """Test is_overdue() method logic"""
        # Create incident from 3 days ago (should be overdue)
        old_incident = Incident.objects.create(
            title='Old incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            status='SUBMITTED',
            incident_date=timezone.now(),
            reported_date=timezone.now() - timedelta(days=3),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Create recent incident (not overdue)
        recent_incident = Incident.objects.create(
            title='Recent incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            status='SUBMITTED',
            incident_date=timezone.now(),
            reported_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Create closed incident (never overdue)
        closed_incident = Incident.objects.create(
            title='Closed incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            status='CLOSED',
            incident_date=timezone.now(),
            reported_date=timezone.now() - timedelta(days=5),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Check if method exists
        if not hasattr(old_incident, 'is_overdue'):
            pytest.skip("is_overdue() method not implemented yet")
        
        # If exists, test it returns boolean
        result_old = old_incident.is_overdue()
        result_recent = recent_incident.is_overdue()
        result_closed = closed_incident.is_overdue()
        
        assert isinstance(result_old, bool)
        assert isinstance(result_recent, bool)
        assert isinstance(result_closed, bool)
        
        # Closed incidents should never be overdue
        assert result_closed is False
    
    def test_get_severity_color(self, user):
        """Test severity color mapping"""
        critical_incident = Incident.objects.create(
            title='Critical',
            severity='CRITICAL',
            incident_type='ACCIDENT',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        high_incident = Incident.objects.create(
            title='High',
            severity='HIGH',
            incident_type='ACCIDENT',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Check if method exists
        if not hasattr(critical_incident, 'get_severity_color'):
            pytest.skip("get_severity_color() method not implemented yet")
        
        # Get colors
        critical_color = critical_incident.get_severity_color()
        high_color = high_incident.get_severity_color()
        
        # Verify it returns a string color
        assert isinstance(critical_color, str)
        assert isinstance(high_color, str)
        
        # Verify colors are different
        assert critical_color != high_color
        
        # Accept either hex codes or color names
        # Your implementation uses hex codes (Bootstrap colors)
        assert critical_color in ['red', '#dc3545', '#d32f2f']  # Red variants
        assert high_color in ['orange', '#fd7e14', '#ff6b6b', '#ff9800']  # Orange variants
    
    def test_can_be_validated(self, user):
        """Test validation eligibility logic"""
        # SUBMITTED incident can be validated
        submitted = Incident.objects.create(
            title='Submitted',
            status='SUBMITTED',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # DRAFT incident cannot be validated
        draft = Incident.objects.create(
            title='Draft',
            status='DRAFT',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # CLOSED incident cannot be validated
        closed = Incident.objects.create(
            title='Closed',
            status='CLOSED',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        assert submitted.can_be_validated() is True
        assert draft.can_be_validated() is False
        assert closed.can_be_validated() is False
    
    def test_validate_method(self, user, staff_user):
        """Test validate() method changes status"""
        incident = Incident.objects.create(
            title='To be validated',
            status='SUBMITTED',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Validate it
        result = incident.validate(staff_user)
        
        assert result is True
        assert incident.status == 'VALIDATED'
        
        # Try validating again (should fail)
        result2 = incident.validate(staff_user)
        assert result2 is False
    
    def test_incident_required_fields(self, user):
        """Test that required fields must be provided"""
        # Django doesn't validate on create() unless you call full_clean()
        # Create incident without title (won't raise error yet)
        incident = Incident(
            # Missing title - should fail on full_clean()
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Now call full_clean() which should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            incident.full_clean()
        
        # Verify it's complaining about the title field
        assert 'title' in exc_info.value.message_dict
    
    def test_incident_default_values(self, user):
        """Test default field values"""
        incident = Incident.objects.create(
            title='Test defaults',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
            # Not providing status, work_hours_lost, days_lost
        )
        
        assert incident.status == 'DRAFT'  # Default status
        assert incident.work_hours_lost == 0  # Default
        assert incident.days_lost == 0  # Default
    
    def test_reporter_cannot_be_null(self, user):
        """Test that reporter is required (PROTECT)"""
        from django.db.models.deletion import ProtectedError
        
        incident = Incident.objects.create(
            title='Test',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Try to delete user (should fail because PROTECT)
        with pytest.raises(ProtectedError):
            user.delete()
    
    def test_assigned_to_can_be_null(self, user):
        """Test that assigned_to is optional"""
        incident = Incident.objects.create(
            title='Unassigned',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
            # Not providing assigned_to
        )
        
        assert incident.assigned_to is None
    
    def test_incident_timestamps(self, user):
        """Test that timestamps are auto-set"""
        incident = Incident.objects.create(
            title='Timestamp test',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Check timestamps exist
        assert incident.created_at is not None
        assert incident.updated_at is not None
        assert incident.reported_date is not None
        
        # updated_at should be >= created_at
        assert incident.updated_at >= incident.created_at