from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AdminTokenCreate(BaseModel):
    note: Optional[str] = Field(None, max_length=200, description="Optional note about who this token is for")


class AdminTokenResponse(BaseModel):
    id: str
    token: str
    note: Optional[str]
    created_by_id: str
    redeemed_by_id: Optional[str]
    created_at: str
    expires_at: str


class AdminTokenRedeem(BaseModel):
    token: str


class UserRoleResponse(BaseModel):
    id: str
    handle: str
    email: str
    role: str


class UserRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(user|admin|superadmin)$")
