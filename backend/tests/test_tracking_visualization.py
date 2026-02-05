"""
Test suite for Tracking Visualization Features
- Fleet Portal Job Detail Dialog Tracking Tab
- Admin Booking View Dialog Tracking Tab with Live Map
- PDF Tracking Report with Route Map and Key Location Points
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "Aircabio@2024!"


class TestTrackingVisualization:
    """Test tracking visualization features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        print(f"Logged in as admin")
    
    def test_get_bookings_with_tracking(self):
        """Test getting bookings - should include tracking fields"""
        response = self.session.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 200, f"Failed to get bookings: {response.text}"
        
        bookings = response.json()
        print(f"Found {len(bookings)} bookings")
        
        # Find a booking with tracking
        tracking_booking = None
        for booking in bookings:
            if booking.get("tracking_token") or booking.get("tracking_id"):
                tracking_booking = booking
                break
        
        if tracking_booking:
            print(f"Found booking with tracking: {tracking_booking.get('booking_ref')}")
            assert "tracking_token" in tracking_booking or "tracking_id" in tracking_booking
            print(f"  - Tracking ID: {tracking_booking.get('tracking_id')}")
            print(f"  - Tracking Token: {tracking_booking.get('tracking_token')}")
            print(f"  - Tracking Status: {tracking_booking.get('tracking_status')}")
            print(f"  - Last Location: {tracking_booking.get('last_location')}")
        else:
            print("No bookings with tracking found - this is OK for new installations")
    
    def test_get_tracking_data_for_booking(self):
        """Test getting tracking data for a specific booking"""
        # First get bookings to find one with tracking
        response = self.session.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 200
        
        bookings = response.json()
        tracking_booking = None
        for booking in bookings:
            if booking.get("tracking_token"):
                tracking_booking = booking
                break
        
        if not tracking_booking:
            pytest.skip("No booking with tracking found")
        
        booking_id = tracking_booking["id"]
        
        # Get tracking data
        response = self.session.get(f"{BASE_URL}/api/tracking/booking/{booking_id}")
        
        # May return 404 if no tracking session exists
        if response.status_code == 404:
            print(f"No tracking session for booking {booking_id}")
            return
        
        assert response.status_code == 200, f"Failed to get tracking data: {response.text}"
        
        data = response.json()
        print(f"Tracking data for booking {booking_id}:")
        print(f"  - Session: {data.get('session', {})}")
        print(f"  - Total locations: {data.get('total_locations', 0)}")
        print(f"  - Latest location: {data.get('latest_location')}")
    
    def test_tracking_session_by_token(self):
        """Test getting tracking session by token"""
        # First get bookings to find one with tracking token
        response = self.session.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 200
        
        bookings = response.json()
        tracking_booking = None
        for booking in bookings:
            if booking.get("tracking_token"):
                tracking_booking = booking
                break
        
        if not tracking_booking:
            pytest.skip("No booking with tracking token found")
        
        token = tracking_booking["tracking_token"]
        
        # Get tracking session by token (public endpoint)
        response = requests.get(f"{BASE_URL}/api/tracking/session/{token}")
        assert response.status_code == 200, f"Failed to get tracking session: {response.text}"
        
        data = response.json()
        print(f"Tracking session for token {token[:8]}...:")
        print(f"  - ID: {data.get('id')}")
        print(f"  - Status: {data.get('status')}")
        print(f"  - Driver: {data.get('driver_name')}")
        print(f"  - Booking: {data.get('booking', {})}")
        print(f"  - Location count: {data.get('location_count', 0)}")
    
    def test_tracking_report_pdf_endpoint(self):
        """Test PDF tracking report endpoint - should include Route Map and Key Location Points"""
        # First get bookings to find one with tracking
        response = self.session.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 200
        
        bookings = response.json()
        tracking_booking = None
        for booking in bookings:
            if booking.get("tracking_token") or booking.get("tracking_id"):
                tracking_booking = booking
                break
        
        if not tracking_booking:
            pytest.skip("No booking with tracking found")
        
        booking_id = tracking_booking["id"]
        
        # Get PDF report
        response = self.session.get(f"{BASE_URL}/api/admin/tracking/{booking_id}/report")
        assert response.status_code == 200, f"Failed to get tracking report: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML content, got: {content_type}"
        
        # Check report content
        html_content = response.text
        
        # Verify Route Map section exists
        assert "Route Map" in html_content, "Route Map section not found in report"
        print("✓ Route Map section found")
        
        # Verify Key Location Points section exists
        assert "Key Location Points" in html_content, "Key Location Points section not found in report"
        print("✓ Key Location Points section found")
        
        # Verify Google Static Maps URLs are present
        assert "staticmap" in html_content, "Google Static Maps URLs not found in report"
        print("✓ Google Static Maps URLs found")
        
        # Verify API key is included
        assert "key=" in html_content, "Google Maps API key not found in report"
        print("✓ Google Maps API key included")
        
        # Verify markers for start and end
        assert "markers=color:green" in html_content, "Start marker not found"
        assert "markers=color:red" in html_content, "End marker not found"
        print("✓ Start and End markers found")
        
        print(f"PDF report for booking {booking_id} validated successfully")
    
    def test_fleet_tracking_endpoint(self):
        """Test fleet tracking endpoint for Job Detail Dialog"""
        # First get bookings to find one assigned to a fleet
        response = self.session.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 200
        
        bookings = response.json()
        fleet_booking = None
        for booking in bookings:
            if booking.get("assigned_fleet_id") and booking.get("tracking_token"):
                fleet_booking = booking
                break
        
        if not fleet_booking:
            pytest.skip("No fleet booking with tracking found")
        
        booking_id = fleet_booking["id"]
        
        # Get fleet tracking data
        response = self.session.get(f"{BASE_URL}/api/fleet/tracking/{booking_id}")
        
        if response.status_code == 404:
            print(f"No tracking data for fleet booking {booking_id}")
            return
        
        assert response.status_code == 200, f"Failed to get fleet tracking: {response.text}"
        
        data = response.json()
        print(f"Fleet tracking data for booking {booking_id}:")
        print(f"  - Session: {data.get('session', {})}")
        print(f"  - Latest location: {data.get('latest_location')}")
    
    def test_generate_tracking_link(self):
        """Test generating tracking link for a booking"""
        # First get bookings to find one with driver assigned but no tracking
        response = self.session.get(f"{BASE_URL}/api/bookings")
        assert response.status_code == 200
        
        bookings = response.json()
        eligible_booking = None
        for booking in bookings:
            if booking.get("assigned_driver_id") and not booking.get("tracking_token"):
                eligible_booking = booking
                break
        
        if not eligible_booking:
            # Try any booking with driver
            for booking in bookings:
                if booking.get("assigned_driver_id"):
                    eligible_booking = booking
                    break
        
        if not eligible_booking:
            pytest.skip("No booking with driver found")
        
        booking_id = eligible_booking["id"]
        
        # Generate tracking link
        response = self.session.post(f"{BASE_URL}/api/tracking/generate/{booking_id}")
        
        # May return 400 if tracking already exists
        if response.status_code == 400:
            print(f"Tracking already exists for booking {booking_id}")
            return
        
        assert response.status_code == 200, f"Failed to generate tracking: {response.text}"
        
        data = response.json()
        print(f"Generated tracking link for booking {booking_id}:")
        print(f"  - Token: {data.get('token')}")
        print(f"  - Session ID: {data.get('session_id')}")


