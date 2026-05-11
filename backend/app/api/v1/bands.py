import uuid, re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user
from app.services.band_service import BandService
from app.models.band_models import (
    BandResponse, GenreResponse, TagResponse, ReleaseDetailResponse,
    BandTagsAdd, BandRequestCreate, AlbumSuggestionCreate,
    AlbumReviewCreate, AlbumReviewUpdate, AlbumReviewResponse, AlbumReviewsResponse,
)
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


@router.post("/{band_id}/tags", status_code=204)
async def add_tags_to_band(
    band_id: str,
    body: BandTagsAdd,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """Add one or more ontology entries (genres and/or tags) to a band.

    Uses MERGE so the operation is fully idempotent — calling it twice with
    the same IDs produces the same result without duplicates.  Unknown IDs
    are silently ignored (the MATCH inside the UNWIND simply finds nothing).
    """
    if body.genre_ids:
        session.run(
            """
            MATCH (b:Band {id: $band_id})
            UNWIND $genre_ids AS gid
            MATCH (g:Genre {id: gid})
            MERGE (b)-[:TAGGED_WITH]->(g)
            """,
            band_id=band_id,
            genre_ids=body.genre_ids,
        )
    if body.tag_ids:
        session.run(
            """
            MATCH (b:Band {id: $band_id})
            UNWIND $tag_ids AS tid
            MATCH (t:Tag {id: tid})
            MERGE (b)-[:TAGGED_WITH]->(t)
            """,
            band_id=band_id,
            tag_ids=body.tag_ids,
        )


@router.delete("/{band_id}/tags/{node_id}", status_code=204)
async def remove_tag_from_band(
    band_id: str,
    node_id: str,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """Remove a single genre or tag (identified by its node id) from a band.

    Works for both Genre and Tag nodes because both use the same
    [:TAGGED_WITH] relationship.  No-op if the relationship does not exist.
    """
    session.run(
        """
        MATCH (b:Band {id: $band_id})-[r:TAGGED_WITH]->(n {id: $node_id})
        DELETE r
        """,
        band_id=band_id,
        node_id=node_id,
    )


@router.post("/request", status_code=201)
async def request_band(
    body: BandRequestCreate,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """Any authenticated user may call this when they click on a streaming artist
    that has no matching band in the Grimr catalogue.

    Behaviour:
    - If a published band with this name already exists → return its slug so the
      frontend can navigate there immediately.
    - If a draft request for this name already exists → return it (idempotent).
    - Otherwise → create a minimal draft band with ``requested = true`` so it
      appears in the admin Draft list for review.
    """
    name = body.artist_name.strip()
    name_lower = name.lower()
    uid = current_user["id"]
    now = datetime.now(timezone.utc).isoformat()

    # ── 1. Check whether a band with this name already exists ────────────────
    existing = session.run(
        "MATCH (b:Band) WHERE toLower(trim(b.name)) = $name_lower RETURN b LIMIT 1",
        name_lower=name_lower,
    ).single()

    if existing:
        b = dict(existing["b"])
        if b.get("status") == "published":
            # Already in catalogue — return slug so frontend can navigate
            return {"status": "exists", "band_slug": b["slug"]}
        # Draft already exists (either a previous request or an admin WIP)
        return {"status": "already_requested", "band_slug": None}

    # ── 2. Generate a slug (append random suffix if collision unlikely but safe)
    base_slug = re.sub(r"[^a-z0-9]+", "-", name_lower).strip("-") or "band"
    slug = base_slug

    # ── 3. Create the draft band ─────────────────────────────────────────────
    session.run(
        """
        CREATE (b:Band {
            id: $id, slug: $slug, name: $name,
            status: 'draft',
            requested: true,
            requested_by_user_id: $uid,
            country: 'Unknown', country_code: '??', formed: 0,
            created_by_id: $uid, updated_by_id: $uid,
            created_at: $now, updated_at: $now
        })
        """,
        id=str(uuid.uuid4()), slug=slug, name=name,
        uid=uid, now=now,
    )

    return {"status": "requested", "band_slug": None}


@router.post("/{band_id}/suggest-album", status_code=201)
async def suggest_album(
    band_id: str,
    body: AlbumSuggestionCreate,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """Any authenticated user may suggest a missing album for a published band.

    Duplicate detection:
    - Same title (case-insensitive) already exists as a Release on this band → 409
    - Same title already has a pending suggestion for this band → 409
    """
    title = body.title.strip()
    title_lower = title.lower()

    # ── 1. Band must exist ────────────────────────────────────────────────────
    band_rec = session.run(
        "MATCH (b:Band {id: $band_id}) RETURN b.id AS id LIMIT 1",
        band_id=band_id,
    ).single()
    if not band_rec:
        raise HTTPException(status_code=404, detail="Band not found")

    # ── 2. Check for duplicate existing release ───────────────────────────────
    dup_rel = session.run(
        """
        MATCH (b:Band {id: $band_id})-[:HAS_RELEASE]->(r:Release)
        WHERE toLower(trim(r.title)) = $title_lower
        RETURN r LIMIT 1
        """,
        band_id=band_id,
        title_lower=title_lower,
    ).single()
    if dup_rel:
        raise HTTPException(
            status_code=409,
            detail="This release already exists in the discography",
        )

    # ── 3. Check for duplicate pending suggestion ─────────────────────────────
    dup_sug = session.run(
        """
        MATCH (s:AlbumSuggestion {band_id: $band_id, status: 'pending'})
        WHERE toLower(trim(s.title)) = $title_lower
        RETURN s LIMIT 1
        """,
        band_id=band_id,
        title_lower=title_lower,
    ).single()
    if dup_sug:
        raise HTTPException(
            status_code=409,
            detail="This album has already been suggested and is awaiting review",
        )

    # ── 4. Create the suggestion node ─────────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()
    suggestion_id = str(uuid.uuid4())
    session.run(
        """
        MATCH (b:Band {id: $band_id})
        CREATE (s:AlbumSuggestion {
            id: $id,
            title: $title,
            type: $type,
            year: $year,
            band_id: $band_id,
            suggested_by_user_id: $uid,
            status: 'pending',
            created_at: $now,
            reviewer_note: null,
            rejected_reason: null,
            reviewed_at: null,
            reviewed_by_user_id: null
        })
        CREATE (s)-[:SUGGESTED_FOR]->(b)
        """,
        band_id=band_id,
        id=suggestion_id,
        title=title,
        type=body.type,
        year=body.year,
        uid=current_user["id"],
        now=now,
    )

    # ── 5. Notify all admin/superadmin users ──────────────────────────────────
    band_name_rec = session.run(
        "MATCH (b:Band {id: $band_id}) RETURN b.name AS name LIMIT 1",
        band_id=band_id,
    ).single()
    band_display = band_name_rec["name"] if band_name_rec else band_id

    user_handle = current_user.get("handle") or current_user.get("email", "Someone")

    session.run(
        """
        MATCH (admin:User) WHERE admin.role IN ['admin', 'superadmin'] AND admin.id <> $submitter_id
        CREATE (n:Notification {
            id: randomUUID(),
            user_id: admin.id,
            type: 'album_suggestion',
            title: $notif_title,
            body: $notif_body,
            read: false,
            created_at: $now
        })
        """,
        submitter_id=current_user["id"],
        notif_title=f"{band_display} — new album suggestion",
        notif_body=f'{user_handle} suggested "{title}"',
        now=now,
    )

    return {"id": suggestion_id, "status": "pending"}


@router.get("/{slug}/releases/{release_slug}", response_model=ReleaseDetailResponse)
async def get_release_by_slug(slug: str, release_slug: str, session=Depends(get_neo4j_session)):
    result = BandService(session).get_release_by_slug(slug, release_slug)
    if not result:
        raise HTTPException(status_code=404, detail="Release not found")
    return result


@router.get("/{slug}", response_model=BandResponse)
async def get_band(slug: str, session=Depends(get_neo4j_session)):
    band = BandService(session).get_band_by_slug(slug)
    if not band:
        raise HTTPException(status_code=404, detail="Band not found")
    return band


# ── Album Reviews ─────────────────────────────────────────────────────────────

def _resolve_release(slug: str, release_slug: str, session) -> str:
    """Return the release id for band slug + release slug, or raise 404."""
    rec = session.run(
        """
        MATCH (b:Band {slug: $slug})-[:HAS_RELEASE]->(r:Release {slug: $rslug})
        RETURN r.id AS release_id
        """,
        slug=slug, rslug=release_slug,
    ).single()
    if not rec:
        raise HTTPException(status_code=404, detail="Release not found")
    return rec["release_id"]


@router.get("/{slug}/releases/{release_slug}/reviews", response_model=AlbumReviewsResponse)
async def list_reviews(
    slug: str,
    release_slug: str,
    session=Depends(get_neo4j_session),
    current_user: Optional[dict] = Depends(get_current_user),
):
    """All reviews for a release, plus the caller's own review if authenticated."""
    release_id = _resolve_release(slug, release_slug, session)

    records = session.run(
        """
        MATCH (rv:AlbumReview {release_id: $rid})<-[:WROTE_REVIEW]-(u:User)
        RETURN rv, u.handle AS handle, u.avatar_url AS avatar_url
        ORDER BY rv.created_at DESC
        """,
        rid=release_id,
    ).data()

    reviews = []
    for r in records:
        rv = dict(r["rv"])
        reviews.append(AlbumReviewResponse(
            id=rv["id"],
            release_id=rv["release_id"],
            user_id=rv["user_id"],
            user_handle=r["handle"] or "unknown",
            user_avatar_url=r["avatar_url"],
            rating=rv["rating"],
            body=rv.get("body"),
            created_at=rv["created_at"],
            updated_at=rv.get("updated_at"),
        ))

    avg = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else None
    my_review = None
    if current_user:
        my_review = next((r for r in reviews if r.user_id == current_user["id"]), None)

    return AlbumReviewsResponse(reviews=reviews, avg_rating=avg, count=len(reviews), my_review=my_review)


@router.post("/{slug}/releases/{release_slug}/reviews", response_model=AlbumReviewResponse, status_code=200)
async def upsert_review(
    slug: str,
    release_slug: str,
    body: AlbumReviewCreate,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """Create or update the authenticated user's review for a release (one per user)."""
    release_id = _resolve_release(slug, release_slug, session)
    now = datetime.now(timezone.utc).isoformat()
    review_id = str(uuid.uuid4())

    rec = session.run(
        """
        MATCH (u:User {id: $uid})
        MERGE (u)-[:WROTE_REVIEW]->(rv:AlbumReview {release_id: $rid, user_id: $uid})
        ON CREATE SET
            rv.id         = $new_id,
            rv.release_id = $rid,
            rv.user_id    = $uid,
            rv.rating     = $rating,
            rv.body       = $body_text,
            rv.created_at = $now,
            rv.updated_at = $now
        ON MATCH SET
            rv.rating     = $rating,
            rv.body       = $body_text,
            rv.updated_at = $now
        RETURN rv, u.handle AS handle, u.avatar_url AS avatar_url
        """,
        uid=current_user["id"],
        rid=release_id,
        new_id=review_id,
        rating=body.rating,
        body_text=body.body or None,
        now=now,
    ).single()

    if not rec:
        raise HTTPException(status_code=500, detail="Failed to save review")

    rv = dict(rec["rv"])
    return AlbumReviewResponse(
        id=rv["id"],
        release_id=rv["release_id"],
        user_id=rv["user_id"],
        user_handle=rec["handle"] or "unknown",
        user_avatar_url=rec["avatar_url"],
        rating=rv["rating"],
        body=rv.get("body"),
        created_at=rv["created_at"],
        updated_at=rv.get("updated_at"),
    )


@router.delete("/{slug}/releases/{release_slug}/reviews", status_code=204)
async def delete_review(
    slug: str,
    release_slug: str,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """Delete the authenticated user's review for a release."""
    release_id = _resolve_release(slug, release_slug, session)
    session.run(
        """
        MATCH (u:User {id: $uid})-[:WROTE_REVIEW]->(rv:AlbumReview {release_id: $rid})
        DETACH DELETE rv
        """,
        uid=current_user["id"],
        rid=release_id,
    )
