import uuid, re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user
from app.services.band_service import BandService
from app.models.band_models import BandResponse, GenreResponse, TagResponse, ReleaseDetailResponse, BandTagsAdd, BandRequestCreate
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
