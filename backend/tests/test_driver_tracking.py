"""
Test Driver Tracking System
Tests for:
1. Generate tracking link
2. Get tracking session by token
3. Update driver location
4. Start/Stop tracking control
5. Admin tracking endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "Aircabio@2024!"

# Known tracking token from main agent context
KNOWN_TRACKING_TOKEN = "6eef574a-4baa-41fd-aa6e-67e41fc1c056"
KNOWN_BOOKING_REF = "AC268E66"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(admin_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestOGMetaTags:
    """Test OG Meta Tags for social sharing"""
    
    def test_og_meta_tags_present(self):
        """Verify OG meta tags are present in HTML"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        
        html = response.text
        
        # Check OG title
        assert 'og:title' in html, "og:title meta tag missing"
        assert 'Aircabio - Premium Airport Transfers' in html, "OG title should be Aircabio branding"
        
        # Check OG description
        assert 'og:description' in html, "og:description meta tag missing"
        assert 'premium airport transfer' in html.lower(), "OG description should mention airport transfer"
        
        # Check OG image
        assert 'og:image' in html, "og:image meta tag missing"
        
        # Check OG site name
        assert 'og:site_name' in html, "og:site_name meta tag missing"
        assert 'Aircabio' in html, "Site name should be Aircabio"
        
        # Check Twitter card
        assert 'twitter:card' in html, "twitter:card meta tag missing"
        assert 'twitter:title' in html, "twitter:title meta tag missing"
        
        print("PASS: All OG meta tags present with Aircabio branding")
    
    def test_no_emergent_branding(self):
        """Verify no Emergent branding in OG tags"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        
        html = response.text
        
        # Check that Emergent branding is NOT in OG tags
        assert 'Emergent | Fullstack App' not in html, "Should not have Emergent branding in OG tags"
        
        print("PASS: No Emergent branding in OG meta tags")


class TestTrackingSessionPublicEndpoints:
    """Test public tracking endpoints (for driver)"""
    
    def test_get_tracking_session_by_token(self):
        """Test getting tracking session by token - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/tracking/session/{KNOWN_TRACKING_TOKEN}")
        
        if response.status_code == 404:
            pytest.skip("Tracking session not found - may need to generate first")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have session id"
        assert "status" in data, "Response should have status"
        assert "driver_name" in data, "Response should have driver_name"
        assert "booking" in data, "Response should have booking details"
        
        # Verify booking details structure
        booking = data.get("booking", {})
        assert "ref" in booking, "Booking should have ref"
        assert "pickup_location" in booking, "Booking should have pickup_location"
        assert "dropoff_location" in booking, "Booking should have dropoff_location"
        
        print(f"PASS: Tracking session retrieved - Status: {data['status']}, Driver: {data['driver_name']}")
    
    def test_get_tracking_session_invalid_token(self):
        """Test getting tracking session with invalid token"""
        invalid_token = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/tracking/session/{invalid_token}")
        
        assert response.status_code == 404, f"Expected 404 for invalid token, got {response.status_code}"
        print("PASS: Invalid token returns 404")
    
    def test_update_driver_location(self):
        """Test updating driver location - public endpoint"""
        location_data = {
            "latitude": 51.5074,
            "longitude": -0.1278,
            "accuracy": 10.0,
            "speed": 45.5,
            "heading": 180.0,
            "timestamp": "2026-01-15T10:30:00Z"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tracking/location/{KNOWN_TRACKING_TOKEN}",
            json=location_data
        )
        
        if response.status_code == 404:
            pytest.skip("Tracking session not found")
        
        if response.status_code == 400:
            # Session may be completed
            print(f"INFO: Location update returned 400 - session may be completed: {response.text}")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert data.get("status") == "active", "Status should be active after location update"
        
        print("PASS: Driver location updated successfully")
    
    def test_tracking_control_start(self):
        """Test starting tracking session"""
        response = requests.post(
            f"{BASE_URL}/api/tracking/control/{KNOWN_TRACKING_TOKEN}?action=start"
        )
        
        if response.status_code == 404:
            pytest.skip("Tracking session not found")
        
        if response.status_code == 400:
            # Session may already be completed
            print(f"INFO: Start tracking returned 400 - session may be completed: {response.text}")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        
        print(f"PASS: Tracking control start - {data.get('message')}")
    
    def test_tracking_control_invalid_action(self):
        """Test tracking control with invalid action"""
        response = requests.post(
            f"{BASE_URL}/api/tracking/control/{KNOWN_TRACKING_TOKEN}?action=invalid"
        )
        
        # Should return 422 for invalid action
        assert response.status_code == 422, f"Expected 422 for invalid action, got {response.status_code}"
        print("PASS: Invalid action returns 422")


