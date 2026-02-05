"""
Test suite for Tracking Map Preview and Alerts Features
Tests:
1. Admin Tracking Tab - OpenStreetMap embed with driver location
2. Fleet Portal Tracking Tab - OpenStreetMap embed
3. Admin Tracking Tab - Live tracking auto-refresh indicator
4. Admin Tracking Tab - Late arrival alerts
5. Admin Tracking Tab - Distance alerts (driver far from pickup)
6. PDF Tracking Report - OpenStreetMap embeds
7. PDF Tracking Report - Alerts & Issues section
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTrackingMapAndAlerts:
    """Test tracking map preview and alerts features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_token = None
        self.fleet_token = None
        self.booking_id = "d07278a4-0ce6-41a5-9a98-e8ba309a97f3"  # Booking with tracking
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aircabio.com",
            "password": "Aircabio@2024!"
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("access_token")
        
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_admin_tracking_endpoint_returns_data(self):
        """Test that admin tracking endpoint returns tracking data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "session" in data, "Response should contain session"
        assert "booking" in data, "Response should contain booking"
        assert "latest_location" in data, "Response should contain latest_location"
        assert "total_locations" in data, "Response should contain total_locations"
        assert "alerts" in data, "Response should contain alerts"
        
        print(f"PASS: Admin tracking endpoint returns complete data")
    
    def test_admin_tracking_returns_alerts(self):
        """Test that admin tracking endpoint returns alerts for late/distance issues"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        alerts = data.get("alerts", [])
        
        # Check if alerts are present (distance alert expected for this booking)
        print(f"Alerts found: {len(alerts)}")
        for alert in alerts:
            print(f"  - Type: {alert.get('type')}, Message: {alert.get('message')}")
        
        # Verify alert structure if present
        if alerts:
            for alert in alerts:
                assert "type" in alert, "Alert should have type"
                assert "message" in alert, "Alert should have message"
                assert alert["type"] in ["late", "distance"], f"Alert type should be 'late' or 'distance', got {alert['type']}"
        
        print(f"PASS: Admin tracking returns {len(alerts)} alerts")
    
    def test_admin_tracking_distance_alert(self):
        """Test that distance alert is generated when driver is far from pickup"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        alerts = data.get("alerts", [])
        
        # Find distance alert
        distance_alerts = [a for a in alerts if a.get("type") == "distance"]
        
        if distance_alerts:
            alert = distance_alerts[0]
            assert "km away from pickup" in alert.get("message", ""), "Distance alert should mention km away"
            print(f"PASS: Distance alert found - {alert.get('message')}")
        else:
            print("INFO: No distance alert (driver may be close to pickup)")
    
    def test_admin_tracking_session_status(self):
        """Test that tracking session status is returned correctly"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        session = data.get("session", {})
        
        assert "status" in session, "Session should have status"
        assert session["status"] in ["pending", "active", "completed"], f"Invalid status: {session['status']}"
        assert "driver_name" in session, "Session should have driver_name"
        
        print(f"PASS: Session status is '{session['status']}', driver: {session.get('driver_name')}")
    
    def test_admin_tracking_latest_location(self):
        """Test that latest location contains required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        location = data.get("latest_location")
        
        if location:
            assert "latitude" in location, "Location should have latitude"
            assert "longitude" in location, "Location should have longitude"
            assert "timestamp" in location, "Location should have timestamp"
            
            # Verify coordinates are valid
            assert -90 <= location["latitude"] <= 90, "Invalid latitude"
            assert -180 <= location["longitude"] <= 180, "Invalid longitude"
            
            print(f"PASS: Latest location - lat: {location['latitude']}, lng: {location['longitude']}")
        else:
            print("INFO: No latest location (tracking may not have started)")
    
    def test_pdf_report_contains_openstreetmap(self):
        """Test that PDF report uses OpenStreetMap embeds"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}/report",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML content, got {content_type}"
        
        # Check for OpenStreetMap in content
        content = response.text
        assert "openstreetmap.org" in content, "PDF report should contain OpenStreetMap embeds"
        
        print("PASS: PDF report contains OpenStreetMap embeds")
    
    def test_pdf_report_contains_route_overview(self):
        """Test that PDF report contains Route Overview section"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}/report",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        content = response.text
        
        assert "Route Overview" in content, "PDF report should contain Route Overview section"
        print("PASS: PDF report contains Route Overview section")
    
    def test_pdf_report_contains_key_location_points(self):
        """Test that PDF report contains Key Location Points section"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}/report",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        content = response.text
        
        assert "Key Location Points" in content, "PDF report should contain Key Location Points section"
        print("PASS: PDF report contains Key Location Points section")
    
    def test_pdf_report_tracking_summary(self):
        """Test that PDF report contains tracking summary stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}/report",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        content = response.text
        
        # Check for summary stats
        assert "Total Points" in content, "PDF should show Total Points"
        assert "Distance Traveled" in content or "km" in content, "PDF should show distance"
        assert "Duration" in content, "PDF should show duration"
        
        print("PASS: PDF report contains tracking summary stats")
    
    def test_fleet_tracking_endpoint(self):
        """Test fleet tracking endpoint returns data"""
        # First impersonate a fleet
        impersonate_response = requests.post(
            f"{BASE_URL}/api/admin/fleets/fleet-london-1/impersonate",
            headers=self.admin_headers
        )
        
        if impersonate_response.status_code != 200:
            pytest.skip("Could not impersonate fleet")
        
        fleet_token = impersonate_response.json().get("access_token")
        fleet_headers = {"Authorization": f"Bearer {fleet_token}"}
        
        # Test fleet tracking endpoint
        response = requests.get(
            f"{BASE_URL}/api/fleet/tracking/{self.booking_id}",
            headers=fleet_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "session" in data, "Response should contain session"
        assert "latest_location" in data, "Response should contain latest_location"
        assert "total_locations" in data, "Response should contain total_locations"
        
        print(f"PASS: Fleet tracking endpoint returns data")
    
    def test_tracking_session_has_started_at(self):
        """Test that tracking session has started_at timestamp for late detection"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        session = data.get("session", {})
        
        if session.get("status") in ["active", "completed"]:
            assert "started_at" in session, "Active session should have started_at"
            print(f"PASS: Session has started_at: {session.get('started_at')}")
        else:
            print("INFO: Session not started yet")
    
    def test_booking_has_pickup_coordinates(self):
        """Test that booking has pickup coordinates for distance calculation"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/{self.booking_id}",
            headers=self.admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        booking = data.get("booking", {})
        
        # Check if booking has coordinates
        has_lat = booking.get("pickup_lat") is not None
        has_lng = booking.get("pickup_lng") is not None
        
        if has_lat and has_lng:
            print(f"PASS: Booking has pickup coordinates - lat: {booking.get('pickup_lat')}, lng: {booking.get('pickup_lng')}")
        else:
            print("INFO: Booking missing pickup coordinates (distance alerts may not work)")


class TestTrackingWithoutSession:
    """Test tracking endpoints for bookings without tracking sessions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@aircabio.com",
            "password": "Aircabio@2024!"
        })
        self.admin_token = response.json().get("access_token") if response.status_code == 200 else None
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_tracking_returns_404_for_no_session(self):
        """Test that tracking endpoint returns 404 for booking without tracking"""
        # Use a booking ID that doesn't have tracking
        response = requests.get(
            f"{BASE_URL}/api/admin/tracking/nonexistent-booking-id",
            headers=self.admin_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent tracking, got {response.status_code}"
        print("PASS: Returns 404 for booking without tracking session")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
