import pytest
from django.utils import timezone
from rest_framework import status
from incidents.models import Incident

pytestmark = pytest.mark.integration

@pytest.mark.django_db
class TestIncidentAPI:
    """Integration tests for Incident API endpoints"""
    
    def test_list_incidents_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list incidents"""
        response = api_client.get('/api/incidents/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_incidents_authenticated(self, authenticated_client, user):
        """Test authenticated user can list their incidents"""
        # Create test incidents
        Incident.objects.create(
            title='User incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        response = authenticated_client.get('/api/incidents/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
    
    def test_create_incident(self, authenticated_client, incident_data):
        """Test creating an incident via API"""
        response = authenticated_client.post('/api/incidents/', incident_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == incident_data['title']
        assert 'reference' in response.data
        assert response.data['reference'].startswith('INC-')
    
    def test_create_incident_invalid_data(self, authenticated_client):
        """Test creating incident with invalid data fails"""
        invalid_data = {
            'title': 'Too short',  # Less than 10 chars (if validation exists)
            'severity': 'INVALID_SEVERITY',
            # Missing required fields
        }
        
        response = authenticated_client.post('/api/incidents/', invalid_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_retrieve_incident(self, authenticated_client, user):
        """Test retrieving a single incident"""
        incident = Incident.objects.create(
            title='Test incident for retrieval',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        response = authenticated_client.get(f'/api/incidents/{incident.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == incident.id
        assert response.data['title'] == incident.title
    
    def test_update_incident(self, authenticated_client, user):
        """Test updating an incident"""
        incident = Incident.objects.create(
            title='Original title',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        update_data = {'title': 'Updated title via API test'}
        
        response = authenticated_client.patch(
            f'/api/incidents/{incident.id}/',
            update_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Updated title via API test'
        
        # Verify in database
        incident.refresh_from_db()
        assert incident.title == 'Updated title via API test'
    
    def test_delete_incident_forbidden(self, authenticated_client, user):
        """Test that regular users cannot delete incidents"""
        incident = Incident.objects.create(
            title='Test incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        response = authenticated_client.delete(f'/api/incidents/{incident.id}/')
        
        # Should be forbidden (only superuser can delete)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_delete_incident_admin(self, admin_client, user):
        """Test that admin can delete incidents"""
        incident = Incident.objects.create(
            title='Test incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        response = admin_client.delete(f'/api/incidents/{incident.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify it's deleted
        assert not Incident.objects.filter(id=incident.id).exists()
    
    def test_filter_by_severity(self, authenticated_client, user):
        """Test filtering incidents by severity"""
        # Create incidents with different severities
        Incident.objects.create(
            title='High severity',
            severity='HIGH',
            incident_type='ACCIDENT',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        Incident.objects.create(
            title='Low severity',
            severity='LOW',
            incident_type='ACCIDENT',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        # Filter for HIGH severity only
        response = authenticated_client.get('/api/incidents/?severity=HIGH')
        
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        
        # All returned incidents should be HIGH severity
        for incident in results:
            assert incident['severity'] == 'HIGH'
    
    def test_search_incidents(self, authenticated_client, user):
        """Test searching incidents"""
        Incident.objects.create(
            title='Warehouse incident involving forklift',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Warehouse',
            department='Operations',
            reporter=user
        )
        
        Incident.objects.create(
            title='Office slip and fall',
            incident_type='ACCIDENT',
            severity='LOW',
            incident_date=timezone.now(),
            location='Office',
            department='Admin',
            reporter=user
        )
        
        # Search for "warehouse"
        response = authenticated_client.get('/api/incidents/?search=warehouse')
        
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        
        # Should find the warehouse incident
        assert len(results) >= 1
        assert any('warehouse' in i['title'].lower() for i in results)
    
    def test_custom_action_my_incidents(self, authenticated_client, user):
        """Test custom action: my-incidents"""
        # Create incident for this user
        Incident.objects.create(
            title='My incident',
            incident_type='ACCIDENT',
            severity='HIGH',
            incident_date=timezone.now(),
            location='Test',
            department='Test',
            reporter=user
        )
        
        response = authenticated_client.get('/api/incidents/my-incidents/')
        
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if 'results' in response.data else response.data
        
        # All should belong to this user
        for incident in results:
            assert incident['reporter']['id'] == user.id
    
    def test_custom_action_statistics(self, authenticated_client, user):
        """Test custom action: statistics"""
        # Create some test data
        Incident.objects.create(
            title='High incident',
            severity='HIGH',
            status='SUBMITTED',
            incident_type='ACCIDENT',
            incident_date=timezone.now(),
            location='Test',
            department='Operations',
            reporter=user
        )
        
        response = authenticated_client.get('/api/incidents/statistics/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'by_status' in response.data
        assert 'by_severity' in response.data
        assert 'by_department' in response.data
    def test_create_incident(self, authenticated_client, incident_data):
        response = authenticated_client.post('/api/incidents/', incident_data)
    # This will print the exact field that is causing the 400 error
        assert response.status_code == status.HTTP_201_CREATED, response.data