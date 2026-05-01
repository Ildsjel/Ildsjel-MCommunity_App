"""
Last.fm API Endpoints — auth, status, top artists, merged view
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.services.lastfm_client import LastFmClient
from app.services import lastfm_sync_service
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user
from app.config.settings import settings

router = APIRouter(prefix="/lastfm", tags=["Last.fm"])

LASTFM_CALLBACK = "http://127.0.0.1:3001/lastfm/connect"


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.get("/auth/url")
async def get_lastfm_auth_url(current_user: dict = Depends(get_current_user)):
    client = LastFmClient(settings.LASTFM_API_KEY, settings.LASTFM_API_SECRET)
    return {"auth_url": client.get_auth_url(LASTFM_CALLBACK)}


@router.post("/auth/callback")
async def lastfm_auth_callback(
    body: dict,
    background_tasks: BackgroundTasks,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    token = body.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")

    client = LastFmClient(settings.LASTFM_API_KEY, settings.LASTFM_API_SECRET)
    try:
        lfm_session = await client.get_session(token)
        username = lfm_session["name"]
        session_key = lfm_session["key"]

        session.run(
            """
            MATCH (u:User {id: $uid})
            SET u.lastfm_session_key  = $sk,
                u.lastfm_username     = $username,
                u.lastfm_connected_at = datetime(),
                u.source_accounts     = CASE
                    WHEN 'lastfm' IN u.source_accounts THEN u.source_accounts
                    ELSE u.source_accounts + 'lastfm'
                END
            """,
            uid=current_user["id"],
            sk=session_key,
            username=username,
        )

        background_tasks.add_task(
            lastfm_sync_service.sync_top_artists,
            user_id=current_user["id"],
            lastfm_username=username,
        )
        background_tasks.add_task(
            lastfm_sync_service.sync_top_albums,
            user_id=current_user["id"],
            lastfm_username=username,
        )

        return {"message": "Last.fm connected", "username": username}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect Last.fm: {e}")
    finally:
        await client.close()


# ── Status / disconnect ───────────────────────────────────────────────────────

@router.get("/status")
async def get_lastfm_status(
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    rec = session.run(
        """
        MATCH (u:User {id: $uid})
        // Self-heal: if session key exists but source_accounts is missing 'lastfm', add it
        WITH u,
             u.lastfm_session_key IS NOT NULL AS connected,
             u.lastfm_username AS username,
             u.lastfm_total_plays AS total_plays
        FOREACH (_ IN CASE WHEN connected AND NOT 'lastfm' IN u.source_accounts THEN [1] ELSE [] END |
            SET u.source_accounts = u.source_accounts + 'lastfm'
        )
        RETURN connected AS is_connected, username, total_plays
        """,
        uid=current_user["id"],
    ).single()

    if not rec or not rec["is_connected"]:
        return {"is_connected": False, "total_plays": 0, "total_artists": 0}

    count_rec = session.run(
        "MATCH (u:User {id: $uid})-[:TOP_ARTIST {source: 'lastfm'}]->() RETURN count(*) AS n",
        uid=current_user["id"],
    ).single()

    return {
        "is_connected": True,
        "username": rec["username"],
        "total_plays": rec["total_plays"] or 0,
        "total_artists": count_rec["n"] if count_rec else 0,
    }


@router.post("/disconnect")
async def disconnect_lastfm(
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    session.run(
        """
        MATCH (u:User {id: $uid})
        SET u.lastfm_session_key  = null,
            u.lastfm_username     = null,
            u.lastfm_connected_at = null,
            u.source_accounts     = [x IN u.source_accounts WHERE x <> 'lastfm']
        """,
        uid=current_user["id"],
    )
    session.run(
        "MATCH (u:User {id: $uid})-[r:TOP_ARTIST {source: 'lastfm'}]->() DELETE r",
        uid=current_user["id"],
    )
    return {"message": "Last.fm disconnected"}


# ── Top artists (merged across sources) ──────────────────────────────────────

@router.get("/top/artists")
async def get_merged_top_artists(
    limit: int = 10,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns top artists merged from all connected sources (Spotify + Last.fm).
    Deduplication happens at the Neo4j level via the shared Artist node.
    Last.fm play count is preferred for ranking when available.
    """
    result = session.run(
        """
        MATCH (u:User {id: $uid})-[r:TOP_ARTIST]->(a:Artist)
        WITH a,
             min(r.rank) AS best_rank,
             sum(COALESCE(toInteger(r.play_count), 0)) AS play_count,
             collect(DISTINCT r.source) AS sources
        RETURN a.name               AS name,
               a.spotify_id         AS spotify_id,
               a.lastfm_mbid        AS mbid,
               a.spotify_image_url  AS image_url,
               best_rank            AS rank,
               play_count,
               sources
        ORDER BY
            CASE WHEN play_count > 0 THEN play_count ELSE -best_rank END DESC
        LIMIT $limit
        """,
        uid=current_user["id"],
        limit=limit,
    )
    artists = []
    for i, r in enumerate(result, 1):
        artists.append({
            "name": r["name"],
            "spotify_id": r["spotify_id"],
            "mbid": r["mbid"],
            "image_url": r["image_url"],
            "rank": i,
            "play_count": r["play_count"] or 0,
            "sources": list(r["sources"]),
        })
    return {"artists": artists}


# ── Top albums ───────────────────────────────────────────────────────────────

@router.get("/top/albums")
async def get_top_albums(
    background_tasks: BackgroundTasks,
    limit: int = 10,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    result = session.run(
        """
        MATCH (u:User {id: $uid})-[r:TOP_ALBUM]->(a:Album)
        WITH a,
             min(r.rank) AS best_rank,
             sum(COALESCE(toInteger(r.play_count), 0)) AS play_count,
             collect(DISTINCT r.source) AS sources
        RETURN a.id AS id, a.name AS name, a.artist_name AS artist_name,
               a.image_url AS image_url, best_rank AS rank, play_count, sources
        ORDER BY CASE WHEN play_count > 0 THEN play_count ELSE -best_rank END DESC
        LIMIT $limit
        """,
        uid=current_user["id"],
        limit=limit,
    )
    albums = [
        {
            "id": r["id"],
            "name": r["name"],
            "artist_name": r["artist_name"],
            "image_url": r["image_url"],
            "rank": r["rank"],
            "play_count": r["play_count"] or 0,
            "sources": list(r["sources"]),
        }
        for r in result
    ]

    # Auto-trigger Last.fm album sync the first time if the service is connected but no albums stored yet.
    # Spotify doesn't expose a top-albums endpoint, so it's not included here.
    if not albums:
        user_rec = session.run(
            """
            MATCH (u:User {id: $uid})
            RETURN u.lastfm_session_key IS NOT NULL AS has_lfm,
                   u.lastfm_username AS lfm_user
            """,
            uid=current_user["id"],
        ).single()
        if user_rec and user_rec["has_lfm"] and user_rec["lfm_user"]:
            background_tasks.add_task(
                lastfm_sync_service.sync_top_albums,
                user_id=current_user["id"],
                lastfm_username=user_rec["lfm_user"],
            )

    return {"albums": albums}
