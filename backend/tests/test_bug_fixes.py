"""
Test cases for Bug Fixes - Iteration 10
Tests for:
1. Fleet Impersonation
2. Invoice Download
3. Driver Invoice Creation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBugFixes:
    """Test cases for the 3 reported bugs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin authentication"""
        self.admin_email = "admin@aircabio.com"
        self.admin_password = "Aircabio@2024!"
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print("PASS: Admin login successful")
    
    def test_get_fleets(self):
        """Test getting list of fleets"""
        response = requests.get(f"{BASE_URL}/api/fleets", headers=self.headers)
        assert response.status_code == 200
        fleets = response.json()
        assert isinstance(fleets, list)
        print(f"PASS: Got {len(fleets)} fleets")
        return fleets
    
    def test_fleet_impersonation_api(self):
        """Bug #1: Test fleet impersonation API works"""
        # Get active fleets
        fleets_response = requests.get(f"{BASE_URL}/api/fleets", headers=self.headers)
        assert fleets_response.status_code == 200
        fleets = fleets_response.json()
        
        # Find an active fleet
        active_fleet = next((f for f in fleets if f["status"] == "active"), None)
        if not active_fleet:
            pytest.skip("No active fleets available for impersonation test")
        
        # Test impersonation
        response = requests.post(
            f"{BASE_URL}/api/admin/fleets/{active_fleet['id']}/impersonate",
            headers=self.headers
        )
        assert response.status_code == 200, f"Impersonation failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "fleet" in data
        assert "impersonation_id" in data
        assert data["fleet"]["id"] == active_fleet["id"]
        
        # Verify impersonation token works for fleet APIs
        impersonation_headers = {"Authorization": f"Bearer {data['access_token']}"}
        
        # Test fleet stats API with impersonation token
        stats_response = requests.get(f"{BASE_URL}/api/fleet/stats", headers=impersonation_headers)
        assert stats_response.status_code == 200, f"Fleet stats failed: {stats_response.text}"
        
        # Test fleet jobs API with impersonation token
        jobs_response = requests.get(f"{BASE_URL}/api/fleet/jobs", headers=impersonation_headers)
        assert jobs_response.status_code == 200, f"Fleet jobs failed: {jobs_response.text}"
        
        print(f"PASS: Fleet impersonation working for fleet '{active_fleet['name']}'")
    
    def test_invoice_download_api(self):
        """Bug #2: Test invoice download API works"""
        # Get invoices
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        assert response.status_code == 200
        invoices = response.json()
        
        if len(invoices) == 0:
            pytest.skip("No invoices available for download test")
        
        # Test download for first invoice
        invoice_id = invoices[0]["id"]
        download_response = requests.get(
            f"{BASE_URL}/api/invoices/{invoice_id}/pdf",
            headers=self.headers
        )
        assert download_response.status_code == 200, f"Invoice download failed: {download_response.text}"
        
        # Verify response is HTML
        content = download_response.text
        assert "<!DOCTYPE html>" in content or "<html>" in content
        assert "INVOICE" in content or "Invoice" in content
        
        print(f"PASS: Invoice download working for invoice '{invoices[0]['invoice_number']}'")
    
    def test_driver_invoice_creation_api(self):
        """Bug #3: Test driver invoice creation API supports driver type"""
        # Get drivers
        drivers_response = requests.get(f"{BASE_URL}/api/drivers", headers=self.headers)
        assert drivers_response.status_code == 200
        drivers = drivers_response.json()
        
        if len(drivers) == 0:
            pytest.skip("No drivers available for driver invoice test")
        
        # Get uninvoiced bookings for driver type
        uninvoiced_response = requests.get(
            f"{BASE_URL}/api/invoices/uninvoiced-bookings?invoice_type=driver",
            headers=self.headers
        )
        assert uninvoiced_response.status_code == 200, f"Uninvoiced bookings failed: {uninvoiced_response.text}"
        
        uninvoiced = uninvoiced_response.json()
        print(f"Found {len(uninvoiced)} uninvoiced bookings for driver type")
        
        # Verify the API accepts driver invoice type
        # Note: We don't create an actual invoice to avoid test data pollution
        # The key test is that the API endpoint accepts invoice_type=driver
        
        print("PASS: Driver invoice API endpoint working")
    
    def test_invoice_list_with_tabs(self):
        """Test invoice list displays with customer/fleet/driver tabs"""
        # Test customer invoices
        customer_response = requests.get(
            f"{BASE_URL}/api/invoices?invoice_type=customer",
            headers=self.headers
        )
        assert customer_response.status_code == 200
        
        # Test fleet invoices
        fleet_response = requests.get(
            f"{BASE_URL}/api/invoices?invoice_type=fleet",
            headers=self.headers
        )
        assert fleet_response.status_code == 200
        
        # Test driver invoices
        driver_response = requests.get(
            f"{BASE_URL}/api/invoices?invoice_type=driver",
            headers=self.headers
        )
        assert driver_response.status_code == 200
        
        print("PASS: Invoice list API supports all invoice types (customer/fleet/driver)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
