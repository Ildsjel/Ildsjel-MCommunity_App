from fastapi import APIRouter, HTTPException, Depends, Query
from app.db.neo4j_driver import get_neo4j_session
from app.services.band_service import BandService
from app.models.band_models import BandResponse, GenreResponse, TagResponse
from typing import List, Optional

router = APIRouter(prefix="/bands", tags=["Bands"])


@router.get("")
async def list_bands(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    q: Optional[str] = Query(None, description="Search by band name"),
    session=Depends(get_neo4j_session),
):
    return BandService(session).list_bands(status="published", skip=skip, limit=limit, query=q or None)


@router.get("/genres", response_model=List[GenreResponse])
async def list_genres(session=Depends(get_neo4j_session)):
    return BandService(session).list_genres()


@router.get("/tags", response_model=List[TagResponse])
async def list_tags(
    category: Optional[str] = None,
    session=Depends(get_neo4j_session),
):
    return BandService(session).list_tags(category)


@router.get("/{slug}", response_model=BandResponse)
async def get_band(slug: str, session=Depends(get_neo4j_session)):
    band = BandService(session).get_band_by_slug(slug)
    if not band:
        raise HTTPException(status_code=404, detail="Band not found")
    return band
