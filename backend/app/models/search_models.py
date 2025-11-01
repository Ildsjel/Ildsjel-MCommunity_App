"""
Pydantic models for Search functionality
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class SearchType(str, Enum):
    """Search type enum"""
    NAME = "name"
    ARTIST = "artist"
    GENRE = "genre"
    MIXED = "mixed"


class SearchFilters(BaseModel):
    """Search filters"""
    radius_km: Optional[int] = Field(None, ge=10, le=500)
    min_shared_artists: Optional[int] = Field(None, ge=1, le=50)
    genre_tags: Optional[List[str]] = None
    has_event_plans: Optional[bool] = None


class ProfileSearchRequest(BaseModel):
    """Profile search request"""
    q: str = Field(..., min_length=2, max_length=100)
    type: SearchType = SearchType.MIXED
    city: Optional[str] = None
    radius_km: Optional[int] = Field(50, ge=10, le=500)
    limit: int = Field(20, ge=1, le=100)
    cursor: Optional[str] = None
    filters: Optional[SearchFilters] = None


class SharedArtist(BaseModel):
    """Shared artist info"""
    artist_id: str
    artist_name: str
    play_count_requester: int
    play_count_target: int


class ProfileSearchHit(BaseModel):
    """Single profile search result"""
    user_id: str
    handle: str
    city_bucket: Optional[str] = None  # "Berlin", "Berlin Region", or None
    profile_image_url: Optional[str] = None
    top_shared_artists: List[SharedArtist] = Field(default_factory=list, max_length=3)
    shared_genres: List[str] = Field(default_factory=list, max_length=5)
    compatibility_score: Optional[float] = None  # 0-100
    search_score: float  # Combined ranking score
    badges: List[str] = Field(default_factory=list)
    distance_km: Optional[float] = None
    last_active: Optional[str] = None  # "2 days ago", "1 week ago"


class ProfileSearchResponse(BaseModel):
    """Profile search response"""
    hits: List[ProfileSearchHit]
    total: int
    next_cursor: Optional[str] = None
    query_time_ms: int

