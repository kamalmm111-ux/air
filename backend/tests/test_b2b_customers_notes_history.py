"""
Test B2B Customer Accounts, Booking Notes, and Booking History APIs
Tests for iteration 7 - Enterprise-grade booking module features
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "admin123"


class TestAuthentication:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """Test super admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] in ["super_admin", "admin"]
        print(f"✓ Admin login successful - role: {data['user']['role']}")
        return data["access_token"]


class TestCustomerAccounts:
    """Test B2B Customer Accounts CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_customers_list(self):
        """Test GET /api/admin/customers - list all B2B customers"""
        response = requests.get(f"{BASE_URL}/api/admin/customers", headers=self.headers)
        assert response.status_code == 200, f"Failed to get customers: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/customers - returned {len(data)} customers")
    
    def test_create_customer_account(self):
        """Test POST /api/admin/customers - create new B2B customer"""
        customer_data = {
            "company_name": f"TEST_Company_{uuid.uuid4().hex[:6]}",
            "contact_person": "John Test",
            "email": f"test_{uuid.uuid4().hex[:6]}@testcompany.com",
            "phone": "+44 20 1234 5678",
            "billing_address": "123 Test Street, London EC1",
            "payment_terms": "Net 30",
            "credit_limit": 5000.00,
            "notes": "Test customer account"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/customers", json=customer_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create customer: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["company_name"] == customer_data["company_name"]
        assert data["contact_person"] == customer_data["contact_person"]
        assert data["email"] == customer_data["email"]
        assert data["status"] == "active"
        print(f"✓ POST /api/admin/customers - created customer: {data['company_name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/customers/{data['id']}", headers=self.headers)
        return data
    
    def test_get_single_customer(self):
        """Test GET /api/admin/customers/{id} - get single customer"""
        # First create a customer
        customer_data = {
            "company_name": f"TEST_GetSingle_{uuid.uuid4().hex[:6]}",
            "contact_person": "Jane Test",
            "email": f"test_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "+44 20 9876 5432"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/customers", json=customer_data, headers=self.headers)
        customer_id = create_response.json()["id"]
        
        # Get the customer
        response = requests.get(f"{BASE_URL}/api/admin/customers/{customer_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed to get customer: {response.text}"
        
        data = response.json()
        assert data["id"] == customer_id
        assert data["company_name"] == customer_data["company_name"]
        print(f"✓ GET /api/admin/customers/{customer_id} - retrieved customer")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/customers/{customer_id}", headers=self.headers)
    
    def test_update_customer_account(self):
        """Test PUT /api/admin/customers/{id} - update customer"""
        # First create a customer
        customer_data = {
            "company_name": f"TEST_Update_{uuid.uuid4().hex[:6]}",
            "contact_person": "Update Test",
            "email": f"test_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "+44 20 1111 2222"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/customers", json=customer_data, headers=self.headers)
        customer_id = create_response.json()["id"]
        
        # Update the customer
        update_data = {
            "company_name": f"TEST_Updated_{uuid.uuid4().hex[:6]}",
            "payment_terms": "Net 15",
            "status": "inactive"
        }
        response = requests.put(f"{BASE_URL}/api/admin/customers/{customer_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to update customer: {response.text}"
        
        data = response.json()
        assert data["company_name"] == update_data["company_name"]
        assert data["payment_terms"] == update_data["payment_terms"]
        assert data["status"] == update_data["status"]
        print(f"✓ PUT /api/admin/customers/{customer_id} - updated customer")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/customers/{customer_id}", headers=self.headers)
    
    def test_delete_customer_account(self):
        """Test DELETE /api/admin/customers/{id} - delete customer"""
        # First create a customer
        customer_data = {
            "company_name": f"TEST_Delete_{uuid.uuid4().hex[:6]}",
            "contact_person": "Delete Test",
            "email": f"test_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "+44 20 3333 4444"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/customers", json=customer_data, headers=self.headers)
        customer_id = create_response.json()["id"]
        
        # Delete the customer
        response = requests.delete(f"{BASE_URL}/api/admin/customers/{customer_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed to delete customer: {response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/admin/customers/{customer_id}", headers=self.headers)
        assert get_response.status_code == 404
        print(f"✓ DELETE /api/admin/customers/{customer_id} - customer deleted")
    
    def test_search_customers(self):
        """Test GET /api/admin/customers with search parameter"""
        # Create a customer with unique name
        unique_name = f"TEST_SearchUnique_{uuid.uuid4().hex[:8]}"
        customer_data = {
            "company_name": unique_name,
            "contact_person": "Search Test",
            "email": f"search_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "+44 20 5555 6666"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/customers", json=customer_data, headers=self.headers)
        customer_id = create_response.json()["id"]
        
        # Search for the customer
        response = requests.get(f"{BASE_URL}/api/admin/customers?search={unique_name}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(c["company_name"] == unique_name for c in data)
        print(f"✓ GET /api/admin/customers?search={unique_name} - found customer")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/customers/{customer_id}", headers=self.headers)
    
    def test_filter_customers_by_status(self):
        """Test GET /api/admin/customers with status filter"""
        response = requests.get(f"{BASE_URL}/api/admin/customers?status=active", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # All returned customers should be active
        for customer in data:
            assert customer["status"] == "active"
        print(f"✓ GET /api/admin/customers?status=active - filtered {len(data)} active customers")


class TestBookingNotes:
    """Test Booking Notes CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and create a test booking"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get an existing booking or create one
        bookings_response = requests.get(f"{BASE_URL}/api/admin/bookings", headers=self.headers)
        bookings = bookings_response.json()
        
        if bookings:
            self.booking_id = bookings[0]["id"]
        else:
            # Create a test booking
            booking_data = {
                "customer_name": "TEST_Notes_Customer",
                "customer_phone": "+44 20 1234 5678",
                "pickup_date": "2026-02-15",
                "pickup_time": "10:00",
                "pickup_location": "Heathrow Airport",
                "dropoff_location": "Central London",
                "vehicle_category_id": "standard",
                "customer_price": 50.00,
                "driver_price": 35.00
            }
            create_response = requests.post(f"{BASE_URL}/api/admin/bookings/manual", json=booking_data, headers=self.headers)
            self.booking_id = create_response.json()["id"]
    
    def test_get_booking_notes_empty(self):
        """Test GET /api/admin/bookings/{id}/notes - initially empty"""
        response = requests.get(f"{BASE_URL}/api/admin/bookings/{self.booking_id}/notes", headers=self.headers)
        assert response.status_code == 200, f"Failed to get notes: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/bookings/{self.booking_id}/notes - returned {len(data)} notes")
    
    def test_add_booking_note(self):
        """Test POST /api/admin/bookings/{id}/notes - add a note"""
        note_data = {"note": f"TEST_Note_{uuid.uuid4().hex[:6]} - This is a test internal note"}
        
        response = requests.post(f"{BASE_URL}/api/admin/bookings/{self.booking_id}/notes", json=note_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to add note: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["note"] == note_data["note"]
        assert data["booking_id"] == self.booking_id
        assert "user_name" in data
        assert "created_at" in data
        print(f"✓ POST /api/admin/bookings/{self.booking_id}/notes - added note")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/bookings/{self.booking_id}/notes/{data['id']}", headers=self.headers)
        return data
    
    def test_update_booking_note(self):
        """Test PUT /api/admin/bookings/{id}/notes/{note_id} - update a note"""
        # First add a note
        note_data = {"note": f"TEST_Original_{uuid.uuid4().hex[:6]}"}
        add_response = requests.post(f"{BASE_URL}/api/admin/bookings/{self.booking_id}/notes", json=note_data, headers=self.headers)
        note_id = add_response.json()["id"]
        
        # Update the note
        update_data = {"note": f"TEST_Updated_{uuid.uuid4().hex[:6]}"}
        response = requests.put(f"{BASE_URL}/api/admin/bookings/{self.booking_id}/notes/{note_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to update note: {response.text}"
        
        data = response.json()
        assert data["note"] == update_data["note"]
        assert "updated_at" in data
        print(f"✓ PUT /api/admin/bookings/{self.booking_id}/notes/{note_id} - updated note")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/bookings/{self.booking_id}/notes/{note_id}", headers=self.headers)
    
    def test_delete_booking_note(self):
        """Test DELETE /api/admin/bookings/{id}/notes/{note_id} - delete a note"""
        # First add a note
        note_data = {"note": f"TEST_ToDelete_{uuid.uuid4().hex[:6]}"}
        add_response = requests.post(f"{BASE_URL}/api/admin/bookings/{self.booking_id}/notes", json=note_data, headers=self.headers)
        note_id = add_response.json()["id"]
        
        # Delete the note
        response = requests.delete(f"{BASE_URL}/api/admin/bookings/{self.booking_id}/notes/{note_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed to delete note: {response.text}"
        print(f"✓ DELETE /api/admin/bookings/{self.booking_id}/notes/{note_id} - deleted note")


class TestBookingHistory:
    """Test Booking History/Audit Trail"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_booking_history(self):
        """Test GET /api/admin/bookings/{id}/history - get audit trail"""
        # Get an existing booking
        bookings_response = requests.get(f"{BASE_URL}/api/admin/bookings", headers=self.headers)
        bookings = bookings_response.json()
        
        if not bookings:
            pytest.skip("No bookings available to test history")
        
        booking_id = bookings[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/admin/bookings/{booking_id}/history", headers=self.headers)
        assert response.status_code == 200, f"Failed to get history: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/bookings/{booking_id}/history - returned {len(data)} history entries")
        
        # Verify history entry structure if any exist
        if data:
            entry = data[0]
            assert "id" in entry
            assert "booking_id" in entry
            assert "action" in entry
            assert "description" in entry
            assert "user_name" in entry
            assert "created_at" in entry
            print(f"  - Latest action: {entry['action']} - {entry['description']}")
    
    def test_history_created_on_booking_creation(self):
        """Test that history is logged when booking is created"""
        # Create a new booking
        booking_data = {
            "customer_name": f"TEST_History_{uuid.uuid4().hex[:6]}",
            "customer_phone": "+44 20 1234 5678",
            "pickup_date": "2026-02-20",
            "pickup_time": "14:00",
            "pickup_location": "Gatwick Airport",
            "dropoff_location": "Brighton",
            "vehicle_category_id": "standard",
            "customer_price": 75.00,
            "driver_price": 50.00
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/bookings/manual", json=booking_data, headers=self.headers)
        assert create_response.status_code == 200, f"Failed to create booking: {create_response.text}"
        booking_id = create_response.json()["id"]
        
        # Check history
        history_response = requests.get(f"{BASE_URL}/api/admin/bookings/{booking_id}/history", headers=self.headers)
        assert history_response.status_code == 200
        
        history = history_response.json()
        assert len(history) >= 1, "No history entry created for new booking"
        
        # Find the 'created' action
        created_entries = [h for h in history if h["action"] == "created"]
        assert len(created_entries) >= 1, "No 'created' action in history"
        print(f"✓ History logged on booking creation: {created_entries[0]['description']}")


class TestBookingWithCustomerAccount:
    """Test booking creation with B2B customer account"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_booking_with_customer_account(self):
        """Test creating a booking linked to a B2B customer account"""
        # First create a customer account
        customer_data = {
            "company_name": f"TEST_B2B_{uuid.uuid4().hex[:6]}",
            "contact_person": "B2B Contact",
            "email": f"b2b_{uuid.uuid4().hex[:6]}@company.com",
            "phone": "+44 20 7777 8888"
        }
        customer_response = requests.post(f"{BASE_URL}/api/admin/customers", json=customer_data, headers=self.headers)
        assert customer_response.status_code == 200
        customer_id = customer_response.json()["id"]
        
        # Create a booking linked to this customer account
        booking_data = {
            "customer_account_id": customer_id,
            "customer_name": customer_data["contact_person"],
            "customer_email": customer_data["email"],
            "customer_phone": customer_data["phone"],
            "pickup_date": "2026-02-25",
            "pickup_time": "09:00",
            "pickup_location": "London City Airport",
            "dropoff_location": "Canary Wharf",
            "vehicle_category_id": "executive",
            "customer_price": 45.00,
            "driver_price": 30.00
        }
        
        booking_response = requests.post(f"{BASE_URL}/api/admin/bookings/manual", json=booking_data, headers=self.headers)
        assert booking_response.status_code == 200, f"Failed to create booking: {booking_response.text}"
        
        booking = booking_response.json()
        assert booking["customer_account_id"] == customer_id
        assert booking["customer_account_name"] == customer_data["company_name"]
        print(f"✓ Created booking with B2B customer account: {customer_data['company_name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/customers/{customer_id}", headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
