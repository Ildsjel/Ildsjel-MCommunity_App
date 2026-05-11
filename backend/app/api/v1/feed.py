from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.jwt_handler import decode_access_token, get_current_user
from app.db.neo4j_driver import get_neo4j_session

router = APIRouter(prefix="/feed", tags=["Feed"])

# Optional bearer — returns None when no Authorization header is present
_optional_bearer = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
) -> Optional[dict]:
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return {"id": user_id, "email": payload.get("email")}


# ---------------------------------------------------------------------------
# GET /api/v1/feed/reviews
# ---------------------------------------------------------------------------

@router.get("/reviews")
async def get_review_feed(
    filter: str = Query("all", description="all | coven | near"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    session=Depends(get_neo4j_session),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """Paginated community review stream."""
    if filter == "coven":
        if not current_user:
            return []

        result = session.run(
            """
            MATCH (me:User {id: $user_id})-[:FRIEND_REQUEST {status: 'accepted'}]-(u:User)
            MATCH (rv:AlbumReview)<-[:WROTE_REVIEW]-(u)
            MATCH (rv)-[:REVIEWS]->(rel:Release)<-[:HAS_RELEASE]-(b:Band)
            RETURN rv, u.handle AS handle, u.avatar_url AS avatar_url,
                   u.id AS user_id,
                   rel.slug AS release_slug, rel.title AS release_title,
                   rel.type AS release_type, rel.year AS release_year,
                   b.slug AS band_slug, b.name AS band_name
            ORDER BY rv.created_at DESC
            SKIP $skip LIMIT $limit
            """,
            user_id=current_user["id"],
            skip=skip,
            limit=limit,
        ).data()

    elif filter == "near":
        # Near filter: same Cypher as "all" for now (no geo-filter on reviews yet)
        result = session.run(
            """
            MATCH (rv:AlbumReview)<-[:WROTE_REVIEW]-(u:User)
            MATCH (rv)-[:REVIEWS]->(rel:Release)<-[:HAS_RELEASE]-(b:Band)
            RETURN rv, u.handle AS handle, u.avatar_url AS avatar_url,
                   u.id AS user_id,
                   rel.slug AS release_slug, rel.title AS release_title,
                   rel.type AS release_type, rel.year AS release_year,
                   b.slug AS band_slug, b.name AS band_name
            ORDER BY rv.created_at DESC
            SKIP $skip LIMIT $limit
            """,
            skip=skip,
            limit=limit,
        ).data()

    else:
        # "all" (default)
        result = session.run(
            """
            MATCH (rv:AlbumReview)<-[:WROTE_REVIEW]-(u:User)
            MATCH (rv)-[:REVIEWS]->(rel:Release)<-[:HAS_RELEASE]-(b:Band)
            RETURN rv, u.handle AS handle, u.avatar_url AS avatar_url,
                   u.id AS user_id,
                   rel.slug AS release_slug, rel.title AS release_title,
                   rel.type AS release_type, rel.year AS release_year,
                   b.slug AS band_slug, b.name AS band_name
            ORDER BY rv.created_at DESC
            SKIP $skip LIMIT $limit
            """,
            skip=skip,
            limit=limit,
        ).data()

    items = []
    for r in result:
        rv = dict(r["rv"])
        items.append({
            "id": rv.get("id"),
            "user_id": r["user_id"],
            "user_handle": r["handle"] or "unknown",
            "user_avatar_url": r["avatar_url"],
            "rating": rv.get("rating"),
            "body": rv.get("body"),
            "created_at": rv.get("created_at"),
            "band_name": r["band_name"],
            "band_slug": r["band_slug"],
            "release_title": r["release_title"],
            "release_slug": r["release_slug"],
            "release_type": r["release_type"],
            "release_year": r["release_year"],
            "horns_count": 0,
        })

    return items


# ---------------------------------------------------------------------------
# GET /api/v1/feed/reviews/count
# ---------------------------------------------------------------------------

@router.get("/reviews/count")
async def get_review_count(
    since: Optional[str] = Query(None, description="ISO timestamp; defaults to 24h ago"),
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """Count of reviews from the coven posted since a given timestamp (default: last 24h)."""
    if since:
        cutoff = since
    else:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    result = session.run(
        """
        MATCH (me:User {id: $user_id})-[:FRIEND_REQUEST {status: 'accepted'}]-(u:User)
        MATCH (rv:AlbumReview)<-[:WROTE_REVIEW]-(u)
        WHERE rv.created_at >= $cutoff
        RETURN count(rv) AS n
        """,
        user_id=current_user["id"],
        cutoff=cutoff,
    ).single()

    pending = result["n"] if result else 0
    return {"pending_coven": pending}
