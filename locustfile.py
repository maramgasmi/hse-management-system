from locust import HttpUser, task, between
import random

class HSEUser(HttpUser):
    """
    Simulates a user using the HSE Management System
    
    This will:
    - Login to get JWT token
    - List incidents
    - View incident details
    - Create incidents
    - Run analytics
    """
    
    # Wait 1-3 seconds between tasks (simulates thinking time)
    wait_time = between(1, 3)
    
    # Store token for authenticated requests
    token = None
    refresh_token = None
    
    def on_start(self):
        """
        Called when a simulated user starts
        Login and get JWT token
        """
        # Login to get token
        response = self.client.post("/api/token/", json={
            "username": "loadtest",        
            "password": "LoadTest123!"   
        })
        
        if response.status_code == 200:
            self.token = response.json()['access']
            print("✅ User logged in successfully")
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"Response: {response.text}") 
    
    def get_headers(self):
        """Get headers with JWT token"""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    @task(10)  # Weight 10 - runs 10x more often than weight 1
    def list_incidents(self):
        """List all incidents"""
        self.client.get(
            "/api/incidents/",
            headers=self.get_headers(),
            name="List Incidents"
        )
    
    @task(5)
    def view_incident_detail(self):
        """View a specific incident"""
        # Get list first to get a valid ID
        response = self.client.get(
            "/api/incidents/",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            incidents = response.json().get('results', [])
            if incidents:
                # Pick random incident
                incident = random.choice(incidents)
                self.client.get(
                    f"/api/incidents/{incident['id']}/",
                    headers=self.get_headers(),
                    name="View Incident Detail"
                )
    
    @task(3)
    def filter_incidents(self):
        """Filter incidents by severity"""
        severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        severity = random.choice(severities)
        
        self.client.get(
            f"/api/incidents/?severity={severity}",
            headers=self.get_headers(),
            name="Filter Incidents"
        )
    
    @task(2)
    def search_incidents(self):
        """Search incidents"""
        search_terms = ['accident', 'slip', 'fall', 'warehouse', 'office']
        term = random.choice(search_terms)
        
        self.client.get(
            f"/api/incidents/?search={term}",
            headers=self.get_headers(),
            name="Search Incidents"
        )
    
    @task(1)
    def create_incident(self):
        """Create a new incident"""
        from datetime import datetime, timedelta 
        
        # Create incident in the past (not future)
        past_date = (datetime.now() - timedelta(minutes=30)).isoformat()
        
        # Logic to test injury validation
        has_injury = random.choice([True, False])
        days_lost = random.randint(1, 5) if has_injury else 0
        injuries_text = "Minor sprain during load test" if has_injury else ""
        
        data = {
            "title": f"Load test incident {random.randint(1000, 9999)}",
            "description": "This is a test incident created during load testing",
            "incident_type": random.choice(['ACCIDENT', 'NEAR_MISS', 'UNSAFE_CONDITION']),
            "severity": random.choice(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            "incident_date": past_date,  # ✅ Use past date
            "location": "Load Test Location",
            "department": random.choice(['IT', 'Operations', 'HR', 'Finance']),
            "days_lost": days_lost,
            "injuries": injuries_text,
            "property_damage": random.choice([True, False]),
            "work_hours_lost": days_lost * 8 if days_lost > 0 else 0,
            # ✅ REMOVED "status": "OPEN" - will use model default
        }
        
        self.client.post(
            "/api/incidents/",
            json=data,
            headers=self.get_headers(),
            name="Create Incident"
        )


    
    @task(2)
    def view_dashboard(self):
        """View analytics dashboard"""
        self.client.get(
            "/api/analytics/dashboard/",
            headers=self.get_headers(),
            name="Analytics Dashboard"
        )
    
    @task(1)
    def view_trends(self):
        """View incident trends"""
        days = random.choice([7, 14, 30, 60])
        self.client.get(
            f"/api/analytics/trends/?days={days}",
            headers=self.get_headers(),
            name="View Trends"
        )
    
    @task(2)
    def list_capas(self):
        """List CAPAs"""
        self.client.get(
            "/api/capas/",
            headers=self.get_headers(),
            name="List CAPAs"
        )
    
    @task(1)
    def my_incidents(self):
        """View my incidents"""
        self.client.get(
            "/api/incidents/my-incidents/",
            headers=self.get_headers(),
            name="My Incidents"
        )
    
    @task(1)
    def statistics(self):
        """View incident statistics"""
        self.client.get(
            "/api/incidents/statistics/",
            headers=self.get_headers(),
            name="Incident Statistics"
        )