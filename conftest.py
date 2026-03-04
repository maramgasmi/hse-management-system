import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta

# ============================================
# PYTEST FIXTURES
# Fixtures are reusable test data/setup
# ============================================

@pytest.fixture
def api_client():
    """
    Provides a DRF API client for testing endpoints
    
    Usage:
        def test_something(api_client):
            response = api_client.get('/api/incidents/')
    """
    return APIClient()

@pytest.fixture
def user(db):
    """
    Creates a basic test user
    
    Usage:
        def test_with_user(user):
            assert user.username == 'testuser'
    """
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )

@pytest.fixture
def staff_user(db):
    """
    Creates a staff user (HSE Officer)
    """
    return User.objects.create_user(
        username='staff',
        email='staff@example.com',
        password='staffpass123',
        is_staff=True
    )

@pytest.fixture
def admin_user(db):
    """
    Creates an admin user (Superuser)
    """
    return User.objects.create_user(
        username='admin',
        email='admin@example.com',
        password='adminpass123',
        is_staff=True,
        is_superuser=True
    )

@pytest.fixture
def authenticated_client(api_client, user):
    """
    Provides an authenticated API client
    
    Usage:
        def test_with_auth(authenticated_client):
            response = authenticated_client.get('/api/incidents/')
            # User is already logged in!
    """
    api_client.force_authenticate(user=user)
    return api_client

@pytest.fixture
def staff_client(api_client, staff_user):
    """
    Provides a staff-authenticated API client
    """
    api_client.force_authenticate(user=staff_user)
    return api_client

@pytest.fixture
def admin_client(api_client, admin_user):
    """
    Provides an admin-authenticated API client
    """
    api_client.force_authenticate(user=admin_user)
    return api_client

@pytest.fixture
def incident_data():
    """
    Provides valid incident creation data
    
    Usage:
        def test_create_incident(authenticated_client, incident_data):
            response = authenticated_client.post('/api/incidents/', incident_data)
    """
    return {
        'title': 'Test incident for automated testing',
        'description': 'This is a test incident created by pytest',
        'incident_type': 'ACCIDENT',
        'severity': 'HIGH',
        'status': 'SUBMITTED',
        'incident_date': timezone.now().isoformat(),
        'location': 'Test Location',
        'department': 'IT',
        'work_hours_lost': 8,
        'days_lost': 1,
    }

@pytest.fixture
def capa_data():
    """
    Provides valid CAPA creation data
    """
    return {
        'action_type': 'CORRECTIVE',
        'title': 'Test corrective action from pytest',
        'description': 'Automated test CAPA',
        'root_cause': 'Testing framework',
        'due_date': (timezone.now() + timedelta(days=30)).date().isoformat(),
        'priority': 3,
    }

# ============================================
# PYTEST MARKERS (for filtering tests)
# ============================================

# Run only unit tests: pytest -m unit
# Run only integration tests: pytest -m integration
# Skip slow tests: pytest -m "not slow"