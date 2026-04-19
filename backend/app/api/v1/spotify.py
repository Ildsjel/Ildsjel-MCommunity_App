"""
Spotify API Endpoints
OAuth flow, connection management, scrobbling
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import Optional
from datetime import datetime
from app.models.spotify_models import (
    SpotifyTokenRequest,
    SpotifyConnectionStatus
)
from app.services.spotify_client import SpotifyClient
from app.services.spotify_scrobble_service import SpotifyScrobbleService
from app.db.neo4j_driver import get_neo4j_session
from app.db.repositories.spotify_repository import SpotifyRepository
from app.auth.jwt_handler import get_current_user

router = APIRouter(prefix="/spotify", tags=["Spotify"])

# In-memory storage for PKCE state (use Redis in production!)
_pkce_storage = {}


@router.get("/auth/url")
async def get_spotify_auth_url(
    current_user: dict = Depends(get_current_user)
):
    """
    Get Spotify authorization URL for OAuth flow
    
    Returns URL with PKCE challenge for secure OAuth
    """
    import secrets
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    
    # Generate PKCE pair
    code_verifier, code_challenge = SpotifyClient.generate_pkce_pair()
    
    # Keep a server-side copy as fallback (non-persistent, best-effort)
    _pkce_storage[state] = {
        "code_verifier": code_verifier,
        "user_id": current_user["id"],
        "created_at": datetime.utcnow()
    }

    auth_url = SpotifyClient.get_authorization_url(state, code_challenge)

    # Return code_verifier so the client can persist it across redirects
    return {
        "auth_url": auth_url,
        "state": state,
        "code_verifier": code_verifier,
    }


@router.post("/auth/callback")
async def spotify_auth_callback(
    token_request: SpotifyTokenRequest,
    background_tasks: BackgroundTasks,
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Handle Spotify OAuth callback
    
    Exchange authorization code for tokens and save to database
    """
    state = token_request.state

    # Prefer client-supplied code_verifier (survives backend restarts).
    # Fall back to server-side storage for clients that don't send it.
    if token_request.code_verifier:
        code_verifier = token_request.code_verifier
        _pkce_storage.pop(state, None)  # clean up if present
    elif state and state in _pkce_storage:
        pkce_data = _pkce_storage.pop(state)
        code_verifier = pkce_data["code_verifier"]
        if pkce_data["user_id"] != current_user["id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User mismatch")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing code_verifier — please try connecting again",
        )
    
    # Exchange code for tokens
    client = SpotifyClient()
    try:
        token_data = await client.exchange_code_for_token(
            code=token_request.code,
            code_verifier=code_verifier
        )
        
        # Log granted scopes for debugging
        import logging
        logging.getLogger(__name__).info(
            "Spotify token granted scopes: %s", token_data.get("scope", "NONE")
        )

        # Get Spotify user profile
        client.access_token = token_data["access_token"]
        profile = await client.get_current_user_profile()
        
        # Save tokens to database
        repository = SpotifyRepository(session)
        repository.save_spotify_tokens(
            user_id=current_user["id"],
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            expires_in=token_data["expires_in"],
            scopes=token_data["scope"].split(),
            spotify_user_id=profile.get("id")
        )

        # Sync top artists and albums in background
        background_tasks.add_task(
            _sync_top_artists_bg,
            user_id=current_user["id"],
            access_token=token_data["access_token"]
        )
        background_tasks.add_task(
            _sync_top_albums_bg,
            user_id=current_user["id"],
            access_token=token_data["access_token"]
        )
        
        return {
            "message": "Spotify connected successfully",
            "spotify_user_id": profile.get("id"),
            "display_name": profile.get("display_name")
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect Spotify: {str(e)}"
        )
    finally:
        await client.close()


