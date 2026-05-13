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


class AttendeeRef(BaseModel):
    """Full attendee entry with social signals for sorting in the modal."""
    id: str
    handle: str
    profile_image_url: Optional[str] = None
    is_friend: bool = False
    shared_bands: int = 0


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
    # ── RSVP ──────────────────────────────────────────────────────────────────
    my_rsvp: Optional[str] = None          # null | "interested" | "going"
    going_count: int = 0
    interested_count: int = 0
    going_avatars: List[FriendRef] = []    # friends going (up to 8 for avatar group)
    interested_avatars: List[FriendRef] = []  # friends interested (up to 8)
    # ── Ranking ───────────────────────────────────────────────────────────────
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


class RsvpRequest(BaseModel):
    """Body for POST /events/{id}/rsvp."""
    status: str  # "interested" | "going"


class RsvpResponse(BaseModel):
    """Returned after RSVP toggle so the client can update counts optimistically."""
    rsvp: Optional[str]   # null (removed) | "interested" | "going"
    going_count: int = 0
    interested_count: int = 0


# Kept for backwards-compat with any older clients still using /interest
class ToggleInterestResponse(BaseModel):
    interested: bool
