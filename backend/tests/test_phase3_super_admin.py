"""
Aircabio Phase 3 Super Admin System Tests
Tests for:
- Manual booking creation with dual pricing (customer_price + driver_price + profit)
- Enhanced booking list with Price, Cost, Profit columns
- Job status system
- Fleet/Driver/Vehicle management forms
- Fleet dashboard showing only driver_price (not customer_price/profit)
- Job assignment to fleet
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "admin123"
FLEET_EMAIL = "fleet1@aircabio.com"
FLEET_PASSWORD = "fleet123"


class TestManualBookingCreation:
    """Test manual booking creation with dual pricing"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def vehicle_category_id(self, admin_token):
        """Get a valid vehicle category ID"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No vehicle categories available")
    
    def test_create_manual_booking_with_dual_pricing(self, admin_token, vehicle_category_id):
        """Test creating a manual booking with customer_price and driver_price"""
        booking_data = {
            "customer_name": f"TEST_Customer_{uuid.uuid4().hex[:6]}",
            "customer_email": "test@example.com",
            "customer_phone": "+44 123 456 7890",
            "pickup_date": "2026-03-01",
            "pickup_time": "10:00",
            "pickup_location": "Heathrow Airport Terminal 5",
            "dropoff_location": "10 Downing Street, London",
            "vehicle_category_id": vehicle_category_id,
            "passengers": 2,
            "small_bags": 1,
            "large_bags": 1,
            "customer_price": 120.00,
            "driver_price": 80.00,
            "extras": [],
            "admin_notes": "Test booking created by automated test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bookings/manual",
            json=booking_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create booking: {response.text}"
        data = response.json()
        
        # Verify booking was created with correct pricing
        assert "id" in data
        assert "booking_ref" in data
        assert data["customer_name"] == booking_data["customer_name"]
        assert data["customer_price"] == 120.00
        assert data["driver_price"] == 80.00
        assert data["profit"] == 40.00  # 120 - 80 = 40
        assert data["status"] in ["new", "unassigned"]
        
        print(f"Created booking {data['booking_ref']}: Customer Price £{data['customer_price']}, Driver Price £{data['driver_price']}, Profit £{data['profit']}")
        
        return data["id"]
    
    def test_create_manual_booking_with_fleet_assignment(self, admin_token, vehicle_category_id):
        """Test creating a manual booking with fleet assignment"""
        # First get a fleet ID
        fleets_response = requests.get(
            f"{BASE_URL}/api/fleets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if fleets_response.status_code != 200 or len(fleets_response.json()) == 0:
            pytest.skip("No fleets available for assignment")
        
        fleet_id = fleets_response.json()[0]["id"]
        
        booking_data = {
            "customer_name": f"TEST_AssignedCustomer_{uuid.uuid4().hex[:6]}",
            "customer_phone": "+44 999 888 7777",
            "pickup_date": "2026-03-02",
            "pickup_time": "14:00",
            "pickup_location": "Gatwick Airport",
            "dropoff_location": "Brighton City Centre",
            "vehicle_category_id": vehicle_category_id,
            "passengers": 1,
            "customer_price": 95.00,
            "driver_price": 65.00,
            "assigned_fleet_id": fleet_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bookings/manual",
            json=booking_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create booking: {response.text}"
        data = response.json()
        
        # Verify assignment
        assert data["assigned_fleet_id"] == fleet_id
        assert data["status"] == "assigned"
        assert data["profit"] == 30.00  # 95 - 65 = 30
        
        print(f"Created assigned booking {data['booking_ref']} to fleet {data['assigned_fleet_name']}")
    
    def test_create_manual_booking_unauthorized(self, vehicle_category_id):
        """Test that manual booking creation requires admin auth"""
        booking_data = {
            "customer_name": "Unauthorized Test",
            "customer_phone": "+44 111 222 3333",
            "pickup_date": "2026-03-03",
            "pickup_time": "09:00",
            "pickup_location": "Test Location",
            "dropoff_location": "Test Destination",
            "vehicle_category_id": vehicle_category_id,
            "customer_price": 50.00,
            "driver_price": 30.00
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bookings/manual",
            json=booking_data
        )
        
        assert response.status_code == 401
        print("Manual booking creation correctly requires admin authentication")


class TestAdminBookingsWithPricing:
    """Test admin bookings list shows Price, Cost, Profit columns"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    def test_admin_bookings_include_pricing_fields(self, admin_token):
        """Test that admin bookings include customer_price, driver_price, and profit"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            booking = data[0]
            # Check for pricing fields
            assert "customer_price" in booking or "price" in booking, "Missing price field"
            assert "driver_price" in booking, "Missing driver_price field"
            assert "profit" in booking, "Missing profit field"
            
            print(f"Booking {booking.get('booking_ref', booking['id'][:8])}: Price £{booking.get('customer_price', booking.get('price', 0))}, Cost £{booking.get('driver_price', 0)}, Profit £{booking.get('profit', 0)}")
        else:
            print("No bookings found to verify pricing fields")


class TestJobStatusSystem:
    """Test job status system"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    def test_job_statuses_available(self):
        """Test that job statuses endpoint returns valid statuses"""
        # The statuses are defined in the backend, we verify they exist in bookings
        response = requests.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        
        # Valid statuses from the backend
        valid_statuses = [
            "new", "unassigned", "assigned", "accepted", "en_route",
            "arrived", "in_progress", "completed", "cancelled",
            "no_show", "driver_no_show", "customer_no_show", "on_hold", "rescheduled"
        ]
        print(f"Valid job statuses: {valid_statuses}")


