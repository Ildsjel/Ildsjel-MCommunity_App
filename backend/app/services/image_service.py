"""
Image Upload and Processing Service
"""
import os
import uuid
from pathlib import Path
from typing import Tuple, Optional
from PIL import Image
import io
from fastapi import UploadFile, HTTPException


class ImageService:
    """Service for handling image uploads and processing"""
    
    # Allowed image types
    ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
    
    # Size limits
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    AVATAR_SIZE = (400, 400)
    GALLERY_SIZE = (1200, 1200)
    THUMBNAIL_SIZE = (300, 300)
    
    def __init__(self, upload_dir: str = "/app/uploads"):
        """Initialize image service with upload directory"""
        self.upload_dir = Path(upload_dir)
        self.avatar_dir = self.upload_dir / "avatars"
        self.gallery_dir = self.upload_dir / "gallery"
        self.thumbnail_dir = self.upload_dir / "thumbnails"
        
        # Create directories if they don't exist
        self.avatar_dir.mkdir(parents=True, exist_ok=True)
        self.gallery_dir.mkdir(parents=True, exist_ok=True)
        self.thumbnail_dir.mkdir(parents=True, exist_ok=True)
    
    def validate_image(self, file: UploadFile) -> None:
        """Validate image file"""
        # Check file extension
        file_ext = Path(file.filename or "").suffix.lower()
        if file_ext not in self.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}"
            )
        
        # Check MIME type
        if file.content_type not in self.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid content type: {file.content_type}"
            )
    
    async def process_avatar(
        self, 
        file: UploadFile, 
        user_id: str
    ) -> Tuple[str, str]:
        """
        Process and save avatar image
        Returns: (image_url, file_path)
        """
        self.validate_image(file)
        
        # Read file content
        content = await file.read()
        if len(content) > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {self.MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Open and process image
        try:
            image = Image.open(io.BytesIO(content))
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize to avatar size (square crop)
            image = self._resize_and_crop(image, self.AVATAR_SIZE)
            
            # Generate unique filename
            file_ext = Path(file.filename or "image.jpg").suffix.lower()
            filename = f"{user_id}_avatar_{uuid.uuid4().hex[:8]}{file_ext}"
            file_path = self.avatar_dir / filename
            
            # Save image
            image.save(file_path, quality=85, optimize=True)
            
            # Return URL (relative path for serving)
            image_url = f"/uploads/avatars/{filename}"
            return image_url, str(file_path)
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to process image: {str(e)}"
            )
    
    async def process_gallery_image(
        self, 
        file: UploadFile, 
        user_id: str
    ) -> Tuple[str, str, str]:
        """
        Process and save gallery image with thumbnail
        Returns: (image_url, thumbnail_url, file_path)
        """
        self.validate_image(file)
        
        # Read file content
        content = await file.read()
        if len(content) > self.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {self.MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Open and process image
        try:
            image = Image.open(io.BytesIO(content))
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Generate unique filename
            file_ext = Path(file.filename or "image.jpg").suffix.lower()
            base_filename = f"{user_id}_gallery_{uuid.uuid4().hex[:12]}"
            
            # Process main image
            main_image = self._resize_keep_aspect(image, self.GALLERY_SIZE)
            main_filename = f"{base_filename}{file_ext}"
            main_path = self.gallery_dir / main_filename
            main_image.save(main_path, quality=90, optimize=True)
            
            # Process thumbnail
            thumbnail = self._resize_and_crop(image, self.THUMBNAIL_SIZE)
            thumb_filename = f"{base_filename}_thumb{file_ext}"
            thumb_path = self.thumbnail_dir / thumb_filename
            thumbnail.save(thumb_path, quality=80, optimize=True)
            
            # Return URLs
            image_url = f"/uploads/gallery/{main_filename}"
            thumbnail_url = f"/uploads/thumbnails/{thumb_filename}"
            return image_url, thumbnail_url, str(main_path)
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to process image: {str(e)}"
            )
    
    def _resize_and_crop(self, image: Image.Image, size: Tuple[int, int]) -> Image.Image:
        """Resize and center crop image to exact size"""
        # Calculate aspect ratios
        img_ratio = image.width / image.height
        target_ratio = size[0] / size[1]
        
        if img_ratio > target_ratio:
            # Image is wider, crop width
            new_width = int(image.height * target_ratio)
            left = (image.width - new_width) // 2
            image = image.crop((left, 0, left + new_width, image.height))
        else:
            # Image is taller, crop height
            new_height = int(image.width / target_ratio)
            top = (image.height - new_height) // 2
            image = image.crop((0, top, image.width, top + new_height))
        
        # Resize to target size
        return image.resize(size, Image.Resampling.LANCZOS)
    
    def _resize_keep_aspect(self, image: Image.Image, max_size: Tuple[int, int]) -> Image.Image:
        """Resize image keeping aspect ratio, fitting within max_size"""
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        return image
    
    def delete_image(self, file_path: str) -> bool:
        """Delete an image file"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Failed to delete image {file_path}: {e}")
            return False


# Global instance
image_service = ImageService()

