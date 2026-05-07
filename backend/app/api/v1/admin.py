import uuid, re
from datetime import datetime, timezone
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
    TrackCreate, TrackUpdate, TrackResponse,
    GenreCreate, GenreUpdate, GenreResponse,
    TagCreate, TagUpdate, TagResponse, TagMerge,
    AlbumSuggestionResponse, AlbumSuggestionUpdate, AlbumSuggestionReject,
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

@router.get("/bands")
async def list_bands(
    status: Optional[str] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 25,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    result = BandService(session).list_bands(status, skip, limit, query=q)
    return {"bands": result["bands"], "total": result["total"]}


@router.get("/bands/draft-count")
async def get_draft_count(
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    return {"count": BandService(session).draft_count()}


@router.get("/bands/pending-counts")
async def get_bands_pending_counts(
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """Returns {band_id: pending_suggestion_count} for every band that has ≥1 pending suggestion."""
    records = session.run(
        """
        MATCH (s:AlbumSuggestion {status: 'pending'})-[:SUGGESTED_FOR]->(b:Band)
        RETURN b.id AS band_id, count(s) AS pending_count
        """
    )
    return {r["band_id"]: r["pending_count"] for r in records}


@router.post("/bands/publish-all-drafts")
async def publish_all_drafts(
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    count = BandService(session).publish_all_drafts()
    return {"published": count}


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


# ── Tracks (admin) ────────────────────────────────────────────────────────────

@router.post("/releases/{release_id}/tracks", response_model=ReleaseResponse, status_code=201)
async def add_track(
    release_id: str,
    body: TrackCreate,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """Add a track to an existing release. Returns the updated release with all tracks."""
    release = BandService(session).add_track(release_id, body.model_dump())
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    return release


@router.patch("/tracks/{track_id}", status_code=204)
async def update_track(
    track_id: str,
    body: TrackUpdate,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """Update one or more fields of an existing track."""
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return
    ok = BandService(session).update_track(track_id, updates)
    if not ok:
        raise HTTPException(status_code=404, detail="Track not found")


@router.delete("/tracks/{track_id}", status_code=204)
async def delete_track(
    track_id: str,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """Delete a track permanently."""
    BandService(session).delete_track(track_id)


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


# ── Album Review queue (admin) ────────────────────────────────────────────────

@router.get("/review/albums", response_model=List[AlbumSuggestionResponse])
async def get_review_queue(
    status: Optional[str] = "pending",
    q: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """Global album suggestion review queue across all bands.

    status: 'pending' (default) | 'approved' | 'rejected' | 'all'
    q: optional search string (matches title, band name, or suggester handle)
    """
    where_clauses = []
    params: dict = {}

    if status and status != "all":
        where_clauses.append("s.status = $status")
        params["status"] = status

    if q:
        where_clauses.append(
            "(toLower(s.title) CONTAINS toLower($q)"
            " OR toLower(b.name) CONTAINS toLower($q)"
            " OR toLower(COALESCE(u.handle, '')) CONTAINS toLower($q))"
        )
        params["q"] = q

    where_str = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    records = session.run(
        f"""
        MATCH (s:AlbumSuggestion)-[:SUGGESTED_FOR]->(b:Band)
        OPTIONAL MATCH (u:User {{id: s.suggested_by_user_id}})
        {where_str}
        RETURN s, b.name AS band_name, b.slug AS band_slug, u.handle AS suggested_by_handle
        ORDER BY s.created_at DESC
        """,
        **params,
    )
    results = []
    for r in records:
        s = dict(r["s"])
        s["band_name"] = r["band_name"]
        s["band_slug"] = r["band_slug"]
        s["suggested_by_handle"] = r["suggested_by_handle"]
        results.append(s)
    return results


@router.get("/review/albums/counts")
async def get_review_counts(
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """KPI counts per status."""
    result = session.run(
        "MATCH (s:AlbumSuggestion) RETURN s.status AS status, count(s) AS cnt"
    ).data()
    counts = {"pending": 0, "approved": 0, "rejected": 0}
    for r in result:
        if r["status"] in counts:
            counts[r["status"]] = r["cnt"]
    return counts


# ── Album Suggestions per-band (admin) ───────────────────────────────────────

@router.get("/bands/{band_id}/suggestions", response_model=List[AlbumSuggestionResponse])
async def list_suggestions(
    band_id: str,
    status: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """List album suggestions for a band.

    status: 'pending' | 'approved' | 'rejected' | None (returns pending + rejected)
    """
    if status and status != "all":
        where_str = "AND s.status = $status"
        params = {"band_id": band_id, "status": status}
    elif status == "all":
        where_str = ""
        params = {"band_id": band_id}
    else:
        # Default: exclude approved (those are surfaced as real releases)
        where_str = "AND s.status <> 'approved'"
        params = {"band_id": band_id}

    records = session.run(
        f"""
        MATCH (s:AlbumSuggestion {{band_id: $band_id}})
        WHERE true {where_str}
        OPTIONAL MATCH (u:User {{id: s.suggested_by_user_id}})
        RETURN s, u.handle AS suggested_by_handle
        ORDER BY s.created_at DESC
        """,
        **params,
    )
    results = []
    for r in records:
        s = dict(r["s"])
        s["suggested_by_handle"] = r["suggested_by_handle"]
        results.append(s)
    return results


@router.patch("/band-suggestions/{suggestion_id}")
async def update_suggestion(
    suggestion_id: str,
    body: AlbumSuggestionUpdate,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """Admin edits a suggestion (title / type / year / reviewer note)."""
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_parts = [f"s.{k} = ${k}" for k in updates]
    result = session.run(
        f"MATCH (s:AlbumSuggestion {{id: $id}}) SET {', '.join(set_parts)} RETURN s",
        id=suggestion_id,
        **updates,
    ).single()

    if not result:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    s = dict(result["s"])
    s.setdefault("band_name", None)
    s.setdefault("band_slug", None)
    s.setdefault("suggested_by_handle", None)
    return s


@router.post("/band-suggestions/{suggestion_id}/reject", status_code=200)
async def reject_suggestion(
    suggestion_id: str,
    body: AlbumSuggestionReject,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """Reject a pending suggestion with an optional reason."""
    now = datetime.now(timezone.utc).isoformat()
    result = session.run(
        """
        MATCH (s:AlbumSuggestion {id: $id})
        SET s.status = 'rejected',
            s.rejected_reason = $reason,
            s.reviewed_at = $now,
            s.reviewed_by_user_id = $admin_id
        RETURN s
        """,
        id=suggestion_id,
        reason=body.reason or "",
        now=now,
        admin_id=current_user["id"],
    ).single()

    if not result:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    return {"ok": True}


@router.delete("/band-suggestions/{suggestion_id}", status_code=204)
async def delete_suggestion(
    suggestion_id: str,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """Hard-delete a suggestion (superadmin cleanup)."""
    session.run(
        "MATCH (s:AlbumSuggestion {id: $id}) DETACH DELETE s",
        id=suggestion_id,
    )


@router.post("/band-suggestions/{suggestion_id}/accept", response_model=ReleaseResponse)
async def accept_suggestion(
    suggestion_id: str,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """Approve a suggestion: create a Release and mark the suggestion as approved (audit trail kept)."""

    # ── 1. Fetch suggestion ───────────────────────────────────────────────────
    sug_rec = session.run(
        "MATCH (s:AlbumSuggestion {id: $id}) RETURN s",
        id=suggestion_id,
    ).single()
    if not sug_rec:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    sug = dict(sug_rec["s"])
    band_id = sug["band_id"]
    title = sug["title"]
    release_type = sug.get("type") or "LP"
    year = sug.get("year") or datetime.now(timezone.utc).year

    # ── 2. Generate a unique slug ─────────────────────────────────────────────
    base_slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "release"
    slug = base_slug

    collision = session.run(
        """
        MATCH (b:Band {id: $band_id})-[:HAS_RELEASE]->(r:Release {slug: $slug})
        RETURN r LIMIT 1
        """,
        band_id=band_id,
        slug=slug,
    ).single()
    if collision:
        slug = f"{base_slug}-{str(uuid.uuid4())[:6]}"

    # ── 3. Create the release ─────────────────────────────────────────────────
    release = BandService(session).create_release(band_id, {
        "slug": slug,
        "title": title,
        "type": release_type,
        "year": int(year),
        "label": None,
        "tracks": [],
    })
    if not release:
        raise HTTPException(status_code=500, detail="Failed to create release")

    # ── 4. Mark suggestion as approved — keep node for audit trail ────────────
    now = datetime.now(timezone.utc).isoformat()
    session.run(
        """
        MATCH (s:AlbumSuggestion {id: $id})
        SET s.status = 'approved',
            s.reviewed_at = $now,
            s.reviewed_by_user_id = $admin_id,
            s.release_id = $release_id
        """,
        id=suggestion_id,
        now=now,
        admin_id=current_user["id"],
        release_id=release["id"],
    )


# ── Events: Ticketmaster sync ─────────────────────────────────────────────────

import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import BackgroundTasks

_sync_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="tm_sync")
_sync_status: dict = {"running": False, "last_result": None, "last_error": None}


def _run_sync_in_thread(api_key: str, days: int) -> None:
    """Runs the blocking Ticketmaster sync in a thread pool and stores the result."""
    from app.services.ticketmaster_sync import sync_events
    from app.db.neo4j_driver import neo4j_driver

    try:
        driver = neo4j_driver.get_driver()
        with driver.session() as session:
            result = sync_events(session, api_key, days=days)
        _sync_status["last_result"] = result
    except Exception as exc:
        _sync_status["last_error"] = str(exc)
        _sync_status["last_result"] = None
    finally:
        _sync_status["running"] = False


@router.post("/events/sync")
async def sync_events_from_ticketmaster(
    background_tasks: BackgroundTasks,
    days: int = 180,
    current_user: dict = Depends(require_admin),
):
    """
    Kick off a background Ticketmaster sync and return immediately (202).
    Poll GET /admin/events/sync/status to check progress.
    Requires TICKETMASTER_API_KEY in .env.
    """
    from app.config.settings import settings

    api_key = settings.TICKETMASTER_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="TICKETMASTER_API_KEY is not set in .env — register at developer.ticketmaster.com for a free key",
        )
    if _sync_status["running"]:
        raise HTTPException(status_code=409, detail="A sync is already in progress")

    # Set running=True synchronously before dispatching so status polls see it immediately
    _sync_status["running"] = True
    _sync_status["last_error"] = None

    loop = asyncio.get_event_loop()
    loop.run_in_executor(_sync_executor, _run_sync_in_thread, api_key, days)

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=202,
        content={"message": "Sync started in background", "days": days},
    )


@router.get("/events/sync/status")
async def get_sync_status(current_user: dict = Depends(require_admin)):
    """Poll this endpoint to check Ticketmaster sync progress."""
    return {
        "running": _sync_status["running"],
        "last_result": _sync_status["last_result"],
        "last_error": _sync_status["last_error"],
    }


@router.get("/events")
async def list_admin_events(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """List all events (admin view, including past ones)."""
    query_filter = "WHERE toLower(e.title) CONTAINS toLower($q) OR toLower(e.city) CONTAINS toLower($q)" if q else ""
    result = session.run(
        f"""
        MATCH (e:Event)
        {query_filter}
        OPTIONAL MATCH (h:Band)-[:HEADLINES]->(e)
        RETURN e.id AS id, e.title AS title, e.date AS date,
               e.venue AS venue, e.city AS city, e.country AS country,
               e.ticket_url AS ticket_url, e.source AS source,
               CASE WHEN h IS NOT NULL THEN h.name END AS headliner_name
        ORDER BY e.date DESC
        SKIP $skip LIMIT $limit
        """,
        q=q or "", skip=skip, limit=limit,
    )
    count_result = session.run(
        f"MATCH (e:Event) {query_filter} RETURN count(e) AS total",
        q=q or "",
    )
    total = (count_result.single() or {}).get("total", 0)
    events = [dict(r) for r in result]
    return {"events": events, "total": total}


@router.delete("/events/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    current_user: dict = Depends(require_admin),
    session=Depends(get_neo4j_session),
):
    """Delete an event and all its relationships."""
    result = session.run(
        "MATCH (e:Event {id: $id}) DETACH DELETE e RETURN true AS ok",
        id=event_id,
    )
    if not result.single():
        raise HTTPException(status_code=404, detail="Event not found")

    return release
