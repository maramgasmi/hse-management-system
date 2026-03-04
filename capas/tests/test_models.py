import pytest
from django.utils import timezone
from datetime import timedelta
from capas.models import CAPA
from incidents.models import Incident

pytestmark = pytest.mark.unit

@pytest.mark.django_db
class TestCAPAModel:
    """Test suite for CAPA model"""
    
    @pytest.fixture
    def incident(self, user):
        """Create a test incident for CAPA tests"""
        return Incident.objects.create(
            title='Test incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
    
    def test_capa_creation(self, incident, user):
        """Test creating a basic CAPA"""
        capa = CAPA.objects.create(
            incident=incident,
            action_type='CORRECTIVE',
            title='Fix the issue',
            description='Test description',
            due_date=timezone.now().date() + timedelta(days=30),
            priority=3,
            created_by=user
        )
        
        assert capa.id is not None
        assert capa.reference is not None
        assert capa.reference.startswith('CAPA-')
        assert capa.status == 'OPEN'  # Default
    
    def test_capa_is_overdue(self, incident, user):
        """Test is_overdue() method"""
        # Overdue CAPA (due yesterday, still OPEN)
        overdue_capa = CAPA.objects.create(
            incident=incident,
            action_type='CORRECTIVE',
            title='Overdue CAPA',
            due_date=timezone.now().date() - timedelta(days=1),
            priority=3,
            status='OPEN',
            created_by=user
        )
        
        # Not overdue CAPA (due tomorrow)
        not_overdue_capa = CAPA.objects.create(
            incident=incident,
            action_type='CORRECTIVE',
            title='On-time CAPA',
            due_date=timezone.now().date() + timedelta(days=1),
            priority=3,
            status='OPEN',
            created_by=user
        )
        
        # Completed CAPA (never overdue even if past due date)
        completed_capa = CAPA.objects.create(
            incident=incident,
            action_type='CORRECTIVE',
            title='Completed CAPA',
            due_date=timezone.now().date() - timedelta(days=10),
            priority=3,
            status='COMPLETED',
            created_by=user
        )
        
        assert overdue_capa.is_overdue() is True
        assert not_overdue_capa.is_overdue() is False
        assert completed_capa.is_overdue() is False
    
    def test_days_until_due(self, incident, user):
        """Test days_until_due() calculation"""
        capa = CAPA.objects.create(
            incident=incident,
            action_type='CORRECTIVE',
            title='Test CAPA',
            due_date=timezone.now().date() + timedelta(days=5),
            priority=3,
            created_by=user
        )
        
        days = capa.days_until_due()
        assert days == 5
        
        # Overdue CAPA should return negative
        overdue_capa = CAPA.objects.create(
            incident=incident,
            action_type='CORRECTIVE',
            title='Overdue',
            due_date=timezone.now().date() - timedelta(days=2),
            priority=3,
            created_by=user
        )
        
        assert overdue_capa.days_until_due() == -2
    
    def test_complete_method(self, incident, user):
        """Test complete() method workflow"""
        capa = CAPA.objects.create(
            incident=incident,
            action_type='CORRECTIVE',
            title='To be completed',
            due_date=timezone.now().date() + timedelta(days=30),
            priority=3,
            status='OPEN',
            created_by=user
        )
        
        # Complete it
        result = capa.complete(user)
        
        assert result is True
        assert capa.status == 'COMPLETED'
        assert capa.completion_date is not None
        
        # Try completing again (should fail)
        result2 = capa.complete(user)
        assert result2 is False
    
    def test_verify_method(self, incident, user, staff_user):
        """Test verify() method workflow"""
        capa = CAPA.objects.create(
            incident=incident,
            action_type='CORRECTIVE',
            title='To be verified',
            due_date=timezone.now().date() + timedelta(days=30),
            priority=3,
            status='COMPLETED',
            completion_date=timezone.now().date(),
            created_by=user
        )
        
        # Verify it
        notes = "Verified successfully"
        result = capa.verify(staff_user, notes)
        
        assert result is True
        assert capa.status == 'VERIFIED'
        assert capa.verification_date is not None
        assert capa.verification_notes == notes
    
    def test_get_priority_color(self, incident, user):
        """Test priority color mapping"""
        low = CAPA.objects.create(
            incident=incident,
            action_type='CORRECTIVE',
            title='Low priority',
            priority=1,
            due_date=timezone.now().date() + timedelta(days=30),
            created_by=user
        )
        
        critical = CAPA.objects.create(
            incident=incident,
            action_type='CORRECTIVE',
            title='Critical priority',
            priority=4,
            due_date=timezone.now().date() + timedelta(days=30),
            created_by=user
        )
        
        assert low.get_priority_color() == '#28a745'
        assert critical.get_priority_color() == '#dc3545'