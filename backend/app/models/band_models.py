from pydantic import BaseModel, Field
from typing import Optional, List, Literal


ReleaseType = Literal["LP", "EP", "Split-EP", "Demo", "Live", "Single", "Compilation"]


class TrackBase(BaseModel):
    number: int
    title: str = Field(..., min_length=1, max_length=300)
    duration: str = Field(..., pattern=r"^\d+:\d{2}$")
    lyrics: Optional[str] = None


class TrackCreate(TrackBase):
    pass


class TrackUpdate(BaseModel):
    number: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    duration: Optional[str] = Field(None, pattern=r"^\d+:\d{2}$")
    lyrics: Optional[str] = None


class TrackResponse(TrackBase):
    id: str


class ReleaseBase(BaseModel):
    slug: str = Field(..., pattern=r"^[a-z0-9-]+$")
    title: str = Field(..., min_length=1, max_length=300)
    type: ReleaseType
    year: int = Field(..., ge=1960, le=2100)
    label: Optional[str] = Field(None, max_length=200)


class ReleaseCreate(ReleaseBase):
    tracks: List[TrackCreate] = []


class ReleaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    type: Optional[ReleaseType] = None
    year: Optional[int] = Field(None, ge=1960, le=2100)
    label: Optional[str] = None
    tracks: Optional[List[TrackCreate]] = None


class ReleaseResponse(ReleaseBase):
    id: str
    band_id: str
    tracks: List[TrackResponse] = []
    status: str


class BandBase(BaseModel):
    slug: str = Field(..., pattern=r"^[a-z0-9-]+$")
    name: str = Field(..., min_length=1, max_length=200)
    country: str = Field(..., min_length=2, max_length=100)
    country_code: str = Field(..., min_length=2, max_length=4)
    formed: int = Field(..., ge=1960, le=2100)
    bio: Optional[str] = Field(None, max_length=5000)


class BandCreate(BandBase):
    genre_ids: List[str] = []
    tag_ids: List[str] = []


class BandRequestCreate(BaseModel):
    """Submitted by any authenticated user when a streaming artist has no Grimr match."""
    artist_name: str = Field(..., min_length=1, max_length=200)


class BandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    country: Optional[str] = None
    country_code: Optional[str] = None
    formed: Optional[int] = Field(None, ge=1960, le=2100)
    bio: Optional[str] = None
    status: Optional[Literal["draft", "published", "archived"]] = None
    genre_ids: Optional[List[str]] = None
    tag_ids: Optional[List[str]] = None
    image_url: Optional[str] = None
    logo_url: Optional[str] = None


class BandResponse(BandBase):
    id: str
    status: str
    image_url: Optional[str] = None
    logo_url: Optional[str] = None
    releases: List[ReleaseResponse] = []
    genres: List[dict] = []
    tags: List[dict] = []
    created_by_id: Optional[str] = None
    updated_by_id: Optional[str] = None


class GenreBase(BaseModel):
    slug: str = Field(..., pattern=r"^[a-z0-9-]+$")
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    parent_id: Optional[str] = None


class GenreCreate(GenreBase):
    pass


class GenreUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[str] = None


class GenreResponse(GenreBase):
    id: str
    children: List["GenreResponse"] = []


GenreResponse.model_rebuild()


class TagBase(BaseModel):
    slug: str = Field(..., pattern=r"^[a-z0-9-]+$")
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., max_length=50)


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None


class TagResponse(TagBase):
    id: str


class TagMerge(BaseModel):
    source_id: str
    target_id: str


class AlbumSuggestionCreate(BaseModel):
    """Submitted by any authenticated user to suggest a missing album."""
    title: str = Field(..., min_length=1, max_length=300)
    type: Optional[ReleaseType] = None
    year: Optional[int] = Field(None, ge=1960, le=2100)


class AlbumSuggestionUpdate(BaseModel):
    """Admin can edit a pending suggestion before approving."""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    type: Optional[ReleaseType] = None
    year: Optional[int] = Field(None, ge=1960, le=2100)
    reviewer_note: Optional[str] = Field(None, max_length=1000)


class AlbumSuggestionReject(BaseModel):
    """Body for rejecting a suggestion; reason is optional."""
    reason: Optional[str] = Field(None, max_length=500)


class AlbumSuggestionResponse(BaseModel):
    id: str
    title: str
    type: Optional[str] = None
    year: Optional[int] = None
    band_id: str
    band_name: Optional[str] = None
    band_slug: Optional[str] = None
    suggested_by_user_id: str
    suggested_by_handle: Optional[str] = None
    status: str
    created_at: str
    reviewer_note: Optional[str] = None
    rejected_reason: Optional[str] = None
    reviewed_at: Optional[str] = None


class BandTagsAdd(BaseModel):
    """Body for the public POST /bands/{band_id}/tags endpoint.

    Both lists are optional — callers can add genres, tags, or both in
    a single round-trip.  All IDs must reference existing ontology nodes;
    unknown IDs are silently skipped (MATCH semantics in Cypher).
    """
    genre_ids: List[str] = []
    tag_ids: List[str] = []


class BandSummaryResponse(BaseModel):
    id: str
    slug: str
    name: str
    country: str
    country_code: str
    formed: int


class ReleaseDetailResponse(BaseModel):
    band: BandSummaryResponse
    release: ReleaseResponse


# ── Album Reviews ─────────────────────────────────────────────────────────────

class AlbumReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=10)
    body: Optional[str] = Field(None, max_length=5000)


class AlbumReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=10)
    body: Optional[str] = Field(None, max_length=5000)


class AlbumReviewResponse(BaseModel):
    id: str
    release_id: str
    user_id: str
    user_handle: str
    user_avatar_url: Optional[str] = None
    rating: int
    body: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


class AlbumReviewsResponse(BaseModel):
    reviews: List[AlbumReviewResponse]
    avg_rating: Optional[float] = None
    count: int
    my_review: Optional[AlbumReviewResponse] = None
