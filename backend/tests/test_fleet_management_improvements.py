"""
Test Fleet Management Module Improvements for Aircabio:
1) View Fleet button functionality (FleetViewDialog)
2) Search and filters on fleet list
3) Block job assignments to suspended fleets
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "admin123"

# Known suspended fleet for testing
SUSPENDED_FLEET_ID = "fleet-london-1"


class TestFleetManagementImprovements:
    """Test suite for Fleet Management improvements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup
        self.session.close()
    
    # ==================== FLEET LIST & STATS TESTS ====================
    
    def test_get_fleets_list(self):
        """Test GET /api/fleets returns list of fleets"""
        response = self.session.get(f"{BASE_URL}/api/fleets")
        assert response.status_code == 200
        
        fleets = response.json()
        assert isinstance(fleets, list)
        
        # Verify fleet structure
        if len(fleets) > 0:
            fleet = fleets[0]
            assert "id" in fleet
            assert "name" in fleet
            assert "status" in fleet
            assert "email" in fleet
            print(f"✓ Found {len(fleets)} fleets")
    
    def test_fleets_have_status_field(self):
        """Test that fleets have status field (active/inactive/suspended)"""
        response = self.session.get(f"{BASE_URL}/api/fleets")
        assert response.status_code == 200
        
        fleets = response.json()
        for fleet in fleets:
            assert "status" in fleet
            assert fleet["status"] in ["active", "inactive", "suspended"]
        
        # Count by status
        active = len([f for f in fleets if f["status"] == "active"])
        inactive = len([f for f in fleets if f["status"] == "inactive"])
        suspended = len([f for f in fleets if f["status"] == "suspended"])
        print(f"✓ Fleet status counts - Active: {active}, Inactive: {inactive}, Suspended: {suspended}")
    
    def test_suspended_fleet_exists(self):
        """Verify the suspended fleet 'London Premier Cars' exists for testing"""
        response = self.session.get(f"{BASE_URL}/api/fleets")
        assert response.status_code == 200
        
        fleets = response.json()
        suspended_fleet = next((f for f in fleets if f["id"] == SUSPENDED_FLEET_ID), None)
        
        assert suspended_fleet is not None, f"Suspended fleet {SUSPENDED_FLEET_ID} not found"
        assert suspended_fleet["status"] == "suspended", f"Fleet {SUSPENDED_FLEET_ID} should be suspended"
        assert suspended_fleet["name"] == "London Premier Cars"
        print(f"✓ Suspended fleet found: {suspended_fleet['name']} (status: {suspended_fleet['status']})")
    
    # ==================== VIEW FLEET DETAILS TESTS ====================
    
    def test_get_single_fleet_details(self):
        """Test GET /api/fleets/{fleet_id} returns fleet details"""
        response = self.session.get(f"{BASE_URL}/api/fleets/{SUSPENDED_FLEET_ID}")
        assert response.status_code == 200
        
        fleet = response.json()
        assert fleet["id"] == SUSPENDED_FLEET_ID
        assert fleet["name"] == "London Premier Cars"
        assert "contact_person" in fleet
        assert "email" in fleet
        assert "phone" in fleet
        assert "city" in fleet
        assert "commission_type" in fleet
        assert "commission_value" in fleet
        assert "payment_terms" in fleet
        print(f"✓ Fleet details retrieved: {fleet['name']}")
    
    def test_get_fleet_drivers(self):
        """Test GET /api/drivers?fleet_id={fleet_id} returns fleet's drivers"""
        response = self.session.get(f"{BASE_URL}/api/drivers?fleet_id={SUSPENDED_FLEET_ID}")
        assert response.status_code == 200
        
        drivers = response.json()
        assert isinstance(drivers, list)
        print(f"✓ Fleet has {len(drivers)} drivers")
    
    def test_get_fleet_vehicles(self):
        """Test GET /api/admin/vehicles?fleet_id={fleet_id} returns fleet's vehicles"""
        response = self.session.get(f"{BASE_URL}/api/admin/vehicles?fleet_id={SUSPENDED_FLEET_ID}")
        assert response.status_code == 200
        
        vehicles = response.json()
        assert isinstance(vehicles, list)
        print(f"✓ Fleet has {len(vehicles)} vehicles")
    
    def test_get_fleet_jobs(self):
        """Test GET /api/admin/bookings?fleet_id={fleet_id} returns jobs assigned to fleet"""
        # First get an active fleet to test with
        fleets_response = self.session.get(f"{BASE_URL}/api/fleets")
        fleets = fleets_response.json()
        active_fleet = next((f for f in fleets if f["status"] == "active"), None)
        
        if active_fleet:
            response = self.session.get(f"{BASE_URL}/api/admin/bookings?fleet_id={active_fleet['id']}")
            assert response.status_code == 200
            
            jobs = response.json()
            assert isinstance(jobs, list)
            print(f"✓ Fleet '{active_fleet['name']}' has {len(jobs)} jobs")
        else:
            pytest.skip("No active fleet found for testing")
    
    # ==================== SUSPENDED FLEET ASSIGNMENT BLOCK TESTS ====================
    
    def test_assign_job_to_suspended_fleet_returns_400(self):
        """Test POST /api/bookings/{id}/assign returns 400 when assigning to suspended fleet"""
        # First, get a booking to assign
        bookings_response = self.session.get(f"{BASE_URL}/api/admin/bookings")
        assert bookings_response.status_code == 200
        
        bookings = bookings_response.json()
        if len(bookings) == 0:
            pytest.skip("No bookings available for testing")
        
        # Find an unassigned or new booking
        test_booking = next((b for b in bookings if b["status"] in ["new", "unassigned"]), bookings[0])
        booking_id = test_booking["id"]
        
        # Try to assign to suspended fleet
        assign_response = self.session.post(
            f"{BASE_URL}/api/bookings/{booking_id}/assign",
            json={"fleet_id": SUSPENDED_FLEET_ID, "driver_price": 50.0}
        )
        
        assert assign_response.status_code == 400, f"Expected 400, got {assign_response.status_code}"
        
        error_detail = assign_response.json().get("detail", "")
        assert "suspended" in error_detail.lower(), f"Error should mention suspended: {error_detail}"
        print(f"✓ Assignment to suspended fleet blocked with error: {error_detail}")
    
    def test_manual_booking_with_suspended_fleet_returns_400(self):
        """Test POST /api/admin/bookings/manual returns 400 when assigning to suspended fleet"""
        booking_data = {
            "customer_name": "TEST_Suspended_Fleet_Check",
            "customer_email": "test@example.com",
            "customer_phone": "+44123456789",
            "pickup_location": "London Heathrow Airport",
            "dropoff_location": "Central London",
            "pickup_date": "2026-02-15",
            "pickup_time": "10:00",
            "vehicle_category_id": "saloon",
            "passengers": 2,
            "small_bags": 1,
            "large_bags": 1,
            "customer_price": 100.0,
            "driver_price": 70.0,
            "assigned_fleet_id": SUSPENDED_FLEET_ID  # Suspended fleet
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/bookings/manual", json=booking_data)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        error_detail = response.json().get("detail", "")
        assert "suspended" in error_detail.lower(), f"Error should mention suspended: {error_detail}"
        print(f"✓ Manual booking with suspended fleet blocked: {error_detail}")
    
    def test_assign_job_to_active_fleet_succeeds(self):
        """Test that assigning to an active fleet works correctly"""
        # Get an active fleet
        fleets_response = self.session.get(f"{BASE_URL}/api/fleets")
        fleets = fleets_response.json()
        active_fleet = next((f for f in fleets if f["status"] == "active"), None)
        
        if not active_fleet:
            pytest.skip("No active fleet found for testing")
        
        # Get a booking
        bookings_response = self.session.get(f"{BASE_URL}/api/admin/bookings")
        bookings = bookings_response.json()
        
        if len(bookings) == 0:
            pytest.skip("No bookings available for testing")
        
        # Find an unassigned booking or use first one
        test_booking = next((b for b in bookings if b["status"] in ["new", "unassigned"]), bookings[0])
        booking_id = test_booking["id"]
        
        # Assign to active fleet
        assign_response = self.session.post(
            f"{BASE_URL}/api/bookings/{booking_id}/assign",
            json={"fleet_id": active_fleet["id"], "driver_price": 50.0}
        )
        
        assert assign_response.status_code == 200, f"Expected 200, got {assign_response.status_code}: {assign_response.text}"
        print(f"✓ Assignment to active fleet '{active_fleet['name']}' succeeded")
    
    # ==================== ADMIN STATS TESTS ====================
    
    def test_admin_stats_include_fleet_counts(self):
        """Test GET /api/admin/stats returns fleet-related statistics"""
        response = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        
        stats = response.json()
        assert "active_fleets" in stats or "total_fleets" in stats
        print(f"✓ Admin stats retrieved: {stats}")
    
    # ==================== FLEET CRUD TESTS ====================
    
    def test_create_and_update_fleet_status(self):
        """Test creating a fleet and updating its status"""
        # Create a test fleet
        unique_id = str(uuid.uuid4())[:6]
        fleet_data = {
            "name": f"TEST_Fleet_{unique_id}",
            "contact_person": "Test Manager",
            "email": f"test_fleet_{unique_id}@example.com",
            "phone": "+44 111 222 3333",
            "city": "London",
            "commission_type": "percentage",
            "commission_value": 10,
            "payment_terms": "weekly",
            "status": "active"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/fleets", json=fleet_data)
        assert create_response.status_code == 200, f"Fleet creation failed: {create_response.text}"
        
        created_fleet = create_response.json()
        fleet_id = created_fleet["id"]
        assert created_fleet["status"] == "active"
        print(f"✓ Created test fleet: {created_fleet['name']}")
        
        # Update status to suspended
        update_response = self.session.put(
            f"{BASE_URL}/api/fleets/{fleet_id}",
            json={"status": "suspended"}
        )
        assert update_response.status_code == 200
        
        updated_fleet = update_response.json()
        assert updated_fleet["status"] == "suspended"
        print(f"✓ Updated fleet status to suspended")
        
        # Verify assignment is blocked
        bookings_response = self.session.get(f"{BASE_URL}/api/admin/bookings")
        bookings = bookings_response.json()
        
        if len(bookings) > 0:
            test_booking = bookings[0]
            assign_response = self.session.post(
                f"{BASE_URL}/api/bookings/{test_booking['id']}/assign",
                json={"fleet_id": fleet_id, "driver_price": 50.0}
            )
            assert assign_response.status_code == 400
            print(f"✓ Assignment to newly suspended fleet blocked")
        
        # Cleanup - delete test fleet
        delete_response = self.session.delete(f"{BASE_URL}/api/fleets/{fleet_id}")
        assert delete_response.status_code == 200
        print(f"✓ Test fleet cleaned up")


class TestFleetViewDialogAPIs:
    """Test APIs used by FleetViewDialog component"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        self.session.close()
    
    def test_fleet_view_dialog_overview_data(self):
        """Test that all data needed for Overview tab is available"""
        # Get fleet details
        response = self.session.get(f"{BASE_URL}/api/fleets/{SUSPENDED_FLEET_ID}")
        assert response.status_code == 200
        
        fleet = response.json()
        
        # Verify all fields needed for Overview tab
        required_fields = [
            "id", "name", "status", "contact_person", "phone", "email", "city",
            "commission_type", "commission_value", "payment_terms"
        ]
        
        for field in required_fields:
            assert field in fleet, f"Missing field: {field}"
        
        print(f"✓ All Overview tab fields present for fleet: {fleet['name']}")
    
    def test_fleet_view_dialog_drivers_tab_data(self):
        """Test GET /api/drivers?fleet_id returns data for Drivers tab"""
        response = self.session.get(f"{BASE_URL}/api/drivers?fleet_id={SUSPENDED_FLEET_ID}")
        assert response.status_code == 200
        
        drivers = response.json()
        assert isinstance(drivers, list)
        
        if len(drivers) > 0:
            driver = drivers[0]
            assert "name" in driver
            assert "phone" in driver
            assert "email" in driver
            assert "status" in driver
        
        print(f"✓ Drivers tab data retrieved: {len(drivers)} drivers")
    
    def test_fleet_view_dialog_vehicles_tab_data(self):
        """Test GET /api/admin/vehicles?fleet_id returns data for Vehicles tab"""
        response = self.session.get(f"{BASE_URL}/api/admin/vehicles?fleet_id={SUSPENDED_FLEET_ID}")
        assert response.status_code == 200
        
        vehicles = response.json()
        assert isinstance(vehicles, list)
        
        if len(vehicles) > 0:
            vehicle = vehicles[0]
            assert "plate_number" in vehicle
            assert "status" in vehicle
        
        print(f"✓ Vehicles tab data retrieved: {len(vehicles)} vehicles")
    
    def test_fleet_view_dialog_jobs_tab_data(self):
        """Test GET /api/admin/bookings?fleet_id returns data for Jobs tab"""
        # Use an active fleet that might have jobs
        fleets_response = self.session.get(f"{BASE_URL}/api/fleets")
        fleets = fleets_response.json()
        
        for fleet in fleets:
            response = self.session.get(f"{BASE_URL}/api/admin/bookings?fleet_id={fleet['id']}")
            assert response.status_code == 200
            
            jobs = response.json()
            assert isinstance(jobs, list)
            
            if len(jobs) > 0:
                job = jobs[0]
                assert "booking_ref" in job
                assert "pickup_date" in job
                assert "pickup_location" in job
                assert "dropoff_location" in job
                assert "status" in job
                print(f"✓ Jobs tab data retrieved for fleet '{fleet['name']}': {len(jobs)} jobs")
                return
        
        print("✓ Jobs tab API working (no jobs found for any fleet)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
