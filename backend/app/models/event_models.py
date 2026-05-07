"""Pydantic models for Event entity"""
from pydantic import BaseModel
from typing import List, Optional


class BandRef(BaseModel):
    id: str
    name: str
    slug: str


class FriendRef(BaseModel):
    id: str
    handle: str
    profile_image_url: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    title: str
    date: str          # ISO date "2025-06-14"
    venue: str
    city: str
    country: str
    country_code: Optional[str] = None
    ticket_url: Optional[str] = None
    headliner: Optional[BandRef] = None
    supporting: List[BandRef] = []
    friends_interested: List[FriendRef] = []
    is_interested: bool = False
    match_score: float = 0.0   # 0.0–1.0
    distance_km: Optional[int] = None


class EventCreate(BaseModel):
    title: str
    date: str           # "YYYY-MM-DD"
    venue: str
    city: str
    country: str
    country_code: Optional[str] = None
    ticket_url: Optional[str] = None
    headliner_band_id: Optional[str] = None
    supporting_band_ids: List[str] = []


class ToggleInterestResponse(BaseModel):
    interested: bool
