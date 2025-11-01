"""
Spotify Data Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SpotifyTokenRequest(BaseModel):
    """Request model for Spotify OAuth callback"""
    code: str
    state: Optional[str] = None


class SpotifyTokenResponse(BaseModel):
    """Response model for Spotify tokens"""
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: Optional[str] = None
    scope: str


class SpotifyTrack(BaseModel):
    """Spotify Track model"""
    id: str = Field(..., alias="spotify_id")
    name: str
    duration_ms: int
    album_id: str
    artist_ids: List[str]
    isrc: Optional[str] = None
    popularity: Optional[int] = None
    
    class Config:
        populate_by_name = True


class SpotifyArtist(BaseModel):
    """Spotify Artist model"""
    id: str = Field(..., alias="spotify_id")
    name: str
    genres: List[str] = []
    popularity: Optional[int] = None
    
    class Config:
        populate_by_name = True


class SpotifyAlbum(BaseModel):
    """Spotify Album model"""
    id: str = Field(..., alias="spotify_id")
    name: str
    release_date: Optional[str] = None
    album_type: Optional[str] = None
    total_tracks: Optional[int] = None
    
    class Config:
        populate_by_name = True


class SpotifyPlay(BaseModel):
    """Spotify Play/Scrobble model"""
    user_id: str
    track_id: str  # Internal track ID
    played_at: datetime
    duration_played_ms: int
    source: str = "spotify"
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)
    context_type: Optional[str] = None  # album, playlist, artist, etc.
    context_uri: Optional[str] = None


class SpotifyCurrentlyPlaying(BaseModel):
    """Currently playing track info"""
    track_id: str
    track_name: str
    artist_names: List[str]
    album_name: str
    duration_ms: int
    progress_ms: int
    is_playing: bool
    timestamp: int


class SpotifyRecentlyPlayed(BaseModel):
    """Recently played track from Spotify API"""
    track: dict
    played_at: str
    context: Optional[dict] = None


class SpotifyConnectionStatus(BaseModel):
    """User's Spotify connection status"""
    user_id: str
    is_connected: bool
    access_token_expires_at: Optional[datetime] = None
    scopes: List[str] = []
    last_sync_at: Optional[datetime] = None
    total_plays: int = 0

