"""
Pydantic models for User entity
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from datetime import datetime
import re


class UserBase(BaseModel):
    """Base user model"""
    handle: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    country: Optional[str] = None
    city: Optional[str] = None
    
    @field_validator('handle')
    @classmethod
    def validate_handle(cls, v: str) -> str:
        """Validate handle format"""
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Handle can only contain letters, numbers, underscores and hyphens')
        return v


class UserCreate(UserBase):
    """Model for user registration"""
    password: str = Field(..., min_length=8, max_length=72)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v) > 72:
            raise ValueError('Password must not exceed 72 characters (bcrypt limit)')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v


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
    email_verified: bool = False
    is_active: bool = True
    
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


class EmailVerificationRequest(BaseModel):
    """Model for email verification request"""
    token: str


class PasswordResetRequest(BaseModel):
    """Model for password reset request"""
    email: EmailStr


class PasswordReset(BaseModel):
    """Model for password reset"""
    token: str
    new_password: str = Field(..., min_length=8, max_length=72)
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v) > 72:
            raise ValueError('Password must not exceed 72 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v
