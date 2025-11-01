"""
Spotify API Client
Handles OAuth, token refresh, and API calls
"""
import httpx
import base64
import secrets
import hashlib
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from app.config.settings import settings


class SpotifyClient:
    """Spotify Web API Client with OAuth2 PKCE"""
    
    BASE_URL = "https://api.spotify.com/v1"
    AUTH_URL = "https://accounts.spotify.com/authorize"
    TOKEN_URL = "https://accounts.spotify.com/api/token"
    
    # Required scopes for scrobbling
    SCOPES = [
        "user-read-recently-played",
        "user-read-currently-playing",
        "user-read-playback-state",
        "user-top-read",
        "user-library-read"
    ]
    
    def __init__(self, access_token: Optional[str] = None):
        self.access_token = access_token
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
    
    @staticmethod
    def generate_pkce_pair() -> tuple[str, str]:
        """
        Generate PKCE code verifier and challenge
        
        Returns:
            Tuple of (code_verifier, code_challenge)
        """
        # Generate code verifier (43-128 chars)
        code_verifier = base64.urlsafe_b64encode(
            secrets.token_bytes(32)
        ).decode('utf-8').rstrip('=')
        
        # Generate code challenge (SHA256 hash of verifier)
        challenge_bytes = hashlib.sha256(code_verifier.encode('utf-8')).digest()
        code_challenge = base64.urlsafe_b64encode(challenge_bytes).decode('utf-8').rstrip('=')
        
        return code_verifier, code_challenge
    
    @staticmethod
    def get_authorization_url(state: str, code_challenge: str) -> str:
        """
        Get Spotify authorization URL for PKCE flow
        
        Args:
            state: Random state for CSRF protection
            code_challenge: PKCE code challenge
        
        Returns:
            Authorization URL
        """
        params = {
            "client_id": settings.SPOTIFY_CLIENT_ID,
            "response_type": "code",
            "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
            "state": state,
            "scope": " ".join(SpotifyClient.SCOPES),
            "code_challenge_method": "S256",
            "code_challenge": code_challenge,
            "show_dialog": "false"
        }
        
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{SpotifyClient.AUTH_URL}?{query_string}"
    
    async def exchange_code_for_token(
        self, 
        code: str, 
        code_verifier: str
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access token (PKCE)
        
        Args:
            code: Authorization code from callback
            code_verifier: PKCE code verifier
        
        Returns:
            Token response dict
        """
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.SPOTIFY_REDIRECT_URI,
            "client_id": settings.SPOTIFY_CLIENT_ID,
            "code_verifier": code_verifier
        }
        
        response = await self.client.post(
            self.TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        response.raise_for_status()
        return response.json()
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: Refresh token
        
        Returns:
            New token response dict
        """
        # Basic auth with client credentials
        auth_str = f"{settings.SPOTIFY_CLIENT_ID}:{settings.SPOTIFY_CLIENT_SECRET}"
        auth_bytes = auth_str.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        
        response = await self.client.post(
            self.TOKEN_URL,
            data=data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {auth_b64}"
            }
        )
        response.raise_for_status()
        return response.json()
    
    async def get_current_user_profile(self) -> Dict[str, Any]:
        """Get current user's Spotify profile"""
        response = await self.client.get(
            f"{self.BASE_URL}/me",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_currently_playing(self) -> Optional[Dict[str, Any]]:
        """
        Get currently playing track
        
        Returns:
            Currently playing info or None if nothing playing
        """
        response = await self.client.get(
            f"{self.BASE_URL}/me/player/currently-playing",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        
        if response.status_code == 204:
            # Nothing playing
            return None
        
        response.raise_for_status()
        return response.json()
    
    async def get_recently_played(
        self, 
        limit: int = 50, 
        after: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get recently played tracks
        
        Args:
            limit: Number of tracks to return (max 50)
            after: Unix timestamp in milliseconds (only return plays after this time)
        
        Returns:
            Recently played tracks response
        """
        params = {"limit": min(limit, 50)}
        if after:
            params["after"] = after
        
        response = await self.client.get(
            f"{self.BASE_URL}/me/player/recently-played",
            params=params,
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_track(self, track_id: str) -> Dict[str, Any]:
        """Get track details by ID"""
        response = await self.client.get(
            f"{self.BASE_URL}/tracks/{track_id}",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_tracks(self, track_ids: List[str]) -> Dict[str, Any]:
        """
        Get multiple tracks by IDs (batch)
        
        Args:
            track_ids: List of track IDs (max 50)
        """
        ids_str = ",".join(track_ids[:50])
        response = await self.client.get(
            f"{self.BASE_URL}/tracks",
            params={"ids": ids_str},
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_artist(self, artist_id: str) -> Dict[str, Any]:
        """Get artist details by ID"""
        response = await self.client.get(
            f"{self.BASE_URL}/artists/{artist_id}",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_artists(self, artist_ids: List[str]) -> Dict[str, Any]:
        """Get multiple artists by IDs (batch, max 50)"""
        ids_str = ",".join(artist_ids[:50])
        response = await self.client.get(
            f"{self.BASE_URL}/artists",
            params={"ids": ids_str},
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_album(self, album_id: str) -> Dict[str, Any]:
        """Get album details by ID"""
        response = await self.client.get(
            f"{self.BASE_URL}/albums/{album_id}",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_user_top_artists(
        self, 
        time_range: str = "medium_term", 
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Get user's top artists
        
        Args:
            time_range: short_term (4 weeks), medium_term (6 months), long_term (years)
            limit: Number of artists (max 50)
        """
        response = await self.client.get(
            f"{self.BASE_URL}/me/top/artists",
            params={"time_range": time_range, "limit": min(limit, 50)},
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_user_top_tracks(
        self, 
        time_range: str = "medium_term", 
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get user's top tracks"""
        response = await self.client.get(
            f"{self.BASE_URL}/me/top/tracks",
            params={"time_range": time_range, "limit": min(limit, 50)},
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        response.raise_for_status()
        return response.json()

