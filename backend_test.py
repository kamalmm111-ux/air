import requests
import sys
import json
from datetime import datetime

class AircabioAPITester:
    def __init__(self, base_url="https://cabio-booking.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@aircabio.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Admin token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_vehicles(self):
        """Test get vehicles endpoint"""
        success, response = self.run_test("Get Vehicles", "GET", "vehicles", 200)
        if success:
            print(f"   Found {len(response)} vehicles")
            return response
        return []

    def test_get_pricing(self):
        """Test get pricing rules endpoint"""
        success, response = self.run_test("Get Pricing Rules", "GET", "pricing", 200)
        if success:
            print(f"   Found {len(response)} pricing rules")
            return response
        return []

    def test_get_fixed_routes(self):
        """Test get fixed routes endpoint"""
        success, response = self.run_test("Get Fixed Routes", "GET", "fixed-routes", 200)
        if success:
            print(f"   Found {len(response)} fixed routes")
            return response
        return []

    def test_quote_request(self):
        """Test quote request endpoint"""
        quote_data = {
            "pickup_location": "Heathrow Airport",
            "dropoff_location": "Central London",
            "distance_km": 25.5,
            "passengers": 2,
            "luggage": 2,
            "meet_greet": True,
            "is_airport_pickup": True
        }
        success, response = self.run_test("Quote Request", "POST", "quote", 200, data=quote_data)
        if success:
            print(f"   Got {len(response.get('quotes', []))} vehicle quotes")
            return response
        return {}

    def test_user_registration(self):
        """Test user registration"""
        user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User",
            "phone": "+44 7700 900000"
        }
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, data=user_data)
        if success and 'access_token' in response:
            print(f"   User registered with ID: {response.get('user', {}).get('id', 'N/A')}")
            return response
        return {}

    def test_create_booking(self, vehicle_id="sedan"):
        """Test booking creation"""
        booking_data = {
            "pickup_location": "Heathrow Airport Terminal 5",
            "dropoff_location": "Central London Hotel",
            "pickup_date": "2024-12-25",
            "pickup_time": "14:30",
            "passengers": 2,
            "luggage": 2,
            "vehicle_category_id": vehicle_id,
            "flight_number": "BA1234",
            "meet_greet": True,
            "passenger_name": "John Smith",
            "passenger_email": "john.smith@test.com",
            "passenger_phone": "+44 7700 900000",
            "distance_km": 25.5,
            "duration_minutes": 45,
            "price": 75.00,
            "currency": "GBP",
            "payment_method": "stripe"
        }
        success, response = self.run_test("Create Booking", "POST", "bookings", 200, data=booking_data)
        if success:
            print(f"   Booking created with ID: {response.get('id', 'N/A')}")
            return response
        return {}

    def test_admin_stats(self):
        """Test admin stats endpoint (requires admin token)"""
        if not self.token:
            print("❌ No admin token available for stats test")
            return {}
        
        success, response = self.run_test("Admin Stats", "GET", "admin/stats", 200)
        if success:
            print(f"   Total bookings: {response.get('total_bookings', 0)}")
            print(f"   Total revenue: £{response.get('total_revenue', 0)}")
            return response
        return {}

    def test_admin_bookings(self):
        """Test admin bookings endpoint (requires admin token)"""
        if not self.token:
            print("❌ No admin token available for bookings test")
            return []
        
        success, response = self.run_test("Admin Get All Bookings", "GET", "admin/bookings", 200)
        if success:
            print(f"   Found {len(response)} total bookings")
            return response
        return []

    def test_seed_data(self):
        """Test seed data endpoint"""
        success, response = self.run_test("Seed Data", "POST", "seed", 200)
        if success:
            print("   Database seeded successfully")
            return True
        return False

def main():
    print("🚀 Starting Aircabio API Tests")
    print("=" * 50)
    
    tester = AircabioAPITester()
    
    # Test basic endpoints
    print("\n📋 BASIC API TESTS")
    tester.test_root_endpoint()
    
    # Test seed data first
    print("\n🌱 SEED DATA TEST")
    tester.test_seed_data()
    
    # Test public endpoints
    print("\n🚗 VEHICLE & PRICING TESTS")
    vehicles = tester.test_get_vehicles()
    pricing_rules = tester.test_get_pricing()
    fixed_routes = tester.test_get_fixed_routes()
    
    # Test quote system
    print("\n💰 QUOTE SYSTEM TESTS")
    quotes = tester.test_quote_request()
    
    # Test authentication
    print("\n🔐 AUTHENTICATION TESTS")
    user_reg = tester.test_user_registration()
    admin_login = tester.test_admin_login()
    
    # Test booking system
    print("\n📅 BOOKING SYSTEM TESTS")
    if vehicles:
        vehicle_id = vehicles[0].get('id', 'sedan')
        booking = tester.test_create_booking(vehicle_id)
    
    # Test admin endpoints
    print("\n👑 ADMIN ENDPOINT TESTS")
    if tester.token:
        stats = tester.test_admin_stats()
        all_bookings = tester.test_admin_bookings()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS ({len(tester.failed_tests)}):")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"{i}. {failure.get('test', 'Unknown')}")
            if 'error' in failure:
                print(f"   Error: {failure['error']}")
            else:
                print(f"   Expected: {failure.get('expected')}, Got: {failure.get('actual')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())