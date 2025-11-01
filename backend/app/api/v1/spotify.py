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
    session = Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """Disconnect Spotify account"""
    query = """
    MATCH (u:User {id: $user_id})
    SET u.spotify_access_token = null,
        u.spotify_refresh_token = null,
        u.spotify_token_expires_at = null,
        u.spotify_scopes = null,
        u.spotify_user_id = null,
        u.source_accounts = [x IN u.source_accounts WHERE x <> 'spotify']
    RETURN u
    """
    
    result = session.run(query, user_id=current_user["id"])
    if not result.single():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "Spotify disconnected successfully"}


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

