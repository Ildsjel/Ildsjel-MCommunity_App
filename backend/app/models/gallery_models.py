"""
Pydantic models for User Gallery
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class GalleryImage(BaseModel):
    """Model for a single gallery image"""
    id: str
    user_id: str
    image_url: str
    thumbnail_url: str
    caption: Optional[str] = Field(None, max_length=500)
    uploaded_at: datetime
    position: int  # Order in gallery (0-14)
    
    class Config:
        from_attributes = True


class GalleryImageUpload(BaseModel):
    """Model for uploading a gallery image"""
    caption: Optional[str] = Field(None, max_length=500)


class GalleryResponse(BaseModel):
    """Model for gallery response"""
    user_id: str
    handle: str
    images: List[GalleryImage] = []
    total_images: int = 0
    
    class Config:
        from_attributes = True


class ImageUploadResponse(BaseModel):
    """Model for image upload response"""
    success: bool
    message: str
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

