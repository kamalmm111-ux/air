"""
Test P0/P1/P2 Features:
- P0: Admin Settings (Child Seats, Currencies, Ratings)
- P1: Refactored Components (DriversManager, VehiclesManager, FleetsManager)
- P2: Real-time ETA with traffic consideration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://media-hub-344.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "Aircabio@2024!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Get headers with admin token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestP0AdminSettingsChildSeats:
    """P0: Test Admin Settings - Child Seats Tab"""
    
    def test_public_child_seats_endpoint(self):
        """Test public /api/settings/child-seats returns pricing data"""
        response = requests.get(f"{BASE_URL}/api/settings/child-seats")
        assert response.status_code == 200
        
        data = response.json()
        assert "child_seats" in data
        assert isinstance(data["child_seats"], list)
        
        # Verify child seat structure
        if len(data["child_seats"]) > 0:
            seat = data["child_seats"][0]
            assert "id" in seat
            assert "name" in seat
            assert "price" in seat
            print(f"✓ Public child seats API returns {len(data['child_seats'])} seat types")
    
    def test_admin_child_seats_endpoint(self, admin_headers):
        """Test admin /api/admin/settings/child-seats returns pricing data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/child-seats",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "child_seats" in data
        
        # Verify expected seat types exist
        seat_ids = [s["id"] for s in data["child_seats"]]
        expected_seats = ["infant", "toddler", "booster"]
        for expected in expected_seats:
            assert expected in seat_ids, f"Missing expected seat type: {expected}"
        
        print(f"✓ Admin child seats API returns: {seat_ids}")
    
    def test_child_seat_pricing_structure(self, admin_headers):
        """Test child seat pricing has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/child-seats",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        for seat in data["child_seats"]:
            assert "id" in seat, "Missing id field"
            assert "name" in seat, "Missing name field"
            assert "price" in seat, "Missing price field"
            assert isinstance(seat["price"], (int, float)), "Price should be numeric"
            assert seat["price"] >= 0, "Price should be non-negative"
            
            # Optional fields
            if "age_range" in seat:
                assert isinstance(seat["age_range"], str)
            if "is_active" in seat:
                assert isinstance(seat["is_active"], bool)
        
        print("✓ Child seat pricing structure is valid")


class TestP0AdminSettingsCurrencies:
    """P0: Test Admin Settings - Currencies Tab"""
    
    def test_public_currencies_endpoint(self):
        """Test public /api/settings/currencies returns currency rates"""
        response = requests.get(f"{BASE_URL}/api/settings/currencies")
        assert response.status_code == 200
        
        data = response.json()
        assert "currencies" in data
        assert "base_currency" in data
        assert data["base_currency"] == "GBP"
        
        # Verify currency structure
        currencies = data["currencies"]
        assert isinstance(currencies, list)
        assert len(currencies) > 0
        
        currency_codes = [c["code"] for c in currencies]
        expected_currencies = ["GBP", "EUR", "USD", "CAD"]
        for expected in expected_currencies:
            assert expected in currency_codes, f"Missing expected currency: {expected}"
        
        print(f"✓ Public currencies API returns: {currency_codes}")
    
    def test_admin_currencies_endpoint(self, admin_headers):
        """Test admin /api/admin/settings/currencies returns currency rates"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/currencies",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "currencies" in data
        assert "base_currency" in data
        
        print(f"✓ Admin currencies API returns {len(data['currencies'])} currencies")
    
    def test_currency_rate_structure(self, admin_headers):
        """Test currency rates have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/currencies",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        for currency in data["currencies"]:
            assert "code" in currency, "Missing code field"
            assert "symbol" in currency, "Missing symbol field"
            assert "rate" in currency, "Missing rate field"
            assert isinstance(currency["rate"], (int, float)), "Rate should be numeric"
            assert currency["rate"] > 0, "Rate should be positive"
            
            # GBP should have rate of 1.0
            if currency["code"] == "GBP":
                assert currency["rate"] == 1.0, "GBP rate should be 1.0"
        
        print("✓ Currency rate structure is valid")


class TestP0AdminSettingsRatings:
    """P0: Test Admin Settings - Ratings Tab"""
    
    def test_admin_ratings_endpoint(self, admin_headers):
        """Test admin /api/admin/ratings returns ratings list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ratings",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin ratings API returns {len(data)} ratings")
    
    def test_admin_ratings_summary_endpoint(self, admin_headers):
        """Test admin /api/admin/ratings/summary returns summary statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ratings/summary",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_ratings" in data
        assert "average_rating" in data
        assert "rating_distribution" in data
        
        # Verify rating distribution structure
        distribution = data["rating_distribution"]
        for star in ["1", "2", "3", "4", "5"]:
            assert star in distribution, f"Missing star rating: {star}"
        
        print(f"✓ Ratings summary: total={data['total_ratings']}, avg={data['average_rating']}")


class TestP1DriversManager:
    """P1: Test DriversManager component backend APIs"""
    
    def test_get_drivers_endpoint(self, admin_headers):
        """Test GET /api/drivers returns drivers list"""
        response = requests.get(
            f"{BASE_URL}/api/drivers",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            driver = data[0]
            assert "id" in driver
            assert "name" in driver
            assert "phone" in driver
            assert "status" in driver
        
        print(f"✓ Drivers API returns {len(data)} drivers")
    
    def test_driver_structure(self, admin_headers):
        """Test driver data structure"""
        response = requests.get(
            f"{BASE_URL}/api/drivers",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            driver = data[0]
            expected_fields = ["id", "name", "phone", "driver_type", "status", "created_at"]
            for field in expected_fields:
                assert field in driver, f"Missing field: {field}"
        
        print("✓ Driver structure is valid")


class TestP1VehiclesManager:
    """P1: Test VehiclesManager component backend APIs"""
    
    def test_get_admin_vehicles_endpoint(self, admin_headers):
        """Test GET /api/admin/vehicles returns vehicles list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vehicles",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            vehicle = data[0]
            assert "id" in vehicle
            assert "plate_number" in vehicle
            assert "status" in vehicle
        
        print(f"✓ Admin vehicles API returns {len(data)} vehicles")
    
    def test_vehicle_structure(self, admin_headers):
        """Test vehicle data structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vehicles",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            vehicle = data[0]
            expected_fields = ["id", "plate_number", "category_id", "passenger_capacity", "luggage_capacity", "status"]
            for field in expected_fields:
                assert field in vehicle, f"Missing field: {field}"
        
        print("✓ Vehicle structure is valid")


class TestP1FleetsManager:
    """P1: Test FleetsManager component backend APIs"""
    
    def test_get_fleets_endpoint(self, admin_headers):
        """Test GET /api/fleets returns fleets list"""
        response = requests.get(
            f"{BASE_URL}/api/fleets",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            fleet = data[0]
            assert "id" in fleet
            assert "name" in fleet
            assert "email" in fleet
            assert "status" in fleet
        
        print(f"✓ Fleets API returns {len(data)} fleets")
    
    def test_fleet_structure(self, admin_headers):
        """Test fleet data structure"""
        response = requests.get(
            f"{BASE_URL}/api/fleets",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            fleet = data[0]
            expected_fields = ["id", "name", "contact_person", "email", "phone", "city", "commission_type", "commission_value", "status"]
            for field in expected_fields:
                assert field in fleet, f"Missing field: {field}"
        
        print("✓ Fleet structure is valid")


class TestP2ETAWithTraffic:
    """P2: Test Real-time ETA with traffic consideration"""
    
    def test_customer_tracking_endpoint_returns_eta_details(self):
        """Test /api/customer/tracking/{booking_ref} returns eta_details with traffic_status"""
        # Use existing booking reference
        booking_ref = "ACD853F5"
        
        response = requests.get(f"{BASE_URL}/api/customer/tracking/{booking_ref}")
        assert response.status_code == 200
        
        data = response.json()
        assert "booking" in data
        assert "tracking" in data
        
        # ETA details may be null if booking is completed or no active tracking
        # But the field should exist in the response structure
        if "eta_details" in data and data["eta_details"]:
            eta_details = data["eta_details"]
            assert "distance_km" in eta_details
            assert "traffic_status" in eta_details
            assert "effective_speed_kmh" in eta_details
            
            # Verify traffic_status is valid
            valid_statuses = ["light", "normal", "moderate", "heavy"]
            assert eta_details["traffic_status"] in valid_statuses
            
            print(f"✓ ETA details: distance={eta_details['distance_km']}km, traffic={eta_details['traffic_status']}")
        else:
            print("✓ ETA details not available (booking may be completed)")
    
    def test_tracking_endpoint_returns_booking_info(self):
        """Test tracking endpoint returns complete booking info"""
        booking_ref = "ACD853F5"
        
        response = requests.get(f"{BASE_URL}/api/customer/tracking/{booking_ref}")
        assert response.status_code == 200
        
        data = response.json()
        booking = data["booking"]
        
        assert "booking_ref" in booking
        assert "status" in booking
        assert "pickup_location" in booking
        assert "dropoff_location" in booking
        
        print(f"✓ Booking info: ref={booking['booking_ref']}, status={booking['status']}")
    
    def test_tracking_endpoint_returns_driver_info(self):
        """Test tracking endpoint returns driver info"""
        booking_ref = "ACD853F5"
        
        response = requests.get(f"{BASE_URL}/api/customer/tracking/{booking_ref}")
        assert response.status_code == 200
        
        data = response.json()
        tracking = data["tracking"]
        
        if tracking and "driver" in tracking:
            driver = tracking["driver"]
            assert "name" in driver
            assert "phone" in driver
            print(f"✓ Driver info: name={driver['name']}")
        else:
            print("✓ No driver tracking info (may be completed)")
    
    def test_tracking_endpoint_invalid_booking(self):
        """Test tracking endpoint returns 404 for invalid booking"""
        response = requests.get(f"{BASE_URL}/api/customer/tracking/INVALID123")
        assert response.status_code == 404
        print("✓ Invalid booking returns 404")


class TestAdminSettingsAuthentication:
    """Test admin settings require authentication"""
    
    def test_admin_child_seats_requires_auth(self):
        """Test admin child seats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/child-seats")
        assert response.status_code == 401
        print("✓ Admin child seats requires authentication")
    
    def test_admin_currencies_requires_auth(self):
        """Test admin currencies endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/currencies")
        assert response.status_code == 401
        print("✓ Admin currencies requires authentication")
    
    def test_admin_ratings_requires_auth(self):
        """Test admin ratings endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/ratings")
        assert response.status_code == 401
        print("✓ Admin ratings requires authentication")
    
    def test_admin_ratings_summary_requires_auth(self):
        """Test admin ratings summary endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/ratings/summary")
        assert response.status_code == 401
        print("✓ Admin ratings summary requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