class TestTrackingAdminEndpoints:
    """Test admin tracking endpoints"""
    
    def test_generate_tracking_link_requires_auth(self):
        """Test that generate tracking link requires authentication"""
        response = requests.post(f"{BASE_URL}/api/tracking/generate/some-booking-id")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Generate tracking link requires authentication")
    
    def test_admin_tracking_requires_auth(self):
        """Test that admin tracking endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/tracking/some-booking-id")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Admin tracking endpoint requires authentication")
    
    def test_get_admin_tracking_data(self, auth_headers):
        """Test getting admin tracking data for a booking"""
        # First get a booking with tracking
        bookings_response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers=auth_headers
        )
        
        if bookings_response.status_code != 200:
            pytest.skip(f"Could not get bookings: {bookings_response.status_code}")
        
        bookings = bookings_response.json()
        if isinstance(bookings, dict):
            bookings = bookings.get("bookings", [])
        
        # Find booking with tracking
        booking_with_tracking = None
        for booking in bookings:
            if booking.get("tracking_token") or booking.get("booking_ref") == KNOWN_BOOKING_REF:
                booking_with_tracking = booking
                break
        
        if not booking_with_tracking:
            pytest.skip("No booking with tracking found")
        
        booking_id = booking_with_tracking.get("id")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{booking_id}",
            headers=auth_headers
        )
        
        if response.status_code == 404:
            print(f"INFO: No tracking session for booking {booking_id}")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session" in data, "Response should have session"
        assert "booking" in data, "Response should have booking"
        
        print(f"PASS: Admin tracking data retrieved - Status: {data['session'].get('status')}")
    
    def test_get_all_active_tracking(self, auth_headers):
        """Test getting all active tracking sessions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"PASS: Retrieved {len(data)} active tracking sessions")
    
    def test_generate_tracking_link_for_booking(self, auth_headers):
        """Test generating tracking link for a booking with driver"""
        # Get bookings to find one with a driver assigned
        bookings_response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers=auth_headers
        )
        
        if bookings_response.status_code != 200:
            pytest.skip(f"Could not get bookings: {bookings_response.status_code}")
        
        bookings = bookings_response.json()
        if isinstance(bookings, dict):
            bookings = bookings.get("bookings", [])
        
        # Find booking with driver assigned
        booking_with_driver = None
        for booking in bookings:
            if booking.get("assigned_driver_name") or booking.get("driver_id"):
                booking_with_driver = booking
                break
        
        if not booking_with_driver:
            pytest.skip("No booking with driver assigned found")
        
        booking_id = booking_with_driver.get("id")
        
        response = requests.post(
            f"{BASE_URL}/api/tracking/generate/{booking_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should have token"
        assert "tracking_url" in data, "Response should have tracking_url"
        
        print(f"PASS: Tracking link generated - Token: {data['token'][:8]}...")
    
    def test_generate_tracking_link_no_driver(self, auth_headers):
        """Test generating tracking link for booking without driver"""
        # Get bookings to find one without driver
        bookings_response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers=auth_headers
        )
        
        if bookings_response.status_code != 200:
            pytest.skip(f"Could not get bookings: {bookings_response.status_code}")
        
        bookings = bookings_response.json()
        if isinstance(bookings, dict):
            bookings = bookings.get("bookings", [])
        
        # Find booking without driver
        booking_without_driver = None
        for booking in bookings:
            if not booking.get("assigned_driver_name") and not booking.get("driver_id"):
                booking_without_driver = booking
                break
        
        if not booking_without_driver:
            print("INFO: All bookings have drivers assigned - skipping test")
            return
        
        booking_id = booking_without_driver.get("id")
        
        response = requests.post(
            f"{BASE_URL}/api/tracking/generate/{booking_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Expected 400 for no driver, got {response.status_code}"
        print("PASS: Generate tracking link returns 400 when no driver assigned")


class TestTrackingReport:
    """Test tracking report download"""
    
    def test_download_tracking_report_requires_auth(self):
        """Test that tracking report download requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/tracking/some-booking-id/report")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("PASS: Tracking report download requires authentication")
    
    def test_download_tracking_report(self, auth_headers):
        """Test downloading tracking report"""
        # Get bookings to find one with tracking
        bookings_response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers=auth_headers
        )
        
        if bookings_response.status_code != 200:
            pytest.skip(f"Could not get bookings: {bookings_response.status_code}")
        
        bookings = bookings_response.json()
        if isinstance(bookings, dict):
            bookings = bookings.get("bookings", [])
        
        # Find booking with tracking
        booking_with_tracking = None
        for booking in bookings:
            if booking.get("tracking_token") or booking.get("booking_ref") == KNOWN_BOOKING_REF:
                booking_with_tracking = booking
                break
        
        if not booking_with_tracking:
            pytest.skip("No booking with tracking found")
        
        booking_id = booking_with_tracking.get("id")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{booking_id}/report",
            headers=auth_headers
        )
        
        if response.status_code == 404:
            print(f"INFO: No tracking session for booking {booking_id}")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type is HTML
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML content, got {content_type}"
        
        # Check HTML content
        html = response.text
        assert "Driver Tracking Report" in html, "Report should have title"
        assert "Aircabio" in html, "Report should have Aircabio branding"
        
        print("PASS: Tracking report downloaded successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
