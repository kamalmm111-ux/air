"""
Image Upload Service
Handles image uploads with validation, compression, and storage
"""

import os
import uuid
import logging
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Configuration
UPLOAD_DIR = Path(__file__).parent / "uploads" / "images"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_IMAGE_DIMENSION = 1920  # Max width/height for resize
COMPRESSION_QUALITY = 85  # JPEG/WebP quality (1-100)

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def validate_image(file_content: bytes, filename: str) -> Tuple[bool, str]:
    """
    Validate uploaded image file
    Returns (is_valid, error_message)
    """
    # Check file size
    if len(file_content) > MAX_FILE_SIZE:
        return False, f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
    
    # Check extension
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    
    # Verify it's actually an image
    try:
        img = Image.open(io.BytesIO(file_content))
        img.verify()
    except Exception as e:
        return False, "Invalid image file. Could not process the image."
    
    return True, ""


def process_and_save_image(
    file_content: bytes,
    filename: str,
    category: str = "general",
    max_dimension: int = MAX_IMAGE_DIMENSION,
    quality: int = COMPRESSION_QUALITY
) -> Tuple[bool, str, Optional[str]]:
    """
    Process, optimize, and save an uploaded image
    
    Args:
        file_content: Raw file bytes
        filename: Original filename
        category: Subfolder category (e.g., 'drivers', 'vehicles', 'banners')
        max_dimension: Maximum width/height for resize
        quality: Compression quality (1-100)
    
    Returns:
        (success, message, image_url)
    """
    # Validate first
    is_valid, error = validate_image(file_content, filename)
    if not is_valid:
        return False, error, None
    
    try:
        # Open image
        img = Image.open(io.BytesIO(file_content))
        
        # Convert RGBA to RGB for JPEG compatibility
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if too large (maintain aspect ratio)
        if max(img.size) > max_dimension:
            ratio = max_dimension / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"Resized image from {img.size} to {new_size}")
        
        # Generate unique filename
        ext = Path(filename).suffix.lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            ext = '.jpg'
        
        unique_name = f"{category}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
        
        # Create category subfolder
        category_dir = UPLOAD_DIR / category
        category_dir.mkdir(parents=True, exist_ok=True)
        
        save_path = category_dir / unique_name
        
        # Save with compression
        save_kwargs = {}
        if ext in ['.jpg', '.jpeg']:
            save_kwargs = {'quality': quality, 'optimize': True}
        elif ext == '.webp':
            save_kwargs = {'quality': quality}
        elif ext == '.png':
            save_kwargs = {'optimize': True}
        
        img.save(save_path, **save_kwargs)
        
        # Generate URL path
        image_url = f"/api/uploads/images/{category}/{unique_name}"
        
        logger.info(f"Saved image: {save_path} -> {image_url}")
        
        return True, "Image uploaded successfully", image_url
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return False, f"Error processing image: {str(e)}", None


def delete_image(image_url: str) -> bool:
    """
    Delete an uploaded image by its URL
    """
    try:
        # Extract path from URL
        if image_url.startswith("/api/uploads/images/"):
            relative_path = image_url.replace("/api/uploads/images/", "")
            file_path = UPLOAD_DIR / relative_path
            
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted image: {file_path}")
                return True
        
        return False
    except Exception as e:
        logger.error(f"Error deleting image: {str(e)}")
        return False


def get_image_info(image_url: str) -> Optional[dict]:
    """
    Get information about an uploaded image
    """
    try:
        if image_url.startswith("/api/uploads/images/"):
            relative_path = image_url.replace("/api/uploads/images/", "")
            file_path = UPLOAD_DIR / relative_path
            
            if file_path.exists():
                img = Image.open(file_path)
                stat = file_path.stat()
                
                return {
                    "url": image_url,
                    "filename": file_path.name,
                    "size_bytes": stat.st_size,
                    "size_kb": round(stat.st_size / 1024, 2),
                    "width": img.size[0],
                    "height": img.size[1],
                    "format": img.format,
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
                }
        
        return None
    except Exception as e:
        logger.error(f"Error getting image info: {str(e)}")
        return None
