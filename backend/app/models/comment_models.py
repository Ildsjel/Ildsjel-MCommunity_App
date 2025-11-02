"""
Pydantic models for image comments
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class CommentCreate(BaseModel):
    """Model for creating a new comment"""
    image_id: str
    content: str = Field(..., min_length=1, max_length=5000)  # ~500 words in rich text
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        """Validate content is not empty after stripping HTML"""
        if not v or not v.strip():
            raise ValueError('Comment content cannot be empty')
        return v


class CommentUpdate(BaseModel):
    """Model for updating a comment"""
    content: str = Field(..., min_length=1, max_length=5000)
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        """Validate content is not empty after stripping HTML"""
        if not v or not v.strip():
            raise ValueError('Comment content cannot be empty')
        return v


class CommentAuthor(BaseModel):
    """Model for comment author info"""
    user_id: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class Comment(BaseModel):
    """Model for a comment response"""
    id: str
    image_id: str
    author: CommentAuthor
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_edited: bool = False


class CommentListResponse(BaseModel):
    """Model for list of comments"""
    comments: list[Comment]
    total: int
    image_id: str

