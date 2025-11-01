"""
Pydantic models for User entity
"""
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user model"""
    handle: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    country: Optional[str] = None
    city: Optional[str] = None


class UserCreate(UserBase):
    """Model for user registration"""
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    """Model for user login"""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Model for user response (without sensitive data)"""
    id: str
    created_at: datetime
    source_accounts: List[str] = []
    is_pro: bool = False
    onboarding_complete: bool = False
    profile_image_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Model for updating user profile"""
    handle: Optional[str] = Field(None, min_length=3, max_length=30)
    country: Optional[str] = None
    city: Optional[str] = None
    profile_image_url: Optional[str] = None


class TokenResponse(BaseModel):
    """Model for JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MetalIDCard(BaseModel):
    """Model for Metal-ID Card"""
    user_id: str
    handle: str
    top_artists: List[dict] = []
    top_genres: List[str] = []
    badges: List[str] = []
    profile_image_url: Optional[str] = None

