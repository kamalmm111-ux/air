"""
CMS Settings API Tests
Tests for website settings save and display functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCMSSettings:
    """Tests for CMS website settings functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@aircabio.com"
        self.admin_password = "Aircabio@2024!"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login and get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Admin login failed - skipping CMS tests")
    
    def test_public_website_settings_endpoint(self):
        """Test public /api/website-settings endpoint returns settings"""
        response = requests.get(f"{BASE_URL}/api/website-settings")
        assert response.status_code == 200
        
        data = response.json()
        # Verify required fields exist
        assert "site_name" in data
        assert "tagline" in data
        assert "contact_phone" in data
        assert "contact_email" in data
        assert "hero_title" in data
        assert "hero_subtitle" in data
        print(f"Public settings returned: site_name={data.get('site_name')}, tagline={data.get('tagline')}")
    
    def test_admin_website_settings_endpoint(self):
        """Test admin /api/admin/website-settings endpoint requires auth"""
        # Without auth should fail
        response = requests.get(f"{BASE_URL}/api/admin/website-settings")
        assert response.status_code == 401
        
        # With auth should succeed
        response = self.session.get(f"{BASE_URL}/api/admin/website-settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "site_name" in data
        print("Admin settings endpoint working correctly")
    
    def test_save_website_settings(self):
        """Test saving website settings via admin endpoint"""
        # Generate unique test values
        test_id = str(uuid.uuid4())[:8]
        test_phone = f"+44 TEST {test_id}"
        test_email = f"test-{test_id}@aircabio.com"
        test_tagline = f"TEST Tagline {test_id}"
        
        # Save settings
        response = self.session.post(f"{BASE_URL}/api/admin/website-settings", json={
            "contact_phone": test_phone,
            "contact_email": test_email,
            "tagline": test_tagline
        })
        assert response.status_code == 200
        assert response.json().get("message") == "Settings saved successfully"
        
        # Verify settings were saved via public endpoint
        response = requests.get(f"{BASE_URL}/api/website-settings")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("contact_phone") == test_phone
        assert data.get("contact_email") == test_email
        assert data.get("tagline") == test_tagline
        print(f"Settings saved and verified: phone={test_phone}")
    
    def test_save_hero_section_settings(self):
        """Test saving hero section settings (title, subtitle, background)"""
        test_id = str(uuid.uuid4())[:8]
        test_hero_title = f"TEST Hero Title {test_id}"
        test_hero_subtitle = f"TEST Hero Subtitle {test_id}"
        test_hero_bg = f"https://example.com/hero-{test_id}.jpg"
        test_hero_cta = f"Book Now {test_id}"
        
        # Save hero settings
        response = self.session.post(f"{BASE_URL}/api/admin/website-settings", json={
            "hero_title": test_hero_title,
            "hero_subtitle": test_hero_subtitle,
            "hero_background_url": test_hero_bg,
            "hero_cta_text": test_hero_cta
        })
        assert response.status_code == 200
        
        # Verify via public endpoint
        response = requests.get(f"{BASE_URL}/api/website-settings")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("hero_title") == test_hero_title
        assert data.get("hero_subtitle") == test_hero_subtitle
        assert data.get("hero_background_url") == test_hero_bg
        assert data.get("hero_cta_text") == test_hero_cta
        print(f"Hero settings saved: title={test_hero_title}")
    
    def test_save_social_media_settings(self):
        """Test saving social media URLs"""
        test_id = str(uuid.uuid4())[:8]
        test_facebook = f"https://facebook.com/test-{test_id}"
        test_instagram = f"https://instagram.com/test-{test_id}"
        test_twitter = f"https://twitter.com/test-{test_id}"
        
        response = self.session.post(f"{BASE_URL}/api/admin/website-settings", json={
            "facebook_url": test_facebook,
            "instagram_url": test_instagram,
            "twitter_url": test_twitter
        })
        assert response.status_code == 200
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/website-settings")
        data = response.json()
        assert data.get("facebook_url") == test_facebook
        assert data.get("instagram_url") == test_instagram
        assert data.get("twitter_url") == test_twitter
        print("Social media settings saved successfully")
    
    def test_save_contact_info_settings(self):
        """Test saving contact information (phone, email, address, whatsapp)"""
        test_id = str(uuid.uuid4())[:8]
        test_phone = f"+44 7890 {test_id}"
        test_email = f"contact-{test_id}@aircabio.com"
        test_address = f"Test Address {test_id}, London"
        test_whatsapp = f"+44789{test_id}"
        
        response = self.session.post(f"{BASE_URL}/api/admin/website-settings", json={
            "contact_phone": test_phone,
            "contact_email": test_email,
            "contact_address": test_address,
            "whatsapp_number": test_whatsapp
        })
        assert response.status_code == 200
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/website-settings")
        data = response.json()
        assert data.get("contact_phone") == test_phone
        assert data.get("contact_email") == test_email
        assert data.get("contact_address") == test_address
        assert data.get("whatsapp_number") == test_whatsapp
        print("Contact info settings saved successfully")
    
    def test_settings_persistence(self):
        """Test that settings persist across multiple requests"""
        test_id = str(uuid.uuid4())[:8]
        test_site_name = f"TestSite-{test_id}"
        
        # Save
        response = self.session.post(f"{BASE_URL}/api/admin/website-settings", json={
            "site_name": test_site_name
        })
        assert response.status_code == 200
        
        # Verify multiple times
        for i in range(3):
            response = requests.get(f"{BASE_URL}/api/website-settings")
            assert response.status_code == 200
            assert response.json().get("site_name") == test_site_name
        
        print("Settings persistence verified")
    
    def test_unauthorized_save_rejected(self):
        """Test that saving without auth is rejected"""
        response = requests.post(f"{BASE_URL}/api/admin/website-settings", json={
            "site_name": "Unauthorized Test"
        })
        assert response.status_code == 401
        print("Unauthorized save correctly rejected")
    
    @pytest.fixture(autouse=True, scope="class")
    def cleanup(self, request):
        """Restore original settings after all tests"""
        yield
        # Restore original settings
        try:
            session = requests.Session()
            session.headers.update({"Content-Type": "application/json"})
            response = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@aircabio.com",
                "password": "Aircabio@2024!"
            })
            if response.status_code == 200:
                token = response.json().get("access_token")
                session.headers.update({"Authorization": f"Bearer {token}"})
                session.post(f"{BASE_URL}/api/admin/website-settings", json={
                    "site_name": "Aircabio",
                    "tagline": "Premium Airport Transfers Worldwide",
                    "contact_phone": "+44 7890 123456",
                    "contact_email": "bookings@aircabio.com",
                    "hero_title": "Travel in Style & Comfort",
                    "hero_subtitle": "Book your premium airport transfer with Aircabio. Professional drivers, luxury vehicles, and guaranteed on-time service across the UK.",
                    "facebook_url": "https://facebook.com/aircabio",
                    "instagram_url": "https://instagram.com/aircabio",
                    "contact_address": "Unit B5, Pressworks, 36-38 Berry St, London",
                    "whatsapp_number": "+447890123456"
                })
                print("Original settings restored")
        except Exception as e:
            print(f"Warning: Could not restore settings: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
