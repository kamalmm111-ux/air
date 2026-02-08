"""
Test suite for P0/P1 features:
- Customer Review Page
- Admin/Fleet Ratings APIs
- PDF Invoice Generation
- Email automation workflow
"""

import pytest
import requests
import os
import sys

# Add backend to path for email_service import
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://aircab-booking.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@aircabio.com"
ADMIN_PASSWORD = "Aircabio@2024!"


class TestCustomerReviewAPI:
    """Test customer review/rating endpoints"""
    
    def test_customer_tracking_returns_booking_data(self):
        """Test GET /api/customer/tracking/{booking_ref} returns booking data"""
        # Test with known completed booking
        response = requests.get(f"{BASE_URL}/api/customer/tracking/ACD853F5")
        assert response.status_code == 200
        
        data = response.json()
        assert "booking" in data
        assert data["booking"]["booking_ref"] == "ACD853F5"
        assert data["booking"]["status"] == "completed"
        print(f"PASS: Customer tracking returns booking data for ACD853F5")
    
    def test_customer_tracking_returns_rating_for_rated_booking(self):
        """Test that rated booking shows customer_rating"""
        response = requests.get(f"{BASE_URL}/api/customer/tracking/ACD853F5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["booking"]["customer_rating"] == 5
        print(f"PASS: Rated booking shows customer_rating=5")
    
    def test_customer_tracking_returns_null_rating_for_unrated_booking(self):
        """Test that unrated booking shows null customer_rating"""
        response = requests.get(f"{BASE_URL}/api/customer/tracking/AC66EBA4")
        assert response.status_code == 200
        
        data = response.json()
        assert data["booking"]["customer_rating"] is None
        print(f"PASS: Unrated booking shows customer_rating=None")
    
    def test_customer_tracking_404_for_invalid_booking(self):
        """Test 404 for invalid booking reference"""
        response = requests.get(f"{BASE_URL}/api/customer/tracking/INVALID123")
        assert response.status_code == 404
        print(f"PASS: Invalid booking returns 404")
    
    def test_customer_rating_400_for_already_rated(self):
        """Test that already rated booking returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/customer/rating/ACD853F5",
            json={"rating": 4, "feedback": "Test"}
        )
        assert response.status_code == 400
        assert "already rated" in response.json().get("detail", "").lower()
        print(f"PASS: Already rated booking returns 400")
    
    def test_customer_rating_400_for_non_completed_booking(self):
        """Test that non-completed booking returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/customer/rating/AC58EB58",  # assigned status
            json={"rating": 4, "feedback": "Test"}
        )
        assert response.status_code == 400
        assert "completed" in response.json().get("detail", "").lower()
        print(f"PASS: Non-completed booking returns 400")


class TestAdminRatingsAPI:
    """Test admin ratings endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_admin_ratings_summary(self, admin_token):
        """Test GET /api/admin/ratings/summary returns proper statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ratings/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_ratings" in data
        assert "average_rating" in data
        assert "rating_distribution" in data
        assert "ratings_with_comments" in data
        
        # Verify distribution structure
        dist = data["rating_distribution"]
        assert all(str(i) in dist for i in range(1, 6))
        
        print(f"PASS: Admin ratings summary - Total: {data['total_ratings']}, Avg: {data['average_rating']}")
    
    def test_admin_ratings_list(self, admin_token):
        """Test GET /api/admin/ratings returns list of ratings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ratings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            rating = data[0]
            assert "booking_ref" in rating
            assert "stars" in rating
            assert "driver_name" in rating
            print(f"PASS: Admin ratings list - Found {len(data)} ratings")
        else:
            print(f"PASS: Admin ratings list - Empty (no ratings yet)")
    
    def test_admin_ratings_requires_auth(self):
        """Test that admin ratings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/ratings/summary")
        assert response.status_code == 401
        print(f"PASS: Admin ratings requires authentication")


