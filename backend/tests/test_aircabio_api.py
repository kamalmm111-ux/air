"""
Aircabio Airport Transfer API Tests
Tests for Phase 2 Multi-Fleet Architecture:
- Auth routes (admin login, fleet login)
- Admin stats and dashboard data
- Fleet management
- Vehicle categories
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "admin123"
FLEET_EMAIL = "fleet1@aircabio.com"
FLEET_PASSWORD = "fleet123"


class TestHealthAndBasics:
    """Basic API health checks"""
    
    def test_vehicles_endpoint_public(self):
        """Test public vehicles endpoint"""
        response = requests.get(f"{BASE_URL}/api/vehicles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "id" in data[0]
            assert "name" in data[0]
            assert "max_passengers" in data[0]
        print(f"Found {len(data)} vehicle categories")
    
    def test_pricing_endpoint_public(self):
        """Test public pricing endpoint"""
        response = requests.get(f"{BASE_URL}/api/pricing")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} pricing rules")
    
    def test_fixed_routes_endpoint_public(self):
        """Test public fixed routes endpoint"""
        response = requests.get(f"{BASE_URL}/api/fixed-routes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} fixed routes")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "user" in data
        assert data["token_type"] == "bearer"
        
        # Verify user data
        user = data["user"]
        assert user["email"] == ADMIN_EMAIL
        assert user["role"] == "super_admin"
        assert "id" in user
        assert "name" in user
        print(f"Admin login successful: {user['name']} ({user['role']})")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"Invalid login correctly rejected: {data['detail']}")
    
    def test_admin_login_missing_fields(self):
        """Test admin login with missing fields"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL
        })
        assert response.status_code == 422  # Validation error
        print("Missing password correctly rejected")


class TestFleetAuth:
    """Fleet admin authentication tests"""
    
    def test_fleet_login_success(self):
        """Test fleet login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/fleet/login", json={
            "email": FLEET_EMAIL,
            "password": FLEET_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "user" in data
        assert data["token_type"] == "bearer"
        
        # Verify user data
        user = data["user"]
        assert user["email"] == FLEET_EMAIL
        assert user["role"] == "fleet_admin"
        assert "fleet_id" in user
        assert user["fleet_id"] is not None
        print(f"Fleet login successful: {user['name']} (fleet_id: {user['fleet_id']})")
    
    def test_fleet_login_invalid_credentials(self):
        """Test fleet login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/fleet/login", json={
            "email": "wrong@fleet.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"Invalid fleet login correctly rejected: {data['detail']}")


class TestAdminStats:
    """Admin dashboard statistics tests"""
    
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
    
    def test_admin_stats_endpoint(self, admin_token):
        """Test admin stats endpoint returns correct data structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required stats fields
        required_fields = [
            "total_bookings", "pending_bookings", "confirmed_bookings",
            "assigned_bookings", "completed_bookings", "cancelled_bookings",
            "total_revenue", "total_fleets", "active_fleets", "total_drivers"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["total_bookings"], int)
        assert isinstance(data["total_revenue"], (int, float))
        assert isinstance(data["active_fleets"], int)
        
        print(f"Admin stats: {data['total_bookings']} bookings, {data['active_fleets']} active fleets, £{data['total_revenue']} revenue")
    
    def test_admin_stats_unauthorized(self):
        """Test admin stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401
        print("Admin stats correctly requires authentication")


class TestFleetManagement:
    """Fleet management tests"""
    
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
    
    def test_get_fleets_list(self, admin_token):
        """Test getting list of fleets"""
        response = requests.get(
            f"{BASE_URL}/api/fleets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            fleet = data[0]
            assert "id" in fleet
            assert "name" in fleet
            assert "email" in fleet
            assert "city" in fleet
            assert "status" in fleet
            assert "commission_type" in fleet
            assert "commission_value" in fleet
            print(f"Found {len(data)} fleets: {[f['name'] for f in data]}")
        else:
            print("No fleets found")
    
    def test_get_fleets_unauthorized(self):
        """Test fleets endpoint requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/fleets")
        assert response.status_code == 401
        print("Fleets endpoint correctly requires authentication")


class TestFleetStats:
    """Fleet dashboard statistics tests"""
    
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
    
    def test_fleet_stats_endpoint(self, fleet_token):
        """Test fleet stats endpoint returns correct data structure"""
        response = requests.get(
            f"{BASE_URL}/api/fleet/stats",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required stats fields
        required_fields = [
            "total_jobs", "new_jobs", "accepted_jobs",
            "in_progress_jobs", "completed_jobs",
            "total_earnings", "net_earnings"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["total_jobs"], int)
        assert isinstance(data["total_earnings"], (int, float))
        assert isinstance(data["net_earnings"], (int, float))
        
        print(f"Fleet stats: {data['total_jobs']} jobs, £{data['total_earnings']} earnings, £{data['net_earnings']} net")
    
    def test_fleet_stats_unauthorized(self):
        """Test fleet stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/fleet/stats")
        assert response.status_code == 401
        print("Fleet stats correctly requires authentication")
    
    def test_fleet_jobs_endpoint(self, fleet_token):
        """Test fleet jobs endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/fleet/jobs",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Fleet has {len(data)} assigned jobs")


class TestAdminBookings:
    """Admin bookings management tests"""
    
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
    
    def test_get_all_bookings(self, admin_token):
        """Test getting all bookings as admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            booking = data[0]
            assert "id" in booking
            assert "passenger_name" in booking
            assert "pickup_location" in booking
            assert "dropoff_location" in booking
            assert "status" in booking
            assert "price" in booking
            print(f"Found {len(data)} bookings")
        else:
            print("No bookings found")
    
    def test_get_bookings_unauthorized(self):
        """Test admin bookings endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/bookings")
        assert response.status_code == 401
        print("Admin bookings correctly requires authentication")


class TestAuthMe:
    """Auth /me endpoint tests"""
    
    def test_auth_me_with_admin_token(self):
        """Test /auth/me returns correct user data for admin"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Then get /me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "super_admin"
        print(f"Auth /me returned: {data['name']} ({data['role']})")
    
    def test_auth_me_with_fleet_token(self):
        """Test /auth/me returns correct user data for fleet admin"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/fleet/login", json={
            "email": FLEET_EMAIL,
            "password": FLEET_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Then get /me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == FLEET_EMAIL
        assert data["role"] == "fleet_admin"
        assert data["fleet_id"] is not None
        print(f"Auth /me returned: {data['name']} ({data['role']}, fleet: {data['fleet_id']})")
    
    def test_auth_me_unauthorized(self):
        """Test /auth/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("Auth /me correctly requires authentication")


class TestInvoices:
    """Invoice management tests"""
    
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
    
    def test_get_invoices_admin(self, admin_token):
        """Test getting invoices as admin"""
        response = requests.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} invoices")


class TestDrivers:
    """Driver management tests"""
    
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
    
    def test_get_drivers_admin(self, admin_token):
        """Test getting drivers as admin"""
        response = requests.get(
            f"{BASE_URL}/api/drivers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} drivers")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