class TestFleetPortalTracking:
    """Test Fleet Portal tracking features via impersonation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and impersonate a fleet"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        admin_token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Get fleets
        response = self.session.get(f"{BASE_URL}/api/fleets")
        assert response.status_code == 200
        
        fleets = response.json()
        active_fleet = None
        for fleet in fleets:
            if fleet.get("status") == "active":
                active_fleet = fleet
                break
        
        if not active_fleet:
            pytest.skip("No active fleet found")
        
        # Impersonate fleet
        response = self.session.post(f"{BASE_URL}/api/admin/fleets/{active_fleet['id']}/impersonate")
        assert response.status_code == 200, f"Failed to impersonate fleet: {response.text}"
        
        impersonation_data = response.json()
        fleet_token = impersonation_data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {fleet_token}"})
        
        self.fleet_id = active_fleet["id"]
        print(f"Impersonating fleet: {active_fleet['name']}")
    
    def test_fleet_jobs_with_tracking(self):
        """Test getting fleet jobs - should include tracking info"""
        response = self.session.get(f"{BASE_URL}/api/fleet/jobs")
        assert response.status_code == 200, f"Failed to get fleet jobs: {response.text}"
        
        jobs = response.json()
        print(f"Found {len(jobs)} fleet jobs")
        
        for job in jobs[:5]:
            print(f"  - {job.get('booking_ref')}: {job.get('status')} | Driver: {job.get('assigned_driver_name')} | Tracking: {job.get('tracking_token', 'None')}")
    
    def test_fleet_tracking_for_job(self):
        """Test getting tracking data for a fleet job"""
        response = self.session.get(f"{BASE_URL}/api/fleet/jobs")
        assert response.status_code == 200
        
        jobs = response.json()
        tracking_job = None
        for job in jobs:
            if job.get("tracking_token"):
                tracking_job = job
                break
        
        if not tracking_job:
            pytest.skip("No fleet job with tracking found")
        
        job_id = tracking_job["id"]
        
        # Get tracking data
        response = self.session.get(f"{BASE_URL}/api/fleet/tracking/{job_id}")
        
        if response.status_code == 404:
            print(f"No tracking session for job {job_id}")
            return
        
        assert response.status_code == 200, f"Failed to get fleet tracking: {response.text}"
        
        data = response.json()
        print(f"Fleet tracking data for job {job_id}:")
        print(f"  - Session status: {data.get('session', {}).get('status')}")
        print(f"  - Latest location: {data.get('latest_location')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
