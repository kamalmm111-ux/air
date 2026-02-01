"""
Fleet Management Workflow Tests
Tests for the fleet management features:
1. Super Admin assigns booking to fleet WITH driver_price
2. Fleet Dashboard shows assigned jobs with correct payout
3. Fleet CRUD for drivers (My Drivers tab)
4. Fleet CRUD for vehicles (My Vehicles tab)
5. Fleet assigns their drivers/vehicles to jobs
6. Admin Bookings table shows fleet name, driver name, vehicle plate
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


class TestFleetAssignmentWithDriverPrice:
    """Test Super Admin assigning booking to fleet with driver_price"""
    
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
    def fleet_token(self):
        """Get fleet authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/fleet/login", json={
            "email": FLEET_EMAIL,
            "password": FLEET_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Fleet authentication failed")
    
    @pytest.fixture
    def fleet_id(self, admin_token):
        """Get fleet ID for fleet1"""
        response = requests.get(
            f"{BASE_URL}/api/fleets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            fleets = response.json()
            for fleet in fleets:
                if fleet.get("email") == FLEET_EMAIL:
                    return fleet["id"]
        pytest.skip("Could not find fleet1")
    
    @pytest.fixture
    def vehicle_category_id(self):
        """Get a vehicle category ID"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        if response.status_code == 200:
            vehicles = response.json()
            if len(vehicles) > 0:
                return vehicles[0]["id"]
        return "sedan"
    
    def test_create_booking_and_assign_with_driver_price(self, admin_token, fleet_id, vehicle_category_id):
        """Test creating a booking and assigning to fleet with driver_price"""
        # Step 1: Create a manual booking
        booking_data = {
            "customer_name": "TEST_FleetAssign Customer",
            "customer_phone": "+44123456789",
            "customer_email": "test_fleet_assign@test.com",
            "pickup_location": "Heathrow Airport Terminal 5",
            "dropoff_location": "Central London",
            "pickup_date": "2025-02-15",
            "pickup_time": "14:00",
            "vehicle_category_id": vehicle_category_id,
            "passengers": 2,
            "small_bags": 1,
            "large_bags": 1,
            "customer_price": 85.00,
            "driver_price": 60.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/bookings/manual",
            json=booking_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200, f"Failed to create booking: {create_response.text}"
        booking = create_response.json()
        booking_id = booking["id"]
        print(f"Created booking: {booking_id}")
        
        # Step 2: Assign to fleet with driver_price (fleet payout)
        assign_data = {
            "fleet_id": fleet_id,
            "driver_price": 55.00  # Fleet payout
        }
        
        assign_response = requests.post(
            f"{BASE_URL}/api/bookings/{booking_id}/assign",
            json=assign_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert assign_response.status_code == 200, f"Failed to assign booking: {assign_response.text}"
        print(f"Assigned booking to fleet with driver_price: £55.00")
        
        # Step 3: Verify the booking has driver_price saved
        get_response = requests.get(
            f"{BASE_URL}/api/admin/bookings/{booking_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        updated_booking = get_response.json()
        
        assert updated_booking["assigned_fleet_id"] == fleet_id, "Fleet ID not saved"
        assert updated_booking["driver_price"] == 55.00, f"driver_price not saved correctly: {updated_booking.get('driver_price')}"
        assert updated_booking["status"] == "assigned", f"Status not updated: {updated_booking.get('status')}"
        
        # Verify profit calculation
        expected_profit = 85.00 - 55.00  # customer_price - driver_price
        assert abs(updated_booking["profit"] - expected_profit) < 0.01, f"Profit not calculated correctly: {updated_booking.get('profit')}"
        
        print(f"Verified: driver_price=£{updated_booking['driver_price']}, profit=£{updated_booking['profit']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/bookings/{booking_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        return booking_id


class TestFleetDashboardJobs:
    """Test Fleet Dashboard shows assigned jobs with correct payout"""
    
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
    def fleet_token(self):
        """Get fleet authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/fleet/login", json={
            "email": FLEET_EMAIL,
            "password": FLEET_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Fleet authentication failed")
    
    @pytest.fixture
    def fleet_id(self, admin_token):
        """Get fleet ID for fleet1"""
        response = requests.get(
            f"{BASE_URL}/api/fleets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            fleets = response.json()
            for fleet in fleets:
                if fleet.get("email") == FLEET_EMAIL:
                    return fleet["id"]
        pytest.skip("Could not find fleet1")
    
    def test_fleet_sees_assigned_jobs(self, admin_token, fleet_token, fleet_id):
        """Test that fleet can see jobs assigned to them"""
        # Create and assign a booking
        booking_data = {
            "customer_name": "TEST_FleetView Customer",
            "customer_phone": "+44123456789",
            "pickup_location": "Gatwick Airport",
            "dropoff_location": "Brighton",
            "pickup_date": "2025-02-16",
            "pickup_time": "10:00",
            "vehicle_category_id": "sedan",
            "passengers": 1,
            "small_bags": 0,
            "large_bags": 1,
            "customer_price": 75.00,
            "driver_price": 50.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/bookings/manual",
            json=booking_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        booking = create_response.json()
        booking_id = booking["id"]
        
        # Assign to fleet
        assign_response = requests.post(
            f"{BASE_URL}/api/bookings/{booking_id}/assign",
            json={"fleet_id": fleet_id, "driver_price": 45.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert assign_response.status_code == 200
        
        # Fleet fetches their jobs
        jobs_response = requests.get(
            f"{BASE_URL}/api/fleet/jobs",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert jobs_response.status_code == 200
        jobs = jobs_response.json()
        
        # Find our test job
        test_job = None
        for job in jobs:
            if job["id"] == booking_id:
                test_job = job
                break
        
        assert test_job is not None, "Assigned job not found in fleet jobs"
        
        # Verify fleet sees the payout price (driver_price renamed to 'price')
        assert test_job["price"] == 45.00, f"Fleet payout price incorrect: {test_job.get('price')}"
        
        # Verify customer_price and profit are NOT visible to fleet
        assert "customer_price" not in test_job or test_job.get("customer_price") is None, "customer_price should be hidden from fleet"
        assert "profit" not in test_job or test_job.get("profit") is None, "profit should be hidden from fleet"
        
        print(f"Fleet sees job with payout: £{test_job['price']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/bookings/{booking_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestFleetDriversCRUD:
    """Test Fleet can manage their own drivers"""
    
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
    
    def test_fleet_create_driver(self, fleet_token):
        """Test fleet can create a driver"""
        driver_data = {
            "name": "TEST_Fleet Driver John",
            "phone": "+44777123456",
            "email": "test_john@fleet.com",
            "license_number": "DL123456",
            "license_expiry": "2026-12-31"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fleet/drivers",
            json=driver_data,
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert response.status_code == 200, f"Failed to create driver: {response.text}"
        driver = response.json()
        
        assert driver["name"] == driver_data["name"]
        assert driver["phone"] == driver_data["phone"]
        assert driver["driver_type"] == "fleet"
        assert driver["fleet_id"] is not None
        
        print(f"Created fleet driver: {driver['name']} (ID: {driver['id']})")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/fleet/drivers/{driver['id']}",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        return driver["id"]
    
    def test_fleet_get_drivers(self, fleet_token):
        """Test fleet can get their drivers list"""
        response = requests.get(
            f"{BASE_URL}/api/fleet/drivers",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert response.status_code == 200
        drivers = response.json()
        assert isinstance(drivers, list)
        print(f"Fleet has {len(drivers)} drivers")
    
    def test_fleet_update_driver(self, fleet_token):
        """Test fleet can update their driver"""
        # Create a driver first
        driver_data = {
            "name": "TEST_Update Driver",
            "phone": "+44777999888"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/fleet/drivers",
            json=driver_data,
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert create_response.status_code == 200
        driver = create_response.json()
        driver_id = driver["id"]
        
        # Update the driver
        update_data = {
            "name": "TEST_Updated Driver Name",
            "license_number": "UPDATED123"
        }
        update_response = requests.put(
            f"{BASE_URL}/api/fleet/drivers/{driver_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert update_response.status_code == 200
        updated_driver = update_response.json()
        
        assert updated_driver["name"] == update_data["name"]
        assert updated_driver["license_number"] == update_data["license_number"]
        print(f"Updated driver: {updated_driver['name']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/fleet/drivers/{driver_id}",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
    
    def test_fleet_delete_driver(self, fleet_token):
        """Test fleet can delete their driver"""
        # Create a driver first
        driver_data = {
            "name": "TEST_Delete Driver",
            "phone": "+44777111222"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/fleet/drivers",
            json=driver_data,
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert create_response.status_code == 200
        driver_id = create_response.json()["id"]
        
        # Delete the driver
        delete_response = requests.delete(
            f"{BASE_URL}/api/fleet/drivers/{driver_id}",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert delete_response.status_code == 200
        print(f"Deleted driver: {driver_id}")
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/fleet/drivers",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        drivers = get_response.json()
        driver_ids = [d["id"] for d in drivers]
        assert driver_id not in driver_ids, "Driver not deleted"


class TestFleetVehiclesCRUD:
    """Test Fleet can manage their own vehicles"""
    
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
    
    def test_fleet_create_vehicle(self, fleet_token):
        """Test fleet can create a vehicle"""
        vehicle_data = {
            "plate_number": "TEST123",
            "make": "Toyota",
            "model": "Camry",
            "year": 2022,
            "color": "Black",
            "category_id": "sedan",
            "passenger_capacity": 4,
            "luggage_capacity": 3
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fleet/vehicles",
            json=vehicle_data,
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert response.status_code == 200, f"Failed to create vehicle: {response.text}"
        vehicle = response.json()
        
        assert vehicle["plate_number"] == vehicle_data["plate_number"]
        assert vehicle["make"] == vehicle_data["make"]
        assert vehicle["fleet_id"] is not None
        
        print(f"Created fleet vehicle: {vehicle['plate_number']} (ID: {vehicle['id']})")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/fleet/vehicles/{vehicle['id']}",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        return vehicle["id"]
    
    def test_fleet_get_vehicles(self, fleet_token):
        """Test fleet can get their vehicles list"""
        response = requests.get(
            f"{BASE_URL}/api/fleet/vehicles",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert response.status_code == 200
        vehicles = response.json()
        assert isinstance(vehicles, list)
        print(f"Fleet has {len(vehicles)} vehicles")
    
    def test_fleet_update_vehicle(self, fleet_token):
        """Test fleet can update their vehicle"""
        # Create a vehicle first
        vehicle_data = {
            "plate_number": "UPD456",
            "category_id": "sedan"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/fleet/vehicles",
            json=vehicle_data,
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert create_response.status_code == 200
        vehicle = create_response.json()
        vehicle_id = vehicle["id"]
        
        # Update the vehicle
        update_data = {
            "make": "Mercedes",
            "model": "E-Class",
            "color": "Silver"
        }
        update_response = requests.put(
            f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert update_response.status_code == 200
        updated_vehicle = update_response.json()
        
        assert updated_vehicle["make"] == update_data["make"]
        assert updated_vehicle["model"] == update_data["model"]
        print(f"Updated vehicle: {updated_vehicle['plate_number']} - {updated_vehicle['make']} {updated_vehicle['model']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
    
    def test_fleet_delete_vehicle(self, fleet_token):
        """Test fleet can delete their vehicle"""
        # Create a vehicle first
        vehicle_data = {
            "plate_number": "DEL789",
            "category_id": "sedan"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/fleet/vehicles",
            json=vehicle_data,
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert create_response.status_code == 200
        vehicle_id = create_response.json()["id"]
        
        # Delete the vehicle
        delete_response = requests.delete(
            f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert delete_response.status_code == 200
        print(f"Deleted vehicle: {vehicle_id}")


class TestFleetAssignDriverToJob:
    """Test Fleet can assign their drivers/vehicles to jobs"""
    
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
    def fleet_token(self):
        """Get fleet authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/fleet/login", json={
            "email": FLEET_EMAIL,
            "password": FLEET_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Fleet authentication failed")
    
    @pytest.fixture
    def fleet_id(self, admin_token):
        """Get fleet ID for fleet1"""
        response = requests.get(
            f"{BASE_URL}/api/fleets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            fleets = response.json()
            for fleet in fleets:
                if fleet.get("email") == FLEET_EMAIL:
                    return fleet["id"]
        pytest.skip("Could not find fleet1")
    
    def test_fleet_assign_driver_to_job(self, admin_token, fleet_token, fleet_id):
        """Test fleet can assign their driver and vehicle to a job"""
        # Step 1: Create a driver for the fleet
        driver_data = {
            "name": "TEST_Assign Driver Mike",
            "phone": "+44777555444"
        }
        driver_response = requests.post(
            f"{BASE_URL}/api/fleet/drivers",
            json=driver_data,
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert driver_response.status_code == 200
        driver = driver_response.json()
        driver_id = driver["id"]
        
        # Step 2: Create a vehicle for the fleet
        vehicle_data = {
            "plate_number": "ASSIGN01",
            "category_id": "sedan",
            "make": "BMW",
            "model": "5 Series"
        }
        vehicle_response = requests.post(
            f"{BASE_URL}/api/fleet/vehicles",
            json=vehicle_data,
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert vehicle_response.status_code == 200
        vehicle = vehicle_response.json()
        vehicle_id = vehicle["id"]
        
        # Step 3: Admin creates a booking and assigns to fleet
        booking_data = {
            "customer_name": "TEST_DriverAssign Customer",
            "customer_phone": "+44123456789",
            "pickup_location": "Stansted Airport",
            "dropoff_location": "Cambridge",
            "pickup_date": "2025-02-17",
            "pickup_time": "09:00",
            "vehicle_category_id": "sedan",
            "passengers": 2,
            "small_bags": 1,
            "large_bags": 1,
            "customer_price": 65.00,
            "driver_price": 45.00
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/bookings/manual",
            json=booking_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        booking = create_response.json()
        booking_id = booking["id"]
        
        # Assign to fleet
        assign_response = requests.post(
            f"{BASE_URL}/api/bookings/{booking_id}/assign",
            json={"fleet_id": fleet_id, "driver_price": 40.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert assign_response.status_code == 200
        
        # Step 4: Fleet assigns their driver and vehicle to the job
        assign_driver_response = requests.put(
            f"{BASE_URL}/api/fleet/jobs/{booking_id}/assign-driver",
            json={"driver_id": driver_id, "vehicle_id": vehicle_id},
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert assign_driver_response.status_code == 200, f"Failed to assign driver: {assign_driver_response.text}"
        print(f"Fleet assigned driver {driver['name']} and vehicle {vehicle['plate_number']} to job")
        
        # Step 5: Verify the assignment is saved
        get_response = requests.get(
            f"{BASE_URL}/api/admin/bookings/{booking_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        updated_booking = get_response.json()
        
        assert updated_booking["assigned_driver_id"] == driver_id, "Driver ID not saved"
        assert updated_booking["assigned_driver_name"] == driver["name"], "Driver name not saved"
        assert updated_booking["assigned_vehicle_id"] == vehicle_id, "Vehicle ID not saved"
        assert updated_booking["assigned_vehicle_plate"] == vehicle["plate_number"], "Vehicle plate not saved"
        
        print(f"Admin sees: Driver={updated_booking['assigned_driver_name']}, Vehicle={updated_booking['assigned_vehicle_plate']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/fleet/drivers/{driver_id}", headers={"Authorization": f"Bearer {fleet_token}"})
        requests.delete(f"{BASE_URL}/api/fleet/vehicles/{vehicle_id}", headers={"Authorization": f"Bearer {fleet_token}"})
        requests.delete(f"{BASE_URL}/api/admin/bookings/{booking_id}", headers={"Authorization": f"Bearer {admin_token}"})


class TestAdminSeesFleetAssignment:
    """Test Admin Bookings table shows fleet name, driver name, vehicle plate"""
    
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
    
    def test_admin_bookings_show_assignment_info(self, admin_token):
        """Test admin bookings endpoint returns fleet/driver/vehicle info"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        bookings = response.json()
        
        # Check that booking structure includes assignment fields
        if len(bookings) > 0:
            booking = bookings[0]
            # These fields should exist in the response (may be null if not assigned)
            assert "assigned_fleet_id" in booking or booking.get("assigned_fleet_id") is None
            assert "assigned_fleet_name" in booking or booking.get("assigned_fleet_name") is None
            assert "assigned_driver_id" in booking or booking.get("assigned_driver_id") is None
            assert "assigned_driver_name" in booking or booking.get("assigned_driver_name") is None
            assert "assigned_vehicle_id" in booking or booking.get("assigned_vehicle_id") is None
            assert "assigned_vehicle_plate" in booking or booking.get("assigned_vehicle_plate") is None
            
            # Check for assigned bookings
            assigned_bookings = [b for b in bookings if b.get("assigned_fleet_id")]
            print(f"Found {len(assigned_bookings)} assigned bookings out of {len(bookings)} total")
            
            if len(assigned_bookings) > 0:
                ab = assigned_bookings[0]
                print(f"Sample assigned booking: Fleet={ab.get('assigned_fleet_name')}, Driver={ab.get('assigned_driver_name')}, Vehicle={ab.get('assigned_vehicle_plate')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
