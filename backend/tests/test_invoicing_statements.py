"""
Test Suite for Invoicing & Statements Feature
- Driver Statements
- Fleet Statements
- Customer Invoices
- Custom Invoices
- Invoice Amendments
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "Aircabio@2024!"


class TestInvoicingStatements:
    """Test suite for invoicing and statements functionality"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")

    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Return headers with auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }

    # ==================== GET INVOICES ====================
    def test_get_all_invoices(self, auth_headers):
        """Test GET /api/invoices returns list of invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/invoices - Found {len(data)} invoices")

    def test_get_invoice_by_id(self, auth_headers):
        """Test GET /api/invoices/{invoice_id}"""
        # First get list of invoices
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        if response.status_code == 200 and len(response.json()) > 0:
            invoice_id = response.json()[0]["id"]
            detail_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
            assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
            invoice = detail_response.json()
            assert "invoice_number" in invoice
            print(f"PASS: GET /api/invoices/{invoice_id} - Invoice #{invoice.get('invoice_number')}")
        else:
            print("SKIP: No invoices found to test single get")

    def test_get_invoice_not_found(self, auth_headers):
        """Test GET /api/invoices/{invoice_id} with invalid ID returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/invoices/{fake_id}", headers=auth_headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: GET /api/invoices/{fake_id} - Returns 404 for non-existent invoice")

    # ==================== GET DRIVERS ====================
    def test_get_drivers(self, auth_headers):
        """Test GET /api/drivers - required for driver statement generation"""
        response = requests.get(f"{BASE_URL}/api/drivers", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/drivers - Found {len(data)} drivers")
        return data

    # ==================== GET FLEETS ====================
    def test_get_fleets(self, auth_headers):
        """Test GET /api/fleets - required for fleet statement generation"""
        response = requests.get(f"{BASE_URL}/api/fleets", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/fleets - Found {len(data)} fleets")
        return data

    # ==================== GET CUSTOMER ACCOUNTS ====================
    def test_get_customer_accounts(self, auth_headers):
        """Test GET /api/admin/customers - required for customer invoice generation"""
        response = requests.get(f"{BASE_URL}/api/admin/customers", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/admin/customers - Found {len(data)} customer accounts")
        return data

    # ==================== DRIVER STATEMENT SUMMARY ====================
    def test_driver_statement_summary(self, auth_headers):
        """Test GET /api/statements/driver/{driver_id}/summary"""
        # Get drivers first
        drivers_response = requests.get(f"{BASE_URL}/api/drivers", headers=auth_headers)
        if drivers_response.status_code != 200:
            pytest.skip("Could not fetch drivers")
        
        drivers = drivers_response.json()
        if len(drivers) == 0:
            pytest.skip("No drivers found to test summary")
        
        driver_id = drivers[0]["id"]
        date_from = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        date_to = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/statements/driver/{driver_id}/summary",
            params={"date_from": date_from, "date_to": date_to},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "driver" in data, "Response should contain driver info"
        assert "summary" in data, "Response should contain summary"
        print(f"PASS: GET /api/statements/driver/{driver_id}/summary - Driver: {data.get('driver', {}).get('name')}")

    # ==================== DRIVER STATEMENT GENERATION ====================
    def test_driver_statement_generate_no_jobs(self, auth_headers):
        """Test POST /api/statements/driver/generate with no completed jobs"""
        drivers_response = requests.get(f"{BASE_URL}/api/drivers", headers=auth_headers)
        if drivers_response.status_code != 200 or len(drivers_response.json()) == 0:
            pytest.skip("No drivers found")
        
        driver_id = drivers_response.json()[0]["id"]
        # Use future dates where no jobs exist
        date_from = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        date_to = (datetime.now() + timedelta(days=400)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/statements/driver/generate",
            params={"driver_id": driver_id, "date_from": date_from, "date_to": date_to},
            headers=auth_headers
        )
        
        # Should return 400 when no jobs found
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: POST /api/statements/driver/generate - Returns 400 when no completed jobs")

    # ==================== FLEET STATEMENT SUMMARY ====================
    def test_fleet_statement_summary(self, auth_headers):
        """Test GET /api/statements/fleet/{fleet_id}/summary"""
        fleets_response = requests.get(f"{BASE_URL}/api/fleets", headers=auth_headers)
        if fleets_response.status_code != 200:
            pytest.skip("Could not fetch fleets")
        
        fleets = fleets_response.json()
        if len(fleets) == 0:
            pytest.skip("No fleets found to test summary")
        
        fleet_id = fleets[0]["id"]
        date_from = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        date_to = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/statements/fleet/{fleet_id}/summary",
            params={"date_from": date_from, "date_to": date_to},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "fleet" in data, "Response should contain fleet info"
        assert "summary" in data, "Response should contain summary"
        print(f"PASS: GET /api/statements/fleet/{fleet_id}/summary - Fleet: {data.get('fleet', {}).get('name')}")

    # ==================== FLEET STATEMENT GENERATION ====================
    def test_fleet_statement_generate_no_jobs(self, auth_headers):
        """Test POST /api/statements/fleet/generate with no completed jobs"""
        fleets_response = requests.get(f"{BASE_URL}/api/fleets", headers=auth_headers)
        if fleets_response.status_code != 200 or len(fleets_response.json()) == 0:
            pytest.skip("No fleets found")
        
        fleet_id = fleets_response.json()[0]["id"]
        # Use future dates where no jobs exist
        date_from = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        date_to = (datetime.now() + timedelta(days=400)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/statements/fleet/generate",
            params={"fleet_id": fleet_id, "date_from": date_from, "date_to": date_to},
            headers=auth_headers
        )
        
        # Should return 400 when no jobs found
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: POST /api/statements/fleet/generate - Returns 400 when no completed jobs")

    # ==================== CUSTOMER INVOICE GENERATION ====================
    def test_customer_invoice_generate_no_jobs(self, auth_headers):
        """Test POST /api/statements/customer/generate with no completed jobs"""
        customers_response = requests.get(f"{BASE_URL}/api/admin/customers", headers=auth_headers)
        if customers_response.status_code != 200 or len(customers_response.json()) == 0:
            pytest.skip("No customer accounts found")
        
        customer_id = customers_response.json()[0]["id"]
        # Use future dates where no jobs exist
        date_from = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        date_to = (datetime.now() + timedelta(days=400)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/statements/customer/generate",
            params={"customer_id": customer_id, "date_from": date_from, "date_to": date_to},
            headers=auth_headers
        )
        
        # Should return 400 when no jobs found
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: POST /api/statements/customer/generate - Returns 400 when no completed bookings")

    def test_customer_invoice_generate_not_found(self, auth_headers):
        """Test POST /api/statements/customer/generate with non-existent customer"""
        fake_id = str(uuid.uuid4())
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        date_to = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/statements/customer/generate",
            params={"customer_id": fake_id, "date_from": date_from, "date_to": date_to},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: POST /api/statements/customer/generate - Returns 404 for non-existent customer")

    # ==================== CUSTOM INVOICE CREATION ====================
    def test_create_custom_invoice_success(self, auth_headers):
        """Test POST /api/invoices/custom creates custom invoice"""
        payload = {
            "invoice_type": "custom",
            "entity_name": "TEST_Custom Client Corp",
            "entity_email": "test_custom@example.com",
            "entity_phone": "+44 7700 900123",
            "entity_address": "123 Test Street, London",
            "line_items": [
                {"description": "Consulting Service", "quantity": 2, "unit_price": 150.00},
                {"description": "Airport Transfer VIP", "quantity": 1, "unit_price": 85.00}
            ],
            "tax_rate": 20.0,
            "due_days": 30,
            "notes": "TEST custom invoice - please delete"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/custom", json=payload, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "invoice_id" in data, "Response should contain invoice_id"
        assert "invoice_number" in data, "Response should contain invoice_number"
        assert "total" in data, "Response should contain total"
        
        # Verify total calculation: (2*150 + 1*85) * 1.20 = 385 * 1.20 = 462
        expected_subtotal = 2*150 + 85
        expected_total = expected_subtotal * 1.20
        assert data["total"] == expected_total, f"Expected total {expected_total}, got {data['total']}"
        
        print(f"PASS: POST /api/invoices/custom - Created invoice #{data['invoice_number']} with total £{data['total']}")
        return data["invoice_id"]

    def test_create_custom_invoice_missing_fields(self, auth_headers):
        """Test POST /api/invoices/custom with missing required fields"""
        payload = {
            "invoice_type": "custom",
            # Missing entity_name and entity_email
            "line_items": [{"description": "Test", "quantity": 1, "unit_price": 100}]
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/custom", json=payload, headers=auth_headers)
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("PASS: POST /api/invoices/custom - Returns 422 for missing required fields")

    def test_create_custom_invoice_empty_line_items(self, auth_headers):
        """Test POST /api/invoices/custom with empty line items"""
        payload = {
            "invoice_type": "custom",
            "entity_name": "TEST Empty Items Corp",
            "entity_email": "test_empty@example.com",
            "line_items": [],
            "tax_rate": 0,
            "due_days": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/custom", json=payload, headers=auth_headers)
        
        # Should succeed with 0 total
        if response.status_code == 200:
            data = response.json()
            assert data["total"] == 0, f"Expected total 0, got {data['total']}"
            print("PASS: POST /api/invoices/custom - Creates invoice with empty line items (total: 0)")
        elif response.status_code == 422:
            print("PASS: POST /api/invoices/custom - Validates non-empty line items")

    # ==================== INVOICE AMENDMENTS ====================
    def test_invoice_amend_success(self, auth_headers):
        """Test POST /api/invoices/{invoice_id}/amend amends an invoice"""
        # First create a custom invoice to amend
        create_payload = {
            "invoice_type": "custom",
            "entity_name": "TEST_Amendment Test Corp",
            "entity_email": "test_amend@example.com",
            "line_items": [{"description": "Original Service", "quantity": 1, "unit_price": 100.00}],
            "tax_rate": 0,
            "due_days": 30
        }
        
        create_response = requests.post(f"{BASE_URL}/api/invoices/custom", json=create_payload, headers=auth_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create invoice to amend")
        
        invoice_id = create_response.json()["invoice_id"]
        
        # Amend the invoice
        amend_payload = {
            "line_items": [
                {"description": "Updated Service", "quantity": 2, "unit_price": 75.00}
            ],
            "adjustment_reason": "Customer requested additional service",
            "notes": "Amendment test - updated line items"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/{invoice_id}/amend", json=amend_payload, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "amendment_id" in data, "Response should contain amendment_id"
        assert data["new_total"] == 150.0, f"Expected new total 150, got {data['new_total']}"
        print(f"PASS: POST /api/invoices/{invoice_id}/amend - Amendment created successfully")

    def test_invoice_amend_not_found(self, auth_headers):
        """Test POST /api/invoices/{invoice_id}/amend with non-existent invoice"""
        fake_id = str(uuid.uuid4())
        payload = {
            "adjustment_reason": "Test amendment"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices/{fake_id}/amend", json=payload, headers=auth_headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: POST /api/invoices/{fake_id}/amend - Returns 404 for non-existent invoice")

    # ==================== GET INVOICE AMENDMENTS ====================
    def test_get_invoice_amendments(self, auth_headers):
        """Test GET /api/invoices/{invoice_id}/amendments"""
        # Get an existing invoice
        invoices_response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        if invoices_response.status_code != 200 or len(invoices_response.json()) == 0:
            pytest.skip("No invoices found")
        
        invoice_id = invoices_response.json()[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}/amendments", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/invoices/{invoice_id}/amendments - Found {len(data)} amendments")

    # ==================== INVOICE STATUS OPERATIONS ====================
    def test_invoice_approve(self, auth_headers):
        """Test POST /api/invoices/{invoice_id}/approve"""
        # Create a draft invoice first
        create_payload = {
            "invoice_type": "custom",
            "entity_name": "TEST_Approve Test Corp",
            "entity_email": "test_approve@example.com",
            "line_items": [{"description": "Service", "quantity": 1, "unit_price": 200.00}],
            "tax_rate": 0,
            "due_days": 30
        }
        
        create_response = requests.post(f"{BASE_URL}/api/invoices/custom", json=create_payload, headers=auth_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create invoice to approve")
        
        invoice_id = create_response.json()["invoice_id"]
        
        response = requests.post(f"{BASE_URL}/api/invoices/{invoice_id}/approve", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: POST /api/invoices/{invoice_id}/approve - Invoice approved")

    def test_invoice_issue(self, auth_headers):
        """Test POST /api/invoices/{invoice_id}/issue"""
        # Create a draft invoice first
        create_payload = {
            "invoice_type": "custom",
            "entity_name": "TEST_Issue Test Corp",
            "entity_email": "test_issue@example.com",
            "line_items": [{"description": "Service", "quantity": 1, "unit_price": 150.00}],
            "tax_rate": 0,
            "due_days": 30
        }
        
        create_response = requests.post(f"{BASE_URL}/api/invoices/custom", json=create_payload, headers=auth_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create invoice to issue")
        
        invoice_id = create_response.json()["invoice_id"]
        
        response = requests.post(f"{BASE_URL}/api/invoices/{invoice_id}/issue", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: POST /api/invoices/{invoice_id}/issue - Invoice issued")

    def test_invoice_mark_paid(self, auth_headers):
        """Test POST /api/invoices/{invoice_id}/mark-paid"""
        # Create and issue an invoice first
        create_payload = {
            "invoice_type": "custom",
            "entity_name": "TEST_MarkPaid Test Corp",
            "entity_email": "test_paid@example.com",
            "line_items": [{"description": "Service", "quantity": 1, "unit_price": 300.00}],
            "tax_rate": 0,
            "due_days": 30
        }
        
        create_response = requests.post(f"{BASE_URL}/api/invoices/custom", json=create_payload, headers=auth_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create invoice")
        
        invoice_id = create_response.json()["invoice_id"]
        
        # Issue the invoice first
        requests.post(f"{BASE_URL}/api/invoices/{invoice_id}/issue", headers=auth_headers)
        
        # Mark as paid
        response = requests.post(f"{BASE_URL}/api/invoices/{invoice_id}/mark-paid", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: POST /api/invoices/{invoice_id}/mark-paid - Invoice marked as paid")

    # ==================== CLEANUP TEST DATA ====================
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_test_data(self, auth_headers):
        """Cleanup TEST_ prefixed invoices after tests complete"""
        yield
        # Cleanup: Delete test invoices
        try:
            invoices_response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
            if invoices_response.status_code == 200:
                for inv in invoices_response.json():
                    if inv.get("entity_name", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/invoices/{inv['id']}", headers=auth_headers)
                print("Cleanup: Deleted TEST_ prefixed invoices")
        except Exception as e:
            print(f"Cleanup warning: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
