from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.auth.permissions import require_admin, require_superadmin
from app.auth.jwt_handler import get_current_user
from app.db.neo4j_driver import get_neo4j_session
from app.services.admin_service import AdminService
from app.services.band_service import BandService
from app.services.image_service import image_service
from app.db.repositories.band_repository import BandRepository
from app.models.admin_models import (
    AdminTokenCreate, AdminTokenResponse, AdminTokenRedeem,
    UserRoleResponse, UserRoleUpdate,
)
from app.models.band_models import (
    BandCreate, BandUpdate, BandResponse,
    ReleaseCreate, ReleaseResponse,
    GenreCreate, GenreUpdate, GenreResponse,
    TagCreate, TagUpdate, TagResponse, TagMerge,
)
from typing import List, Optional

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Token: generate (superadmin only) ───────────────────────────────────────

@router.post("/tokens", response_model=AdminTokenResponse, status_code=201)
async def generate_token(
    body: AdminTokenCreate,
    current_user: dict = Depends(require_superadmin),
    session=Depends(get_neo4j_session),
):
    svc = AdminService(session)
    return svc.generate_token(current_user["id"], body.note)


@router.get("/tokens", response_model=List[AdminTokenResponse])
async def list_tokens(
    current_user: dict = Depends(require_superadmin),
    session=Depends(get_neo4j_session),
):
    svc = AdminService(session)
    return svc.list_tokens(current_user["id"])


# ── Token: redeem (any authenticated user) ──────────────────────────────────

@router.post("/tokens/redeem")
async def redeem_token(
    body: AdminTokenRedeem,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    svc = AdminService(session)
    result = svc.redeem_token(body.token, current_user["id"])
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is invalid, expired, or already redeemed",
        )
    return {"message": "Token redeemed — you are now an admin"}


# ── Users: role management (superadmin only) ─────────────────────────────────

@router.get("/users", response_model=List[UserRoleResponse])
async def list_users(
    current_user: dict = Depends(require_superadmin),
    session=Depends(get_neo4j_session),
):
    svc = AdminService(session)
    return svc.list_users()


@router.patch("/users/{user_id}/role")
async def set_user_role(
    user_id: str,
    body: UserRoleUpdate,
    current_user: dict = Depends(require_superadmin),
    session=Depends(get_neo4j_session),
):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    svc = AdminService(session)
    ok = svc.set_role(user_id, body.role)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Role updated to {body.role}"}


# ── Bands CRUD (admin) ───────────────────────────────────────────────────────

@router.get("/bands", response_model=List[BandResponse])
async def list_bands(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    return BandService(session).list_bands(status, skip, limit)


@router.post("/bands", response_model=BandResponse, status_code=201)
async def create_band(
    body: BandCreate,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    return BandService(session).create_band(body.model_dump(), current_user["id"])


@router.get("/bands/{band_id}", response_model=BandResponse)
async def get_band(
    band_id: str,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    band = BandService(session).get_band(band_id)
    if not band:
        raise HTTPException(status_code=404, detail="Band not found")
    return band


@router.patch("/bands/{band_id}", response_model=BandResponse)
async def update_band(
    band_id: str,
    body: BandUpdate,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    updated = BandService(session).update_band(
        band_id, body.model_dump(exclude_none=True), current_user["id"]
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Band not found")
    return updated


@router.delete("/bands/{band_id}", status_code=204)
async def delete_band(
    band_id: str,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    ok = BandService(session).delete_band(band_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Band not found")


@router.post("/bands/{band_id}/image", response_model=BandResponse)
async def upload_band_photo(
    band_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    image_url, _ = await image_service.process_band_photo(file, band_id)
    band = BandRepository(session).set_band_image(band_id, "image_url", image_url)
    if not band:
        raise HTTPException(status_code=404, detail="Band not found")
    return band


@router.post("/bands/{band_id}/logo", response_model=BandResponse)
async def upload_band_logo(
    band_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    logo_url, _ = await image_service.process_band_logo(file, band_id)
    band = BandRepository(session).set_band_image(band_id, "logo_url", logo_url)
    if not band:
        raise HTTPException(status_code=404, detail="Band not found")
    return band


# ── Releases (admin) ─────────────────────────────────────────────────────────

@router.post("/bands/{band_id}/releases", response_model=ReleaseResponse, status_code=201)
async def create_release(
    band_id: str,
    body: ReleaseCreate,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    return BandService(session).create_release(band_id, body.model_dump())


@router.delete("/releases/{release_id}", status_code=204)
async def delete_release(
    release_id: str,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    ok = BandService(session).delete_release(release_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Release not found")


# ── Genres (admin) ───────────────────────────────────────────────────────────

@router.get("/genres", response_model=List[GenreResponse])
async def list_genres(
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    return BandService(session).list_genres()


@router.post("/genres", response_model=GenreResponse, status_code=201)
async def create_genre(
    body: GenreCreate,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    return BandService(session).create_genre(body.model_dump())


@router.patch("/genres/{genre_id}", response_model=GenreResponse)
async def update_genre(
    genre_id: str,
    body: GenreUpdate,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    updated = BandService(session).update_genre(genre_id, body.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Genre not found")
    return updated


@router.delete("/genres/{genre_id}", status_code=204)
async def delete_genre(
    genre_id: str,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    ok = BandService(session).delete_genre(genre_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Genre not found")


# ── Tags (admin) ─────────────────────────────────────────────────────────────

@router.get("/tags", response_model=List[TagResponse])
async def list_tags(
    category: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    return BandService(session).list_tags(category)


@router.post("/tags", response_model=TagResponse, status_code=201)
async def create_tag(
    body: TagCreate,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    return BandService(session).create_tag(body.model_dump())


@router.patch("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: str,
    body: TagUpdate,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    updated = BandService(session).update_tag(tag_id, body.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Tag not found")
    return updated


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: str,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    ok = BandService(session).delete_tag(tag_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Tag not found")


@router.post("/tags/merge", status_code=200)
async def merge_tags(
    body: TagMerge,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    ok = BandService(session).merge_tags(body.source_id, body.target_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Merge failed — check source and target IDs")
    return {"message": "Tags merged successfully"}
