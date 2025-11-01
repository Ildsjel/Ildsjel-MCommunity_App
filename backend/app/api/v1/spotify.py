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
    
    # Store PKCE verifier (use Redis in production!)
    _pkce_storage[state] = {
        "code_verifier": code_verifier,
        "user_id": current_user["id"],
        "created_at": datetime.utcnow()
    }
    
    # Get authorization URL
    auth_url = SpotifyClient.get_authorization_url(state, code_challenge)
    
    return {
        "auth_url": auth_url,
        "state": state
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
    # Get PKCE verifier from storage
    state = token_request.state
    if not state or state not in _pkce_storage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired state parameter"
        )
    
    pkce_data = _pkce_storage.pop(state)
    code_verifier = pkce_data["code_verifier"]
    
    # Verify user matches
    if pkce_data["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User mismatch"
        )
    
    # Exchange code for tokens
    client = SpotifyClient()
    try:
        token_data = await client.exchange_code_for_token(
            code=token_request.code,
            code_verifier=code_verifier
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
        
        # Trigger initial backfill in background
        background_tasks.add_task(
            _initial_backfill,
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
    play_count = repository.get_user_play_count(current_user["id"])
    
    if not tokens:
        return SpotifyConnectionStatus(
            user_id=current_user["id"],
            is_connected=False,
            total_plays=0
        )
    
    return SpotifyConnectionStatus(
        user_id=current_user["id"],
        is_connected=True,
        access_token_expires_at=tokens.get("expires_at"),
        scopes=tokens.get("scopes", []),
        total_plays=play_count
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
    if tokens["expires_at"] < datetime.utcnow():
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
    
    # Trigger backfill in background
    background_tasks.add_task(
        _run_backfill,
        user_id=current_user["id"],
        access_token=access_token
    )
    
    return {"message": "Backfill started"}


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
    limit: int = 50,
    time_range_days: Optional[int] = None,
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's top artists based on play count
    
    Args:
        limit: Number of artists (max 50)
        time_range_days: Only count plays from last N days (None = all time)
    """
    repository = SpotifyRepository(session)
    artists = repository.get_user_top_artists(
        user_id=current_user["id"],
        limit=min(limit, 50),
        time_range_days=time_range_days
    )
    
    return {"artists": artists}


# ============= Background Tasks =============

async def _initial_backfill(user_id: str, access_token: str):
    """Initial backfill after connecting Spotify"""
    print(f"🎵 Starting initial backfill for user {user_id}")
    await _run_backfill(user_id, access_token)


async def _run_backfill(user_id: str, access_token: str):
    """Run backfill of recently played tracks"""
    from app.db.neo4j_driver import neo4j_driver
    
    client = SpotifyClient(access_token=access_token)
    
    try:
        # Get session
        with neo4j_driver.driver.session() as session:
            repository = SpotifyRepository(session)
            scrobble_service = SpotifyScrobbleService(session)
            
            # Get last play timestamp to avoid duplicates
            last_play_ts = repository.get_last_play_timestamp(user_id)
            
            # Fetch recently played
            recently_played = await client.get_recently_played(
                limit=50,
                after=last_play_ts
            )
            
            items = recently_played.get("items", [])
            
            if not items:
                print(f"✅ No new plays for user {user_id}")
                return
            
            # Process plays
            stats = await scrobble_service.process_recently_played(
                user_id=user_id,
                recently_played_items=items
            )
            
            print(f"✅ Backfill complete for user {user_id}: {stats}")
            
    except Exception as e:
        print(f"❌ Backfill failed for user {user_id}: {e}")
    finally:
        await client.close()


async def _delete_spotify_data(user_id: str):
    """
    DSGVO Art. 17: Delete all Spotify data for user
    
    This runs in background and completes within 24h
    """
    from app.db.neo4j_driver import neo4j_driver
    from datetime import datetime
    
    print(f"🗑️  Starting DSGVO deletion for user {user_id}")
    
    try:
        with neo4j_driver.driver.session() as session:
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
        with neo4j_driver.driver.session() as session:
            query_error = """
            MATCH (u:User {id: $user_id})
            SET u.spotify_deletion_error = $error,
                u.spotify_deletion_error_at = datetime()
            RETURN u
            """
            session.run(query_error, user_id=user_id, error=str(e))

