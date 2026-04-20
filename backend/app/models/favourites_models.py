from pydantic import BaseModel, Field


class FavouriteArtistRequest(BaseModel):
    name_norm: str = Field(..., min_length=1, max_length=200)


class FavouriteAlbumRequest(BaseModel):
    album_id: str = Field(..., min_length=1, max_length=200)


class VisibilityUpdateRequest(BaseModel):
    top_artists: bool = True
    top_albums: bool = True
    favourites: bool = True