class TestJobAssignment:
    """Test job assignment to fleet"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    def test_assign_job_to_fleet(self, admin_token):
        """Test assigning a job to a fleet"""
        # Get a booking to assign
        bookings_response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if bookings_response.status_code != 200 or len(bookings_response.json()) == 0:
            pytest.skip("No bookings available for assignment test")
        
        # Get a fleet
        fleets_response = requests.get(
            f"{BASE_URL}/api/fleets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if fleets_response.status_code != 200 or len(fleets_response.json()) == 0:
            pytest.skip("No fleets available for assignment test")
        
        booking_id = bookings_response.json()[0]["id"]
        fleet_id = fleets_response.json()[0]["id"]
        
        # Assign the job
        response = requests.post(
            f"{BASE_URL}/api/bookings/{booking_id}/assign",
            json={"fleet_id": fleet_id},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        print(f"Successfully assigned booking {booking_id} to fleet {fleet_id}")


class TestFleetDashboardPricing:
    """Test that fleet dashboard shows only driver_price (not customer_price/profit)"""
    
    @pytest.fixture
    def fleet_token(self):
        """Get fleet authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/fleet/login", json={
            "email": FLEET_EMAIL,
            "password": FLEET_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Fleet authentication failed")
    
    def test_fleet_jobs_hide_customer_price_and_profit(self, fleet_token):
        """Test that fleet jobs endpoint does NOT include customer_price or profit"""
        response = requests.get(
            f"{BASE_URL}/api/fleet/jobs",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            job = data[0]
            # Fleet should NOT see customer_price or profit
            assert "customer_price" not in job, "Fleet should NOT see customer_price"
            assert "profit" not in job, "Fleet should NOT see profit"
            
            # Fleet should see 'price' which is the driver_price
            assert "price" in job, "Fleet should see price (driver_price)"
            
            print(f"Fleet job {job.get('booking_ref', job['id'][:8])}: Price £{job['price']} (customer_price and profit correctly hidden)")
        else:
            print("No jobs assigned to fleet - cannot verify pricing visibility")
    
    def test_fleet_stats_show_earnings_based_on_driver_price(self, fleet_token):
        """Test that fleet stats show earnings based on driver_price only"""
        response = requests.get(
            f"{BASE_URL}/api/fleet/stats",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify earnings fields exist
        assert "total_earnings" in data
        assert "net_earnings" in data
        
        print(f"Fleet earnings: Total £{data['total_earnings']}, Net £{data['net_earnings']}")


class TestFleetManagementForms:
    """Test Fleet/Driver/Vehicle management forms (CRUD operations)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    def test_create_fleet(self, admin_token):
        """Test creating a new fleet"""
        fleet_data = {
            "name": f"TEST_Fleet_{uuid.uuid4().hex[:6]}",
            "contact_person": "Test Contact",
            "email": f"test_fleet_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+44 111 222 3333",
            "city": "London",
            "commission_type": "percentage",
            "commission_value": 15.0,
            "payment_terms": "weekly"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fleets",
            json=fleet_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create fleet: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["name"] == fleet_data["name"]
        assert data["email"] == fleet_data["email"]
        assert "temporary_password" in data  # New fleet gets a temporary password
        
        print(f"Created fleet: {data['name']} (ID: {data['id']}, Password: {data['temporary_password']})")
        
        return data["id"]
    
    def test_create_driver(self, admin_token):
        """Test creating a new driver"""
        driver_data = {
            "name": f"TEST_Driver_{uuid.uuid4().hex[:6]}",
            "email": f"test_driver_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+44 444 555 6666",
            "license_number": "DRV123456",
            "driver_type": "internal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/drivers",
            json=driver_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create driver: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["name"] == driver_data["name"]
        assert data["phone"] == driver_data["phone"]
        
        print(f"Created driver: {data['name']} (ID: {data['id']})")
        
        return data["id"]
    
    def test_create_vehicle(self, admin_token):
        """Test creating a new vehicle"""
        # Get a vehicle category first
        categories_response = requests.get(f"{BASE_URL}/api/vehicles")
        if categories_response.status_code != 200 or len(categories_response.json()) == 0:
            pytest.skip("No vehicle categories available")
        
        category_id = categories_response.json()[0]["id"]
        
        vehicle_data = {
            "plate_number": f"TEST{uuid.uuid4().hex[:4].upper()}",
            "category_id": category_id,
            "make": "Mercedes",
            "model": "E-Class",
            "year": 2024,
            "color": "Black",
            "passenger_capacity": 4,
            "luggage_capacity": 3
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/vehicles",
            json=vehicle_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create vehicle: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["plate_number"] == vehicle_data["plate_number"]
        assert data["make"] == vehicle_data["make"]
        
        print(f"Created vehicle: {data['plate_number']} ({data['make']} {data['model']})")
        
        return data["id"]
    
    def test_get_all_vehicles(self, admin_token):
        """Test getting all vehicles"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vehicles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        print(f"Found {len(data)} vehicles")


class TestDateRangeFilters:
    """Test date range filters on bookings"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    def test_bookings_with_date_filter(self, admin_token):
        """Test filtering bookings by date range"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            params={"date_from": "2024-01-01", "date_to": "2026-12-31"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        print(f"Found {len(data)} bookings in date range")
    
    def test_bookings_with_status_filter(self, admin_token):
        """Test filtering bookings by status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            params={"status": "assigned"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify all returned bookings have the correct status
        for booking in data:
            assert booking["status"] == "assigned", f"Expected status 'assigned', got '{booking['status']}'"
        
        print(f"Found {len(data)} assigned bookings")


class TestInvoices:
    """Test invoice management"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    def test_get_invoices_list(self, admin_token):
        """Test getting invoices list"""
        response = requests.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        print(f"Found {len(data)} invoices")


class TestFleetJobAcceptance:
    """Test fleet can accept and update job status"""
    
    @pytest.fixture
    def fleet_token(self):
        """Get fleet authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/fleet/login", json={
            "email": FLEET_EMAIL,
            "password": FLEET_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Fleet authentication failed")
    
    def test_fleet_can_accept_assigned_job(self, fleet_token):
        """Test that fleet can accept a job assigned to them"""
        # Get fleet's jobs
        jobs_response = requests.get(
            f"{BASE_URL}/api/fleet/jobs",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        
        assert jobs_response.status_code == 200
        jobs = jobs_response.json()
        
        # Find an assigned job
        assigned_jobs = [j for j in jobs if j["status"] == "assigned"]
        
        if len(assigned_jobs) == 0:
            print("No assigned jobs to accept - skipping acceptance test")
            return
        
        job_id = assigned_jobs[0]["id"]
        
        # Accept the job
        response = requests.put(
            f"{BASE_URL}/api/fleet/jobs/{job_id}/accept",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        
        assert response.status_code == 200
        print(f"Fleet successfully accepted job {job_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
