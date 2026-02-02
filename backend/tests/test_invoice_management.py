"""
Invoice Management API Tests for Aircabio
Tests invoice CRUD, workflow (approve/issue/mark-paid), auto-generation, and uninvoiced bookings
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "admin123"
FLEET_EMAIL = "fleet1@aircabio.com"
FLEET_PASSWORD = "fleet123"


class TestInvoiceManagement:
    """Invoice Management API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin authentication failed: {response.status_code}")
        
    def get_fleet_token(self):
        """Get fleet authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": FLEET_EMAIL,
            "password": FLEET_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Fleet authentication failed: {response.status_code}")
    
    # ==================== GET INVOICES ====================
    
    def test_get_invoices_admin(self):
        """Test GET /api/invoices as admin - should return all invoices"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/invoices returned {len(data)} invoices")
        
    def test_get_invoices_fleet(self):
        """Test GET /api/invoices as fleet - should return only fleet's invoices"""
        token = self.get_fleet_token()
        response = self.session.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/invoices (fleet) returned {len(data)} invoices")
        
    def test_get_invoices_by_type(self):
        """Test GET /api/invoices with invoice_type filter"""
        token = self.get_admin_token()
        for inv_type in ["customer", "fleet", "driver"]:
            response = self.session.get(
                f"{BASE_URL}/api/invoices?invoice_type={inv_type}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200, f"Expected 200 for {inv_type}, got {response.status_code}"
            data = response.json()
            # All returned invoices should match the type
            for inv in data:
                assert inv.get("invoice_type") == inv_type, f"Invoice type mismatch: expected {inv_type}"
            print(f"PASS: GET /api/invoices?invoice_type={inv_type} returned {len(data)} invoices")
    
    # ==================== UNINVOICED BOOKINGS ====================
    
    def test_get_uninvoiced_bookings_customer(self):
        """Test GET /api/invoices/uninvoiced-bookings for customer type"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/invoices/uninvoiced-bookings?invoice_type=customer",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET uninvoiced-bookings (customer) returned {len(data)} bookings")
        
    def test_get_uninvoiced_bookings_fleet(self):
        """Test GET /api/invoices/uninvoiced-bookings for fleet type"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/invoices/uninvoiced-bookings?invoice_type=fleet",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET uninvoiced-bookings (fleet) returned {len(data)} bookings")
        
    def test_get_uninvoiced_bookings_driver(self):
        """Test GET /api/invoices/uninvoiced-bookings for driver type"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/invoices/uninvoiced-bookings?invoice_type=driver",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET uninvoiced-bookings (driver) returned {len(data)} bookings")
    
    # ==================== AUTO-GENERATE FLEET INVOICES ====================
    
    def test_auto_generate_fleet_invoices(self):
        """Test POST /api/invoices/auto-generate-fleet"""
        token = self.get_admin_token()
        response = self.session.post(
            f"{BASE_URL}/api/invoices/auto-generate-fleet",
            headers={"Authorization": f"Bearer {token}"},
            json={}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "period" in data, "Response should contain period"
        print(f"PASS: Auto-generate fleet invoices - {data.get('message')}")
        print(f"  Period: {data.get('period')}")
        if data.get("invoices"):
            for inv in data["invoices"]:
                print(f"  - {inv.get('fleet_name')}: {inv.get('invoice_number')} (£{inv.get('total')}, {inv.get('jobs_count')} jobs)")
    
    # ==================== INVOICE WORKFLOW ====================
    
    def test_invoice_workflow_approve_issue_paid(self):
        """Test full invoice workflow: create -> approve -> issue -> mark paid"""
        token = self.get_admin_token()
        
        # First, get uninvoiced bookings to create an invoice
        uninvoiced_resp = self.session.get(
            f"{BASE_URL}/api/invoices/uninvoiced-bookings?invoice_type=customer",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if uninvoiced_resp.status_code != 200:
            pytest.skip("Could not get uninvoiced bookings")
            
        uninvoiced = uninvoiced_resp.json()
        
        if len(uninvoiced) == 0:
            # Try to find any existing invoice to test workflow
            invoices_resp = self.session.get(
                f"{BASE_URL}/api/invoices",
                headers={"Authorization": f"Bearer {token}"}
            )
            invoices = invoices_resp.json()
            
            # Find a draft or pending_approval invoice
            test_invoice = None
            for inv in invoices:
                if inv.get("status") in ["draft", "pending_approval"]:
                    test_invoice = inv
                    break
            
            if not test_invoice:
                print("SKIP: No uninvoiced bookings and no draft/pending invoices to test workflow")
                return
            
            invoice_id = test_invoice["id"]
            current_status = test_invoice["status"]
            print(f"Using existing invoice {test_invoice['invoice_number']} with status {current_status}")
        else:
            # Create a new invoice
            booking = uninvoiced[0]
            create_resp = self.session.post(
                f"{BASE_URL}/api/invoices/generate",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "invoice_type": "customer",
                    "entity_id": booking.get("customer_email") or booking.get("customer_name"),
                    "booking_ids": [booking["id"]],
                    "tax_rate": 20,
                    "payment_terms": "Net 14",
                    "notes": "Test invoice for workflow testing"
                }
            )
            
            if create_resp.status_code != 200:
                print(f"Could not create invoice: {create_resp.status_code} - {create_resp.text}")
                pytest.skip("Could not create test invoice")
                
            invoice = create_resp.json()
            invoice_id = invoice["id"]
            current_status = invoice["status"]
            print(f"Created invoice {invoice['invoice_number']} with status {current_status}")
        
        # Test approve (if status is draft or pending_approval)
        if current_status in ["draft", "pending_approval"]:
            approve_resp = self.session.post(
                f"{BASE_URL}/api/invoices/{invoice_id}/approve",
                headers={"Authorization": f"Bearer {token}"},
                json={}
            )
            assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.status_code} - {approve_resp.text}"
            approved_invoice = approve_resp.json()
            assert approved_invoice["status"] == "approved", f"Expected approved status, got {approved_invoice['status']}"
            print(f"PASS: Invoice approved - status is now {approved_invoice['status']}")
            current_status = "approved"
        
        # Test issue (if status is draft or approved)
        if current_status in ["draft", "approved"]:
            issue_resp = self.session.post(
                f"{BASE_URL}/api/invoices/{invoice_id}/issue",
                headers={"Authorization": f"Bearer {token}"},
                json={}
            )
            assert issue_resp.status_code == 200, f"Issue failed: {issue_resp.status_code} - {issue_resp.text}"
            issued_invoice = issue_resp.json()
            assert issued_invoice["status"] == "issued", f"Expected issued status, got {issued_invoice['status']}"
            print(f"PASS: Invoice issued - status is now {issued_invoice['status']}")
            current_status = "issued"
        
        # Test mark paid (if status is issued)
        if current_status == "issued":
            paid_resp = self.session.post(
                f"{BASE_URL}/api/invoices/{invoice_id}/mark-paid",
                headers={"Authorization": f"Bearer {token}"},
                json={}
            )
            assert paid_resp.status_code == 200, f"Mark paid failed: {paid_resp.status_code} - {paid_resp.text}"
            paid_invoice = paid_resp.json()
            assert paid_invoice["status"] == "paid", f"Expected paid status, got {paid_invoice['status']}"
            assert paid_invoice.get("paid_date") is not None, "paid_date should be set"
            print(f"PASS: Invoice marked as paid - status is now {paid_invoice['status']}, paid_date: {paid_invoice.get('paid_date')}")
    
    # ==================== INVOICE GENERATION ====================
    
    def test_generate_customer_invoice(self):
        """Test POST /api/invoices/generate for customer invoice"""
        token = self.get_admin_token()
        
        # Get uninvoiced customer bookings
        uninvoiced_resp = self.session.get(
            f"{BASE_URL}/api/invoices/uninvoiced-bookings?invoice_type=customer",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if uninvoiced_resp.status_code != 200:
            pytest.skip("Could not get uninvoiced bookings")
            
        uninvoiced = uninvoiced_resp.json()
        
        if len(uninvoiced) == 0:
            print("SKIP: No uninvoiced customer bookings available")
            return
        
        booking = uninvoiced[0]
        entity_id = booking.get("customer_email") or booking.get("customer_name")
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/generate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "invoice_type": "customer",
                "entity_id": entity_id,
                "booking_ids": [booking["id"]],
                "tax_rate": 20,
                "payment_terms": "Net 14",
                "notes": "Test customer invoice"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        invoice = response.json()
        
        # Validate invoice structure
        assert "id" in invoice, "Invoice should have id"
        assert "invoice_number" in invoice, "Invoice should have invoice_number"
        assert invoice["invoice_type"] == "customer", "Invoice type should be customer"
        assert invoice["status"] == "draft", "New invoice should be draft"
        assert "subtotal" in invoice, "Invoice should have subtotal"
        assert "total" in invoice, "Invoice should have total"
        assert "line_items" in invoice, "Invoice should have line_items"
        
        print(f"PASS: Generated customer invoice {invoice['invoice_number']}")
        print(f"  Entity: {invoice.get('entity_name')}")
        print(f"  Subtotal: £{invoice.get('subtotal')}")
        print(f"  Tax: £{invoice.get('tax', 0)}")
        print(f"  Total: £{invoice.get('total')}")
        print(f"  Line items: {len(invoice.get('line_items', []))}")
        
        # Cleanup - delete the test invoice
        delete_resp = self.session.delete(
            f"{BASE_URL}/api/invoices/{invoice['id']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if delete_resp.status_code == 200:
            print(f"  Cleaned up test invoice")
    
    def test_generate_fleet_invoice(self):
        """Test POST /api/invoices/generate for fleet invoice"""
        token = self.get_admin_token()
        
        # Get fleets
        fleets_resp = self.session.get(
            f"{BASE_URL}/api/fleets",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if fleets_resp.status_code != 200:
            pytest.skip("Could not get fleets")
            
        fleets = fleets_resp.json()
        active_fleets = [f for f in fleets if f.get("status") == "active"]
        
        if len(active_fleets) == 0:
            print("SKIP: No active fleets available")
            return
        
        fleet = active_fleets[0]
        
        # Get uninvoiced fleet bookings
        uninvoiced_resp = self.session.get(
            f"{BASE_URL}/api/invoices/uninvoiced-bookings?invoice_type=fleet&entity_id={fleet['id']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if uninvoiced_resp.status_code != 200:
            pytest.skip("Could not get uninvoiced bookings")
            
        uninvoiced = uninvoiced_resp.json()
        
        if len(uninvoiced) == 0:
            print(f"SKIP: No uninvoiced bookings for fleet {fleet['name']}")
            return
        
        response = self.session.post(
            f"{BASE_URL}/api/invoices/generate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "invoice_type": "fleet",
                "entity_id": fleet["id"],
                "booking_ids": [uninvoiced[0]["id"]],
                "tax_rate": 0,
                "payment_terms": fleet.get("payment_terms", "Net 14"),
                "notes": "Test fleet payout invoice"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        invoice = response.json()
        
        assert invoice["invoice_type"] == "fleet", "Invoice type should be fleet"
        assert invoice["entity_id"] == fleet["id"], "Entity ID should match fleet"
        
        print(f"PASS: Generated fleet invoice {invoice['invoice_number']}")
        print(f"  Fleet: {invoice.get('entity_name')}")
        print(f"  Subtotal: £{invoice.get('subtotal')}")
        print(f"  Commission: £{invoice.get('commission', 0)}")
        print(f"  Total (payout): £{invoice.get('total')}")
        
        # Cleanup
        delete_resp = self.session.delete(
            f"{BASE_URL}/api/invoices/{invoice['id']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if delete_resp.status_code == 200:
            print(f"  Cleaned up test invoice")
    
    # ==================== INVOICE UPDATE ====================
    
    def test_update_invoice(self):
        """Test PUT /api/invoices/{invoice_id}"""
        token = self.get_admin_token()
        
        # Get invoices
        invoices_resp = self.session.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if invoices_resp.status_code != 200:
            pytest.skip("Could not get invoices")
            
        invoices = invoices_resp.json()
        
        # Find a draft invoice to update
        draft_invoice = None
        for inv in invoices:
            if inv.get("status") == "draft":
                draft_invoice = inv
                break
        
        if not draft_invoice:
            print("SKIP: No draft invoices available to test update")
            return
        
        # Update the invoice
        response = self.session.put(
            f"{BASE_URL}/api/invoices/{draft_invoice['id']}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "notes": "Updated notes for testing",
                "payment_terms": "Net 30"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        updated = response.json()
        
        assert updated.get("notes") == "Updated notes for testing", "Notes should be updated"
        assert updated.get("payment_terms") == "Net 30", "Payment terms should be updated"
        
        print(f"PASS: Updated invoice {draft_invoice['invoice_number']}")
    
    # ==================== INVOICE DELETE ====================
    
    def test_delete_invoice(self):
        """Test DELETE /api/invoices/{invoice_id}"""
        token = self.get_admin_token()
        
        # First create an invoice to delete
        uninvoiced_resp = self.session.get(
            f"{BASE_URL}/api/invoices/uninvoiced-bookings?invoice_type=customer",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if uninvoiced_resp.status_code != 200 or len(uninvoiced_resp.json()) == 0:
            print("SKIP: No uninvoiced bookings to create test invoice for deletion")
            return
        
        uninvoiced = uninvoiced_resp.json()
        booking = uninvoiced[0]
        
        # Create invoice
        create_resp = self.session.post(
            f"{BASE_URL}/api/invoices/generate",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "invoice_type": "customer",
                "entity_id": booking.get("customer_email") or booking.get("customer_name"),
                "booking_ids": [booking["id"]],
                "tax_rate": 0,
                "payment_terms": "Net 7",
                "notes": "Test invoice for deletion"
            }
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test invoice")
        
        invoice = create_resp.json()
        
        # Delete the invoice
        response = self.session.delete(
            f"{BASE_URL}/api/invoices/{invoice['id']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion
        get_resp = self.session.get(
            f"{BASE_URL}/api/invoices/{invoice['id']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_resp.status_code == 404, "Deleted invoice should return 404"
        
        print(f"PASS: Deleted invoice {invoice['invoice_number']}")
    
    # ==================== INVOICE PDF ====================
    
    def test_invoice_pdf_endpoint(self):
        """Test GET /api/invoices/{invoice_id}/pdf"""
        token = self.get_admin_token()
        
        # Get invoices
        invoices_resp = self.session.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if invoices_resp.status_code != 200:
            pytest.skip("Could not get invoices")
            
        invoices = invoices_resp.json()
        
        if len(invoices) == 0:
            print("SKIP: No invoices available to test PDF")
            return
        
        invoice = invoices[0]
        
        # Note: The PDF endpoint returns HTML content, not actual PDF
        # This is expected based on the server.py implementation
        response = self.session.get(
            f"{BASE_URL}/api/invoices/{invoice['id']}/pdf",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type (should be HTML)
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML content, got {content_type}"
        
        # Check that HTML contains invoice info
        html = response.text
        assert invoice["invoice_number"] in html, "PDF should contain invoice number"
        
        print(f"PASS: PDF endpoint returns HTML for invoice {invoice['invoice_number']}")
    
    # ==================== FLEET ACCESS RESTRICTIONS ====================
    
    def test_fleet_cannot_approve_invoice(self):
        """Test that fleet admin cannot approve invoices"""
        admin_token = self.get_admin_token()
        fleet_token = self.get_fleet_token()
        
        # Get invoices
        invoices_resp = self.session.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if invoices_resp.status_code != 200:
            pytest.skip("Could not get invoices")
            
        invoices = invoices_resp.json()
        
        # Find a pending_approval invoice
        pending_invoice = None
        for inv in invoices:
            if inv.get("status") == "pending_approval":
                pending_invoice = inv
                break
        
        if not pending_invoice:
            print("SKIP: No pending_approval invoices to test fleet restriction")
            return
        
        # Try to approve as fleet
        response = self.session.post(
            f"{BASE_URL}/api/invoices/{pending_invoice['id']}/approve",
            headers={"Authorization": f"Bearer {fleet_token}"},
            json={}
        )
        
        # Should be forbidden (403) or unauthorized
        assert response.status_code in [401, 403], f"Fleet should not be able to approve: got {response.status_code}"
        print(f"PASS: Fleet cannot approve invoices (got {response.status_code})")
    
    def test_fleet_can_view_own_invoices(self):
        """Test that fleet can view their own invoices"""
        fleet_token = self.get_fleet_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        invoices = response.json()
        
        # All invoices should be fleet type for this fleet
        for inv in invoices:
            assert inv.get("invoice_type") == "fleet", "Fleet should only see fleet invoices"
        
        print(f"PASS: Fleet can view their own invoices ({len(invoices)} invoices)")
    
    def test_fleet_can_download_own_invoice_pdf(self):
        """Test that fleet can download PDF of their own invoices"""
        fleet_token = self.get_fleet_token()
        
        # Get fleet's invoices
        invoices_resp = self.session.get(
            f"{BASE_URL}/api/invoices",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        
        if invoices_resp.status_code != 200:
            pytest.skip("Could not get fleet invoices")
            
        invoices = invoices_resp.json()
        
        if len(invoices) == 0:
            print("SKIP: No invoices for fleet to test PDF download")
            return
        
        invoice = invoices[0]
        
        response = self.session.get(
            f"{BASE_URL}/api/invoices/{invoice['id']}/pdf",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: Fleet can download their own invoice PDF")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
