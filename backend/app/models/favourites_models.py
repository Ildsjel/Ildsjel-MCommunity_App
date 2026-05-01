from pydantic import BaseModel, Field
from typing import Optional, Literal


class FavouriteArtistRequest(BaseModel):
    name_norm: str = Field(..., min_length=1, max_length=200)


class FavouriteAlbumRequest(BaseModel):
    album_id: str = Field(..., min_length=1, max_length=200)


class FavouriteBandRequest(BaseModel):
    band_id: str = Field(..., min_length=1, max_length=200)


class AddFavouriteBandResponse(BaseModel):
    """Response returned when a user favourites a band from the catalogue.

    ``matched_external`` is True when the catalogue band name was found in the
    user's Spotify / Last.fm artist library, meaning an existing
    (Artist)-[:LINKED_BAND]->(Band) edge was created to deduplicate the two
    representations.  The frontend may use this to show a short notice.
    """
    ok: bool = True
    matched_external: bool = False
    matched_artist_name: Optional[str] = None
    matched_source: Optional[Literal["spotify", "lastfm", "both"]] = None


class VisibilityUpdateRequest(BaseModel):
    top_artists: bool = True
    top_albums: bool = True
    favourites: bool = True