class TestFleetRatingsAPI:
    """Test fleet ratings endpoints"""
    
    @pytest.fixture
    def fleet_token(self):
        """Get fleet authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/fleet/login",
            json={"email": "fleet1@aircabio.com", "password": "fleeta2f7993d"}
        )
        if response.status_code != 200:
            pytest.skip("Fleet login failed - may need password reset")
        return response.json()["access_token"]
    
    def test_fleet_ratings_summary(self, fleet_token):
        """Test GET /api/fleet/ratings/summary returns proper statistics"""
        response = requests.get(
            f"{BASE_URL}/api/fleet/ratings/summary",
            headers={"Authorization": f"Bearer {fleet_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_ratings" in data
        assert "average_rating" in data
        assert "rating_distribution" in data
        assert "top_drivers" in data
        
        print(f"PASS: Fleet ratings summary - Total: {data['total_ratings']}, Avg: {data['average_rating']}")
    
    def test_fleet_ratings_requires_fleet_auth(self):
        """Test that fleet ratings requires fleet authentication"""
        response = requests.get(f"{BASE_URL}/api/fleet/ratings/summary")
        assert response.status_code == 401
        print(f"PASS: Fleet ratings requires authentication")


class TestPDFInvoiceGeneration:
    """Test PDF invoice generation"""
    
    def test_generate_invoice_pdf(self):
        """Test that generate_invoice_pdf creates valid PDF"""
        from email_service import generate_invoice_pdf
        
        test_booking = {
            "booking_ref": "TEST123",
            "customer_name": "John Doe",
            "customer_email": "john@example.com",
            "customer_phone": "+44 123 456 7890",
            "pickup_date": "2026-02-15",
            "pickup_time": "10:00",
            "pickup_location": "Heathrow Airport Terminal 5",
            "dropoff_location": "Central London",
            "vehicle_name": "Executive",
            "passengers": 2,
            "customer_price": 85.00,
            "currency": "GBP",
            "payment_status": "paid",
            "assigned_driver_name": "James Smith"
        }
        
        pdf_bytes = generate_invoice_pdf(test_booking)
        
        # Verify it's a valid PDF (starts with %PDF)
        assert pdf_bytes[:4] == b'%PDF'
        assert len(pdf_bytes) > 1000  # Should be at least 1KB
        
        print(f"PASS: PDF invoice generated - Size: {len(pdf_bytes)} bytes")
    
    def test_generate_invoice_pdf_with_child_seats(self):
        """Test PDF generation with child seats extras"""
        from email_service import generate_invoice_pdf
        
        test_booking = {
            "booking_ref": "TEST456",
            "customer_name": "Jane Smith",
            "customer_email": "jane@example.com",
            "customer_phone": "+44 987 654 3210",
            "pickup_date": "2026-03-01",
            "pickup_time": "08:00",
            "pickup_location": "Gatwick Airport",
            "dropoff_location": "Brighton",
            "vehicle_name": "Standard",
            "passengers": 3,
            "customer_price": 65.00,
            "currency": "GBP",
            "payment_status": "pending",
            "child_seats": [
                {"type": "Infant Seat", "quantity": 1, "price": 10.00},
                {"type": "Booster Seat", "quantity": 2, "price": 8.00}
            ]
        }
        
        pdf_bytes = generate_invoice_pdf(test_booking)
        
        assert pdf_bytes[:4] == b'%PDF'
        assert len(pdf_bytes) > 1000
        
        print(f"PASS: PDF invoice with child seats generated - Size: {len(pdf_bytes)} bytes")
    
    def test_generate_invoice_pdf_different_currencies(self):
        """Test PDF generation with different currencies"""
        from email_service import generate_invoice_pdf
        
        for currency, symbol in [("GBP", "£"), ("EUR", "€"), ("USD", "$")]:
            test_booking = {
                "booking_ref": f"TEST{currency}",
                "customer_name": "Test User",
                "pickup_date": "2026-02-20",
                "pickup_time": "12:00",
                "pickup_location": "Airport",
                "dropoff_location": "City",
                "vehicle_name": "Standard",
                "passengers": 1,
                "customer_price": 50.00,
                "currency": currency,
                "payment_status": "paid"
            }
            
            pdf_bytes = generate_invoice_pdf(test_booking)
            assert pdf_bytes[:4] == b'%PDF'
            print(f"PASS: PDF invoice generated for {currency}")


class TestEmailServiceFunctions:
    """Test email service functions exist and are callable"""
    
    def test_send_completion_with_invoice_exists(self):
        """Test that send_completion_with_invoice function exists"""
        from email_service import send_completion_with_invoice
        assert callable(send_completion_with_invoice)
        print(f"PASS: send_completion_with_invoice function exists")
    
    def test_send_review_invitation_exists(self):
        """Test that send_review_invitation function exists"""
        from email_service import send_review_invitation
        assert callable(send_review_invitation)
        print(f"PASS: send_review_invitation function exists")
    
    def test_generate_invoice_pdf_exists(self):
        """Test that generate_invoice_pdf function exists"""
        from email_service import generate_invoice_pdf
        assert callable(generate_invoice_pdf)
        print(f"PASS: generate_invoice_pdf function exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
