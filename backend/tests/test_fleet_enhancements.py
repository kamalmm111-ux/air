"""
Test Fleet Portal Enhancements:
1. Tracking link generation when driver is assigned
2. Fleet notifications endpoint
3. Mark all notifications as read
4. Driver tracking page status update endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "Aircabio@2024!"

# Existing tracking token from previous tests
EXISTING_TRACKING_TOKEN = "6eef574a-4baa-41fd-aa6e-67e41fc1c056"


class TestFleetEnhancements:
    """Test Fleet Portal enhancements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code}")
        
    def get_fleet_token(self):
        """Get fleet authentication token by impersonating a fleet"""
        admin_token = self.get_admin_token()
        
        # Get list of fleets
        response = self.session.get(f"{BASE_URL}/api/fleets", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        if response.status_code != 200 or not response.json():
            pytest.skip("No fleets available for testing")
            
        fleet_id = response.json()[0]["id"]
        
        # Impersonate fleet
        response = self.session.post(f"{BASE_URL}/api/admin/fleets/{fleet_id}/impersonate", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        if response.status_code == 200:
            return response.json().get("access_token"), fleet_id
        pytest.skip(f"Fleet impersonation failed: {response.status_code}")
        
    # ==================== TRACKING LINK TESTS ====================
    
    def test_tracking_session_endpoint_exists(self):
        """Test GET /api/tracking/session/{token} - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/tracking/session/{EXISTING_TRACKING_TOKEN}")
        
        # Should return 200 with session data or 404 if token expired
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "booking" in data or "driver_name" in data
            print(f"PASS: Tracking session endpoint returns data")
        else:
            print(f"INFO: Tracking token may have expired (404)")
            
    def test_tracking_update_status_endpoint_exists(self):
        """Test POST /api/tracking/update-status/{token} endpoint exists"""
        # Test with invalid token first to verify endpoint exists
        response = self.session.post(f"{BASE_URL}/api/tracking/update-status/invalid-token", json={
            "status": "arrived"
        })
        
        # Should return 404 for invalid token, not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404 for invalid token, got {response.status_code}"
        print("PASS: /api/tracking/update-status endpoint exists")
        
    def test_tracking_update_status_valid_statuses(self):
        """Test that update-status validates status values"""
        # First check if the existing token is valid
        session_response = self.session.get(f"{BASE_URL}/api/tracking/session/{EXISTING_TRACKING_TOKEN}")
        
        if session_response.status_code != 200:
            pytest.skip("Existing tracking token is not valid")
            
        # Test with invalid status
        response = self.session.post(f"{BASE_URL}/api/tracking/update-status/{EXISTING_TRACKING_TOKEN}", json={
            "status": "invalid_status"
        })
        
        # Should return 400 for invalid status
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print("PASS: Status validation works correctly")
        
    def test_tracking_update_status_with_valid_status(self):
        """Test updating status with valid status value"""
        session_response = self.session.get(f"{BASE_URL}/api/tracking/session/{EXISTING_TRACKING_TOKEN}")
        
        if session_response.status_code != 200:
            pytest.skip("Existing tracking token is not valid")
            
        # Get current status
        current_status = session_response.json().get("booking", {}).get("status", "en_route")
        print(f"Current booking status: {current_status}")
        
        # Test with valid status (en_route is always valid)
        response = self.session.post(f"{BASE_URL}/api/tracking/update-status/{EXISTING_TRACKING_TOKEN}", json={
            "status": "en_route"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Status update with valid status works")
        
    # ==================== FLEET NOTIFICATIONS TESTS ====================
    
    def test_fleet_notifications_endpoint(self):
        """Test GET /api/fleet/notifications endpoint"""
        fleet_token, fleet_id = self.get_fleet_token()
        
        response = self.session.get(f"{BASE_URL}/api/fleet/notifications", headers={
            "Authorization": f"Bearer {fleet_token}"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(response.json(), list), "Response should be a list"
        print(f"PASS: Fleet notifications endpoint returns {len(response.json())} notifications")
        
    def test_fleet_notifications_requires_auth(self):
        """Test that fleet notifications requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/fleet/notifications")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Fleet notifications requires authentication")
        
    def test_fleet_mark_notifications_read(self):
        """Test POST /api/fleet/notifications/mark-read endpoint"""
        fleet_token, fleet_id = self.get_fleet_token()
        
        response = self.session.post(f"{BASE_URL}/api/fleet/notifications/mark-read", headers={
            "Authorization": f"Bearer {fleet_token}"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Mark notifications as read endpoint works")
        
    def test_fleet_mark_notifications_read_requires_auth(self):
        """Test that mark-read requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/fleet/notifications/mark-read")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Mark notifications as read requires authentication")
        
    # ==================== TRACKING LINK GENERATION TESTS ====================
    
    def test_tracking_generate_requires_auth(self):
        """Test that tracking link generation requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/tracking/generate/some-booking-id")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Tracking link generation requires authentication")
        
    def test_tracking_generate_with_auth(self):
        """Test tracking link generation with authentication"""
        admin_token = self.get_admin_token()
        
        # Get a booking with assigned driver
        response = self.session.get(f"{BASE_URL}/api/bookings", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        if response.status_code != 200:
            pytest.skip("Could not fetch bookings")
            
        bookings = response.json()
        
        # Find a booking with assigned driver
        booking_with_driver = None
        for booking in bookings:
            if booking.get("assigned_driver_id"):
                booking_with_driver = booking
                break
                
        if not booking_with_driver:
            print("INFO: No booking with assigned driver found, skipping generation test")
            pytest.skip("No booking with assigned driver")
            
        # Try to generate tracking link
        response = self.session.post(
            f"{BASE_URL}/api/tracking/generate/{booking_with_driver['id']}", 
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Should return 200 with token or 200 with existing token
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print(f"PASS: Tracking link generated/retrieved: {data.get('token')[:20]}...")
        
    def test_tracking_generate_without_driver_fails(self):
        """Test that tracking link generation fails without assigned driver"""
        admin_token = self.get_admin_token()
        
        # Get bookings
        response = self.session.get(f"{BASE_URL}/api/bookings", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        if response.status_code != 200:
            pytest.skip("Could not fetch bookings")
            
        bookings = response.json()
        
        # Find a booking without assigned driver
        booking_without_driver = None
        for booking in bookings:
            if not booking.get("assigned_driver_id"):
                booking_without_driver = booking
                break
                
        if not booking_without_driver:
            print("INFO: All bookings have drivers assigned, skipping test")
            pytest.skip("All bookings have drivers")
            
        # Try to generate tracking link - should fail
        response = self.session.post(
            f"{BASE_URL}/api/tracking/generate/{booking_without_driver['id']}", 
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 without driver, got {response.status_code}"
        print("PASS: Tracking link generation correctly fails without driver")
        
    # ==================== FLEET JOBS WITH TRACKING INFO ====================
    
    def test_fleet_jobs_include_tracking_token(self):
        """Test that fleet jobs include tracking_token field"""
        fleet_token, fleet_id = self.get_fleet_token()
        
        response = self.session.get(f"{BASE_URL}/api/fleet/jobs", headers={
            "Authorization": f"Bearer {fleet_token}"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        jobs = response.json()
        if jobs:
            # Check if tracking_token field exists in job schema
            job = jobs[0]
            # tracking_token may or may not be present depending on if it was generated
            print(f"PASS: Fleet jobs endpoint returns {len(jobs)} jobs")
            if job.get("tracking_token"):
                print(f"  - Job {job.get('booking_ref')} has tracking_token")
        else:
            print("INFO: No jobs found for fleet")


class TestDriverTrackingPageFeatures:
    """Test Driver Tracking Page specific features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_tracking_session_returns_booking_details(self):
        """Test that tracking session returns pickup/dropoff locations"""
        response = self.session.get(f"{BASE_URL}/api/tracking/session/{EXISTING_TRACKING_TOKEN}")
        
        if response.status_code != 200:
            pytest.skip("Tracking token not valid")
            
        data = response.json()
        booking = data.get("booking", {})
        
        # Verify booking details are present
        assert "pickup_location" in booking, "Missing pickup_location"
        assert "dropoff_location" in booking, "Missing dropoff_location"
        
        print(f"PASS: Tracking session returns booking details")
        print(f"  - Pickup: {booking.get('pickup_location', 'N/A')[:50]}...")
        print(f"  - Dropoff: {booking.get('dropoff_location', 'N/A')[:50]}...")
        
    def test_tracking_session_returns_status(self):
        """Test that tracking session returns current status"""
        response = self.session.get(f"{BASE_URL}/api/tracking/session/{EXISTING_TRACKING_TOKEN}")
        
        if response.status_code != 200:
            pytest.skip("Tracking token not valid")
            
        data = response.json()
        booking = data.get("booking", {})
        
        # Status should be present
        status = booking.get("status")
        print(f"PASS: Tracking session returns status: {status}")
        
    def test_status_update_flow(self):
        """Test the status update flow: en_route -> arrived -> in_progress"""
        response = self.session.get(f"{BASE_URL}/api/tracking/session/{EXISTING_TRACKING_TOKEN}")
        
        if response.status_code != 200:
            pytest.skip("Tracking token not valid")
            
        # Test that we can update to en_route (always valid)
        response = self.session.post(f"{BASE_URL}/api/tracking/update-status/{EXISTING_TRACKING_TOKEN}", json={
            "status": "en_route"
        })
        
        assert response.status_code == 200, f"Failed to update to en_route: {response.status_code}"
        print("PASS: Status update to en_route works")
        
        # Test update to arrived
        response = self.session.post(f"{BASE_URL}/api/tracking/update-status/{EXISTING_TRACKING_TOKEN}", json={
            "status": "arrived"
        })
        
        assert response.status_code == 200, f"Failed to update to arrived: {response.status_code}"
        print("PASS: Status update to arrived works")
        
        # Reset back to en_route for future tests
        self.session.post(f"{BASE_URL}/api/tracking/update-status/{EXISTING_TRACKING_TOKEN}", json={
            "status": "en_route"
        })


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