@router.get("/status", response_model=SpotifyConnectionStatus)
async def get_spotify_status(
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """Get user's Spotify connection status"""
    repository = SpotifyRepository(session)
    tokens = repository.get_spotify_tokens(current_user["id"])

    if not tokens:
        return SpotifyConnectionStatus(
            user_id=current_user["id"],
            is_connected=False,
        )

    result = session.run(
        "MATCH (u:User {id: $uid})-[:TOP_ARTIST {time_range: 'medium_term'}]->() RETURN count(*) AS total",
        uid=current_user["id"]
    )
    record = result.single()
    total_artists = record["total"] if record else 0

    return SpotifyConnectionStatus(
        user_id=current_user["id"],
        is_connected=True,
        total_artists=total_artists,
    )


@router.post("/disconnect")
async def disconnect_spotify(
    background_tasks: BackgroundTasks,
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Disconnect Spotify account and delete all Spotify data (DSGVO Art. 17)
    
    This will:
    1. Delete OAuth tokens immediately
    2. Schedule deletion of all Spotify plays within 24h
    3. Delete orphaned tracks/artists/albums
    4. Log deletion for audit trail
    """
    # 1. Delete tokens immediately
    query_tokens = """
    MATCH (u:User {id: $user_id})
    SET u.spotify_access_token = null,
        u.spotify_refresh_token = null,
        u.spotify_token_expires_at = null,
        u.spotify_scopes = null,
        u.spotify_user_id = null,
        u.spotify_connected_at = null,
        u.spotify_disconnected_at = datetime(),
        u.source_accounts = [x IN u.source_accounts WHERE x <> 'spotify']
    RETURN u
    """
    
    result = session.run(query_tokens, user_id=current_user["id"])
    if not result.single():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 2. Schedule data deletion in background (DSGVO: within 24h)
    background_tasks.add_task(
        _delete_spotify_data,
        user_id=current_user["id"]
    )
    
    return {
        "message": "Spotify disconnected. All data will be deleted within 24 hours.",
        "deleted_immediately": ["tokens", "connection_status"],
        "scheduled_for_deletion": ["plays", "tracks", "artists", "albums"],
        "retention_period": "24 hours"
    }


@router.post("/sync/backfill")
async def trigger_backfill(
    background_tasks: BackgroundTasks,
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Manually trigger backfill of recently played tracks
    
    Fetches last 50 plays from Spotify and imports them
    """
    repository = SpotifyRepository(session)
    tokens = repository.get_spotify_tokens(current_user["id"])
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Spotify not connected"
        )
    
    # Check if token expired
    from datetime import timezone
    now = datetime.now(timezone.utc)
    expires_at = tokens["expires_at"]
    
    # Make expires_at timezone-aware if it isn't
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < now:
        # Refresh token
        client = SpotifyClient()
        try:
            new_tokens = await client.refresh_access_token(tokens["refresh_token"])
            repository.update_access_token(
                user_id=current_user["id"],
                access_token=new_tokens["access_token"],
                expires_in=new_tokens["expires_in"]
            )
            access_token = new_tokens["access_token"]
        finally:
            await client.close()
    else:
        access_token = tokens["access_token"]
    
    # Run backfill synchronously (immediate execution)
    result = await _run_backfill_sync(
        user_id=current_user["id"],
        access_token=access_token
    )
    
    return result


@router.get("/debug/recently-played")
async def debug_recently_played(
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Debug endpoint to see raw Spotify recently played data
    """
    repository = SpotifyRepository(session)
    tokens = repository.get_spotify_tokens(current_user["id"])
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Spotify not connected"
        )
    
    client = SpotifyClient(access_token=tokens["access_token"])
    try:
        recently_played = await client.get_recently_played(limit=10)
        return {
            "items_count": len(recently_played.get("items", [])),
            "raw_response": recently_played
        }
    finally:
        await client.close()


@router.get("/timeline")
async def get_listening_timeline(
    limit: int = 50,
    offset: int = 0,
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's listening timeline (recent scrobbles)
    
    Returns chronological list of played tracks
    """
    query = """
    MATCH (u:User {id: $user_id})-[:PLAYED]->(p:Play)-[:OF_TRACK]->(t:Track)
    MATCH (t)<-[:PERFORMED]-(a:Artist)
    OPTIONAL MATCH (t)-[:ON_ALBUM]->(al:Album)
    WITH p, t, a, al
    ORDER BY p.played_at DESC
    SKIP $offset
    LIMIT $limit
    RETURN p.id as play_id,
           p.played_at as played_at,
           p.duration_ms as duration_ms,
           p.progress_ms as progress_ms,
           t.id as track_id,
           t.name as track_name,
           t.spotify_uri as track_uri,
           a.id as artist_id,
           a.name as artist_name,
           al.id as album_id,
           al.name as album_name,
           al.image_url as album_image
    """
    
    result = session.run(query, user_id=current_user["id"], offset=offset, limit=limit)
    
    timeline = []
    for record in result:
        timeline.append({
            "play_id": record["play_id"],
            "played_at": record["played_at"].isoformat() if record["played_at"] else None,
            "track": {
                "id": record["track_id"],
                "name": record["track_name"],
                "uri": record["track_uri"],
                "duration_ms": record["duration_ms"],
                "progress_ms": record["progress_ms"]
            },
            "artist": {
                "id": record["artist_id"],
                "name": record["artist_name"]
            },
            "album": {
                "id": record["album_id"],
                "name": record["album_name"],
                "image_url": record["album_image"]
            } if record["album_id"] else None
        })
    
    return {
        "timeline": timeline,
        "count": len(timeline),
        "offset": offset,
        "limit": limit
    }


@router.get("/timeline/{user_id}")
async def get_user_listening_timeline(
    user_id: str,
    limit: int = 50,
    offset: int = 0,
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get another user's listening timeline (public)
    
    Returns chronological list of played tracks for any user
    """
    cypher_query = """
    MATCH (u:User {id: $user_id})-[:PLAYED]->(p:Play)-[:OF_TRACK]->(t:Track)
    MATCH (t)<-[:PERFORMED]-(a:Artist)
    OPTIONAL MATCH (t)-[:ON_ALBUM]->(al:Album)
    WITH p, t, a, al
    ORDER BY p.played_at DESC
    SKIP $offset
    LIMIT $limit
    RETURN p.id as play_id,
           p.played_at as played_at,
           p.duration_played_ms as duration_ms,
           0 as progress_ms,
           t.id as track_id,
           t.name as track_name,
           t.uri as track_uri,
           a.id as artist_id,
           a.name as artist_name,
           al.id as album_id,
           al.name as album_name,
           al.image_url as album_image
    """
    
    result = session.run(cypher_query, user_id=user_id, offset=offset, limit=limit)
    
    timeline = []
    for record in result:
        timeline.append({
            "play_id": record["play_id"],
            "played_at": record["played_at"].isoformat() if record["played_at"] else None,
            "track": {
                "id": record["track_id"],
                "name": record["track_name"],
                "uri": record["track_uri"],
                "duration_ms": record["duration_ms"],
                "progress_ms": record["progress_ms"]
            },
            "artist": {
                "id": record["artist_id"],
                "name": record["artist_name"]
            },
            "album": {
                "id": record["album_id"],
                "name": record["album_name"],
                "image_url": record["album_image"]
            } if record["album_id"] else None
        })
    
    return {
        "timeline": timeline,
        "count": len(timeline),
        "offset": offset,
        "limit": limit
    }


@router.get("/stats")
async def get_listening_stats(
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """Get user's listening statistics"""
    scrobble_service = SpotifyScrobbleService(session)
    stats = scrobble_service.get_user_listening_stats(current_user["id"])
    
    return stats


@router.get("/top/artists")
async def get_top_artists(
    limit: int = 10,
    time_range: str = "medium_term",
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """Get user's top artists from stored Spotify data (medium_term by default)"""
    result = session.run(
        """
        MATCH (u:User {id: $uid})-[r:TOP_ARTIST {time_range: $tr}]->(a:Artist)
        RETURN a.name AS name, a.spotify_id AS spotify_id,
               a.genres AS genres, a.spotify_image_url AS image_url,
               r.rank AS rank
        ORDER BY r.rank ASC
        LIMIT $limit
        """,
        uid=current_user["id"], tr=time_range, limit=limit
    )
    artists = [
        {
            "name": r["name"],
            "spotify_id": r["spotify_id"],
            "genres": r["genres"] or [],
            "image_url": r["image_url"],
            "rank": r["rank"],
        }
        for r in result
    ]
    return {"artists": artists}


# ============= Background Tasks =============

async def _sync_top_artists_bg(user_id: str, access_token: str):
    """Sync top artists from Spotify into Neo4j (background)"""
    print(f"🎵 Syncing top artists for user {user_id}")
    from app.db.neo4j_driver import neo4j_driver
    client = SpotifyClient(access_token=access_token)
    try:
        with neo4j_driver.get_driver().session() as session:
            for time_range in ["short_term", "medium_term", "long_term"]:
                data = await client.get_user_top_artists(time_range=time_range, limit=50)
                artists = data.get("items", [])
                session.run(
                    "MATCH (u:User {id: $uid})-[r:TOP_ARTIST {time_range: $tr}]->() DELETE r",
                    uid=user_id, tr=time_range
                )
                for rank, artist in enumerate(artists, 1):
                    image_url = artist["images"][0]["url"] if artist.get("images") else None
                    name = artist["name"]
                    name_norm = name.lower().strip()
                    session.run(
                        """
                        MERGE (a:Artist {name_normalized: $name_norm})
                        ON CREATE SET a.id = randomUUID(), a.created_at = datetime()
                        SET a.name = $name,
                            a.name_normalized = $name_norm,
                            a.spotify_id = $spotify_id,
                            a.genres = $genres,
                            a.spotify_image_url = $image_url,
                            a.updated_at = datetime()
                        WITH a
                        MATCH (u:User {id: $uid})
                        CREATE (u)-[:TOP_ARTIST {rank: $rank, time_range: $tr, source: 'spotify'}]->(a)
                        """,
                        name_norm=name_norm, name=name,
                        spotify_id=artist["id"],
                        genres=artist.get("genres", []), image_url=image_url,
                        uid=user_id, rank=rank, tr=time_range
                    )
        print(f"✅ Top artists sync complete for user {user_id}")
    except Exception as e:
        print(f"❌ Top artists sync failed for user {user_id}: {e}")
    finally:
        await client.close()


async def _sync_top_albums_bg(user_id: str, access_token: str):
    """Derive top albums from Spotify top tracks and sync to Neo4j"""
    print(f"💿 Syncing Spotify top albums for user {user_id}")
    from app.db.neo4j_driver import neo4j_driver
    from collections import defaultdict

    client = SpotifyClient(access_token=access_token)
    try:
        # Use long_term for the broadest picture of favourite albums
        data = await client.get_user_top_tracks(time_range="long_term", limit=50)
        tracks = data.get("items", [])

        # Aggregate tracks by album_id — count = proxy for how much the user plays that album
        album_counts: dict = defaultdict(lambda: {"count": 0, "album": None})
        for track in tracks:
            album = track.get("album", {})
            album_id = album.get("id")
            if not album_id:
                continue
            if album_counts[album_id]["album"] is None:
                album_counts[album_id]["album"] = album
            album_counts[album_id]["count"] += 1

        sorted_albums = sorted(
            album_counts.items(),
            key=lambda x: x[1]["count"],
            reverse=True,
        )

        with neo4j_driver.get_driver().session() as db:
            db.run(
                "MATCH (u:User {id: $uid})-[r:TOP_ALBUM {source: 'spotify'}]->() DELETE r",
                uid=user_id,
            )
            for rank, (album_id, info) in enumerate(sorted_albums[:50], 1):
                album = info["album"]
                name = album["name"]
                artist_name = (album.get("artists") or [{}])[0].get("name", "")
                name_norm = f"{artist_name.lower().strip()}::{name.lower().strip()}"
                image_url = album["images"][0]["url"] if album.get("images") else None
                track_count = info["count"]

                db.run(
                    """
                    MERGE (a:Album {spotify_id: $spotify_id})
                    ON CREATE SET a.id = randomUUID(), a.created_at = datetime()
                    SET a.name = $name, a.artist_name = $artist_name,
                        a.name_normalized = $name_norm,
                        a.image_url = $image_url, a.updated_at = datetime()
                    WITH a
                    MATCH (u:User {id: $uid})
                    CREATE (u)-[:TOP_ALBUM {rank: $rank, play_count: $pc,
                                            source: 'spotify', period: 'long_term'}]->(a)
                    """,
                    spotify_id=album_id, name=name, artist_name=artist_name,
                    name_norm=name_norm, image_url=image_url,
                    uid=user_id, rank=rank, pc=track_count,
                )
        print(f"✅ Spotify album sync complete — {len(sorted_albums)} albums for user {user_id}")
    except Exception as e:
        print(f"❌ Spotify album sync failed for user {user_id}: {e}")
    finally:
        await client.close()


async def _run_backfill_sync(user_id: str, access_token: str):
    """Run backfill of recently played tracks (synchronous version)"""
    from app.db.neo4j_driver import neo4j_driver
    
    client = SpotifyClient(access_token=access_token)
    
    try:
        # Get session
        with neo4j_driver.get_driver().session() as session:
            repository = SpotifyRepository(session)
            scrobble_service = SpotifyScrobbleService(session)
            
            # Get last play timestamp to avoid duplicates
            last_play_ts = repository.get_last_play_timestamp(user_id)
            
            print(f"🔍 Last play timestamp: {last_play_ts}")
            
            # Fetch recently played (without filter for now to get all data)
            recently_played = await client.get_recently_played(
                limit=50,
                after=None  # Temporarily disabled to fetch all recent plays
            )
            
            items = recently_played.get("items", [])
            
            if not items:
                print(f"✅ No new plays for user {user_id}")
                return {
                    "message": "No new plays found",
                    "processed": 0
                }
            
            # Process plays
            stats = await scrobble_service.process_recently_played(
                user_id=user_id,
                recently_played_items=items
            )
            
            print(f"✅ Backfill complete for user {user_id}: {stats}")
            
            return {
                "message": "Backfill completed successfully",
                "processed": stats.get("processed", 0),
                "skipped": stats.get("skipped", 0),
                "stats": stats
            }
            
    except Exception as e:
        print(f"❌ Backfill failed for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backfill failed: {str(e)}"
        )
    finally:
        await client.close()


async def _run_backfill(user_id: str, access_token: str):
    """Run backfill of recently played tracks (background version)"""
    try:
        await _run_backfill_sync(user_id, access_token)
    except Exception as e:
        print(f"❌ Background backfill failed: {e}")


async def _delete_spotify_data(user_id: str):
    """
    DSGVO Art. 17: Delete all Spotify data for user

    This runs in background and completes within 24h
    """
    from app.db.neo4j_driver import neo4j_driver
    from datetime import datetime

    print(f"🗑️  Starting DSGVO deletion for user {user_id}")

    try:
        with neo4j_driver.get_driver().session() as session:
            # 1. Delete all Spotify plays
            query_plays = """
            MATCH (u:User {id: $user_id})-[:PLAYED]->(p:Play {source: "spotify"})
            WITH p, count(p) as play_count
            DETACH DELETE p
            RETURN play_count
            """
            result = session.run(query_plays, user_id=user_id)
            record = result.single()
            plays_deleted = record["play_count"] if record else 0
            
            # 2. Delete orphaned tracks (no more plays)
            query_orphaned_tracks = """
            MATCH (t:Track)
            WHERE NOT (t)<-[:OF_TRACK]-(:Play)
            WITH t, count(t) as track_count
            DETACH DELETE t
            RETURN track_count
            """
            result = session.run(query_orphaned_tracks)
            record = result.single()
            tracks_deleted = record["track_count"] if record else 0
            
            # 3. Delete orphaned artists (no more tracks)
            query_orphaned_artists = """
            MATCH (a:Artist)
            WHERE NOT (a)-[:PERFORMED]->(:Track)
            WITH a, count(a) as artist_count
            DETACH DELETE a
            RETURN artist_count
            """
            result = session.run(query_orphaned_artists)
            record = result.single()
            artists_deleted = record["artist_count"] if record else 0
            
            # 4. Delete orphaned albums (no more tracks)
            query_orphaned_albums = """
            MATCH (al:Album)
            WHERE NOT (al)<-[:ON_ALBUM]-(:Track)
            WITH al, count(al) as album_count
            DETACH DELETE al
            RETURN album_count
            """
            result = session.run(query_orphaned_albums)
            record = result.single()
            albums_deleted = record["album_count"] if record else 0
            
            # 5. Log deletion for audit trail
            query_log = """
            MATCH (u:User {id: $user_id})
            SET u.spotify_data_deleted_at = datetime(),
                u.spotify_deletion_stats = {
                    plays: $plays_deleted,
                    tracks: $tracks_deleted,
                    artists: $artists_deleted,
                    albums: $albums_deleted,
                    timestamp: $timestamp
                }
            RETURN u
            """
            session.run(
                query_log,
                user_id=user_id,
                plays_deleted=plays_deleted,
                tracks_deleted=tracks_deleted,
                artists_deleted=artists_deleted,
                albums_deleted=albums_deleted,
                timestamp=datetime.utcnow().isoformat()
            )
            
            print(f"✅ DSGVO deletion complete for user {user_id}:")
            print(f"   - Plays deleted: {plays_deleted}")
            print(f"   - Tracks deleted: {tracks_deleted}")
            print(f"   - Artists deleted: {artists_deleted}")
            print(f"   - Albums deleted: {albums_deleted}")
            
    except Exception as e:
        print(f"❌ DSGVO deletion failed for user {user_id}: {e}")
        # Log error for manual intervention
        with neo4j_driver.get_driver().session() as session:
            query_error = """
            MATCH (u:User {id: $user_id})
            SET u.spotify_deletion_error = $error,
                u.spotify_deletion_error_at = datetime()
            RETURN u
            """
            session.run(query_error, user_id=user_id, error=str(e))

