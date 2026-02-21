"""
Test Image Upload Feature
Tests the /api/upload/image endpoint and ImageUpload component integration
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@aircabio.com"
SUPER_ADMIN_PASSWORD = "Aircabio@2024!"


@pytest.fixture(scope="module")
def admin_token():
    """Get super admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestImageUploadEndpoint:
    """Test /api/upload/image endpoint"""
    
    def test_upload_image_jpeg_success(self, admin_headers):
        """Test uploading a JPEG image"""
        # Create a simple valid JPEG in memory
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('test_image.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image?category=test",
            files=files,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "image_url" in data
        assert data["image_url"].startswith("/api/uploads/images/test/")
        print(f"PASS: JPEG upload successful - URL: {data['image_url']}")
    
    def test_upload_image_png_success(self, admin_headers):
        """Test uploading a PNG image"""
        from PIL import Image
        img = Image.new('RGBA', (100, 100), color='green')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test_image.png', img_bytes, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image?category=drivers",
            files=files,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "drivers" in data["image_url"]
        print(f"PASS: PNG upload successful - URL: {data['image_url']}")
    
    def test_upload_image_webp_success(self, admin_headers):
        """Test uploading a WebP image"""
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='WEBP')
        img_bytes.seek(0)
        
        files = {'file': ('test_image.webp', img_bytes, 'image/webp')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image?category=vehicles",
            files=files,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "vehicles" in data["image_url"]
        print(f"PASS: WebP upload successful - URL: {data['image_url']}")
    
    def test_upload_image_with_category_banners(self, admin_headers):
        """Test uploading image to banners category"""
        from PIL import Image
        img = Image.new('RGB', (1920, 1080), color='purple')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('hero_banner.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image?category=banners",
            files=files,
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "banners" in data["image_url"]
        print(f"PASS: Banner upload successful - URL: {data['image_url']}")
    
    def test_upload_image_with_category_branding(self, admin_headers):
        """Test uploading image to branding category (for logos/favicons)"""
        from PIL import Image
        img = Image.new('RGBA', (256, 256), color='gold')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('logo.png', img_bytes, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image?category=branding",
            files=files,
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "branding" in data["image_url"]
        print(f"PASS: Branding upload successful - URL: {data['image_url']}")
    
    def test_upload_image_invalid_type(self, admin_headers):
        """Test uploading invalid file type is rejected"""
        files = {'file': ('test.txt', io.BytesIO(b'not an image'), 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image?category=test",
            files=files,
            headers=admin_headers
        )
        
        assert response.status_code == 400, f"Should reject invalid file: {response.text}"
        print("PASS: Invalid file type correctly rejected")
    
    def test_upload_image_no_auth(self):
        """Test upload without authentication fails"""
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('test.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image?category=test",
            files=files
        )
        
        # Should fail with 401 or 403
        assert response.status_code in [401, 403], f"Should require auth: {response.status_code}"
        print("PASS: Unauthenticated upload correctly rejected")
    
    def test_uploaded_image_accessible(self, admin_headers):
        """Test that uploaded images are accessible via URL"""
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='orange')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('access_test.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image?category=test",
            files=files,
            headers=admin_headers
        )
        
        assert response.status_code == 200
        image_url = response.json()["image_url"]
        
        # Verify image is accessible
        full_url = f"{BASE_URL}{image_url}"
        img_response = requests.get(full_url)
        assert img_response.status_code == 200, f"Image not accessible at {full_url}"
        assert 'image' in img_response.headers.get('content-type', ''), f"Wrong content-type: {img_response.headers.get('content-type')}"
        print(f"PASS: Uploaded image accessible at {full_url}")


class TestImageUploadIntegration:
    """Test integration points where ImageUpload is used"""
    
    def test_driver_can_have_photo_url(self, admin_headers):
        """Test that driver photo_url field can be saved"""
        # Create a test driver with photo_url
        driver_data = {
            "name": "TEST_Upload_Driver",
            "phone": "+44 7000 000001",
            "email": "test_upload_driver@test.com",
            "photo_url": "https://example.com/photo.jpg",  # URL fallback works
            "status": "active",
            "driver_type": "internal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/drivers",
            json=driver_data,
            headers=admin_headers
        )
        
        assert response.status_code in [200, 201], f"Failed to create driver: {response.text}"
        driver = response.json()
        assert driver["photo_url"] == driver_data["photo_url"]
        print(f"PASS: Driver created with photo_url: {driver['photo_url']}")
        
        # Cleanup
        if driver.get("id"):
            requests.delete(f"{BASE_URL}/api/drivers/{driver['id']}", headers=admin_headers)
    
    def test_vehicle_can_have_image_url(self, admin_headers):
        """Test that vehicle image_url field can be saved"""
        # First get a category ID
        cat_response = requests.get(f"{BASE_URL}/api/admin/vehicle-categories", headers=admin_headers)
        categories = cat_response.json() if cat_response.status_code == 200 else []
        category_id = categories[0]["id"] if categories else None
        
        if not category_id:
            pytest.skip("No vehicle categories available")
        
        vehicle_data = {
            "plate_number": "TEST001",
            "make": "Test",
            "model": "Upload",
            "category_id": category_id,
            "image_url": "https://example.com/vehicle.jpg",
            "passenger_capacity": 4,
            "luggage_capacity": 2,
            "status": "active"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/vehicles",
            json=vehicle_data,
            headers=admin_headers
        )
        
        assert response.status_code in [200, 201], f"Failed to create vehicle: {response.text}"
        vehicle = response.json()
        assert vehicle["image_url"] == vehicle_data["image_url"]
        print(f"PASS: Vehicle created with image_url: {vehicle['image_url']}")
        
        # Cleanup
        if vehicle.get("id"):
            requests.delete(f"{BASE_URL}/api/vehicles/{vehicle['id']}", headers=admin_headers)
    
    def test_cms_settings_can_have_images(self, admin_headers):
        """Test CMS website settings can store image URLs"""
        # Get current settings
        response = requests.get(f"{BASE_URL}/api/admin/website-settings", headers=admin_headers)
        assert response.status_code == 200
        current_settings = response.json()
        
        # Update with test image URLs
        update_data = {
            **current_settings,
            "logo_url": "https://example.com/test_logo.png",
            "favicon_url": "https://example.com/test_favicon.ico",
            "hero_background_url": "https://example.com/test_hero.jpg"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/website-settings",
            json=update_data,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        print("PASS: CMS settings updated with image URLs")
        
        # Verify settings were saved
        verify_response = requests.get(f"{BASE_URL}/api/admin/website-settings", headers=admin_headers)
        saved_settings = verify_response.json()
        assert saved_settings.get("logo_url") == "https://example.com/test_logo.png"
        print("PASS: Image URLs persisted in CMS settings")


class TestImageUploadCategories:
    """Test various upload categories work correctly"""
    
    @pytest.mark.parametrize("category", ["drivers", "vehicles", "banners", "branding", "media", "general"])
    def test_upload_to_category(self, admin_headers, category):
        """Test uploading to various categories"""
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='cyan')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': (f'{category}_test.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image?category={category}",
            files=files,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Failed for category {category}: {response.text}"
        data = response.json()
        assert category in data["image_url"]
        print(f"PASS: Upload to '{category}' category successful")
