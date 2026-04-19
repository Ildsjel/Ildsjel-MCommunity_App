"""
Last.fm API Endpoints — auth, status, top artists, merged view
"""
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from app.services.lastfm_client import LastFmClient
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user
from app.config.settings import settings

router = APIRouter(prefix="/lastfm", tags=["Last.fm"])

LASTFM_CALLBACK = "http://127.0.0.1:3001/lastfm/connect"


# ── Auth ─────────────────────────���────────────────────���───────────────────────

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
            _sync_lastfm_top_artists_bg,
            user_id=current_user["id"],
            lastfm_username=username,
        )
        background_tasks.add_task(
            _sync_lastfm_top_albums_bg,
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

    # Auto-trigger syncs the first time if services are connected but no albums stored yet
    if not albums:
        user_rec = session.run(
            """
            MATCH (u:User {id: $uid})
            RETURN u.lastfm_session_key IS NOT NULL AS has_lfm,
                   u.lastfm_username AS lfm_user,
                   u.spotify_access_token IS NOT NULL AS has_spotify,
                   u.spotify_access_token AS spotify_token
            """,
            uid=current_user["id"],
        ).single()
        if user_rec:
            if user_rec["has_lfm"] and user_rec["lfm_user"]:
                background_tasks.add_task(
                    _sync_lastfm_top_albums_bg,
                    user_id=current_user["id"],
                    lastfm_username=user_rec["lfm_user"],
                )
            if user_rec["has_spotify"] and user_rec["spotify_token"]:
                from app.api.v1.spotify import _sync_top_albums_bg as _spotify_albums_sync
                background_tasks.add_task(
                    _spotify_albums_sync,
                    user_id=current_user["id"],
                    access_token=user_rec["spotify_token"],
                )

    return {"albums": albums}


# ── Background task ───────────────────────────────���───────────────────────────

async def _sync_lastfm_top_artists_bg(user_id: str, lastfm_username: str):
    print(f"🎵 Syncing Last.fm top artists for {lastfm_username}")
    from app.db.neo4j_driver import neo4j_driver

    client = LastFmClient(settings.LASTFM_API_KEY, settings.LASTFM_API_SECRET)
    try:
        top_data, info_data, tags_data = await asyncio.gather(
            client.get_user_top_artists(lastfm_username, period="overall", limit=50),
            client.get_user_info(lastfm_username),
            client.get_user_top_tags(lastfm_username, limit=20),
        )
        artists = top_data.get("topartists", {}).get("artist", [])
        if isinstance(artists, dict):
            artists = [artists]

        total_plays = int(info_data.get("user", {}).get("playcount", 0))

        raw_tags = tags_data.get("toptags", {}).get("tag", [])
        if isinstance(raw_tags, dict):
            raw_tags = [raw_tags]
        top_tags = [t["name"] for t in raw_tags if t.get("name")]

        with neo4j_driver.get_driver().session() as db:
            db.run(
                "MATCH (u:User {id: $uid}) SET u.lastfm_total_plays = $tp, u.lastfm_top_tags = $tags",
                uid=user_id, tp=total_plays, tags=top_tags,
            )
            db.run(
                "MATCH (u:User {id: $uid})-[r:TOP_ARTIST {source: 'lastfm'}]->() DELETE r",
                uid=user_id,
            )
            for rank, artist in enumerate(artists, 1):
                name = artist["name"]
                mbid = artist.get("mbid") or None
                play_count = int(artist.get("playcount", 0))
                name_norm = name.lower().strip()

                # Always MERGE by name_normalized so Spotify and Last.fm share the same node.
                # lastfm_mbid is stored as additional data, not as the primary key.
                db.run(
                    """
                    MERGE (a:Artist {name_normalized: $name_norm})
                    ON CREATE SET a.id = randomUUID(), a.created_at = datetime()
                    SET a.name = $name,
                        a.name_normalized = $name_norm,
                        a.lastfm_name = $name,
                        a.lastfm_mbid = CASE WHEN $mbid IS NOT NULL THEN $mbid
                                             ELSE a.lastfm_mbid END,
                        a.updated_at = datetime()
                    WITH a
                    MATCH (u:User {id: $uid})
                    CREATE (u)-[:TOP_ARTIST {rank: $rank, time_range: 'overall',
                                             source: 'lastfm', play_count: $pc}]->(a)
                    """,
                    name_norm=name_norm, name=name, mbid=mbid,
                    uid=user_id, rank=rank, pc=play_count,
                )

        print(f"✅ Last.fm sync complete — {len(artists)} artists for {lastfm_username}")
    except Exception as e:
        print(f"❌ Last.fm sync failed: {e}")
    finally:
        await client.close()


async def _sync_lastfm_top_albums_bg(user_id: str, lastfm_username: str):
    print(f"💿 Syncing Last.fm top albums for {lastfm_username}")
    from app.db.neo4j_driver import neo4j_driver

    client = LastFmClient(settings.LASTFM_API_KEY, settings.LASTFM_API_SECRET)
    try:
        data = await client.get_user_top_albums(lastfm_username, period="overall", limit=50)
        albums = data.get("topalbums", {}).get("album", [])
        if isinstance(albums, dict):
            albums = [albums]

        with neo4j_driver.get_driver().session() as db:
            db.run(
                "MATCH (u:User {id: $uid})-[r:TOP_ALBUM]->() DELETE r",
                uid=user_id,
            )
            for rank, album in enumerate(albums, 1):
                name = album["name"]
                artist_name = album.get("artist", {}).get("name", "")
                mbid = album.get("mbid") or None
                play_count = int(album.get("playcount", 0))
                image_url = next(
                    (img.get("#text") for img in album.get("image", [])
                     if img.get("size") == "extralarge" and img.get("#text")),
                    next(
                        (img.get("#text") for img in album.get("image", [])
                         if img.get("size") == "large" and img.get("#text")),
                        None,
                    ),
                )

                name_norm = f"{artist_name.lower().strip()}::{name.lower().strip()}"
                # Always MERGE by name_normalized — same key Spotify uses — to prevent duplicates.
                db.run(
                    """
                    MERGE (a:Album {name_normalized: $name_norm})
                    ON CREATE SET a.id = randomUUID(), a.created_at = datetime()
                    SET a.name = $name,
                        a.artist_name = $artist_name,
                        a.image_url = CASE WHEN $image_url IS NOT NULL THEN $image_url
                                          ELSE a.image_url END,
                        a.lastfm_mbid = CASE WHEN $mbid IS NOT NULL THEN $mbid
                                             ELSE a.lastfm_mbid END,
                        a.updated_at = datetime()
                    WITH a
                    MATCH (u:User {id: $uid})
                    CREATE (u)-[:TOP_ALBUM {rank: $rank, play_count: $pc,
                                            source: 'lastfm', period: 'overall'}]->(a)
                    """,
                    name_norm=name_norm, name=name, artist_name=artist_name,
                    image_url=image_url, mbid=mbid,
                    uid=user_id, rank=rank, pc=play_count,
                )

        print(f"✅ Last.fm album sync complete — {len(albums)} albums for {lastfm_username}")
    except Exception as e:
        print(f"❌ Last.fm album sync failed: {e}")
    finally:
        await client.close()
