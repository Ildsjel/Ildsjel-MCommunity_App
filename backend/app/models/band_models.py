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
