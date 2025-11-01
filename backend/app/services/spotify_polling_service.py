"""
Spotify Polling Service
Automatically syncs recently played tracks for all connected users
"""
import asyncio
from datetime import datetime, timezone
from typing import List
from app.db.neo4j_driver import neo4j_driver
from app.db.repositories.spotify_repository import SpotifyRepository
from app.services.spotify_client import SpotifyClient
from app.services.spotify_scrobble_service import SpotifyScrobbleService


class SpotifyPollingService:
    """Background service for automatic Spotify scrobbling"""
    
    def __init__(self, poll_interval: int = 300):
        """
        Initialize polling service
        
        Args:
            poll_interval: Seconds between polls (default: 300 = 5 minutes)
        """
        self.poll_interval = poll_interval
        self.is_running = False
        self._task = None
    
    async def start(self):
        """Start the polling service"""
        if self.is_running:
            print("⚠️  Polling service already running")
            return
        
        self.is_running = True
        self._task = asyncio.create_task(self._poll_loop())
        print(f"🎵 Spotify polling service started (interval: {self.poll_interval}s)")
    
    async def stop(self):
        """Stop the polling service"""
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("🛑 Spotify polling service stopped")
    
    async def _poll_loop(self):
        """Main polling loop"""
        while self.is_running:
            try:
                await self._poll_all_users()
            except Exception as e:
                print(f"❌ Polling error: {e}")
            
            # Wait for next poll
            await asyncio.sleep(self.poll_interval)
    
    async def _poll_all_users(self):
        """Poll all users with active Spotify connections"""
        print(f"🔄 Starting Spotify poll at {datetime.now(timezone.utc).isoformat()}")
        
        with neo4j_driver.get_driver().session() as session:
            # Get all users with active Spotify connections
            query = """
            MATCH (u:User)
            WHERE 'spotify' IN u.source_accounts
              AND u.spotify_access_token IS NOT NULL
              AND u.spotify_refresh_token IS NOT NULL
            RETURN u.id as user_id,
                   u.handle as handle,
                   u.spotify_access_token as access_token,
                   u.spotify_refresh_token as refresh_token,
                   u.spotify_token_expires_at as expires_at
            """
            
            result = session.run(query)
            users = list(result)
            
            if not users:
                print("  ℹ️  No users with active Spotify connections")
                return
            
            print(f"  📊 Found {len(users)} users with Spotify connected")
            
            # Poll each user
            for user_record in users:
                try:
                    await self._poll_user(
                        user_id=user_record["user_id"],
                        handle=user_record["handle"],
                        access_token=user_record["access_token"],
                        refresh_token=user_record["refresh_token"],
                        expires_at=user_record["expires_at"]
                    )
                except Exception as e:
                    print(f"  ❌ Failed to poll user {user_record['handle']}: {e}")
    
    async def _poll_user(
        self,
        user_id: str,
        handle: str,
        access_token: str,
        refresh_token: str,
        expires_at
    ):
        """Poll a single user's recently played tracks"""
        # Check if token needs refresh
        now = datetime.now(timezone.utc)
        token_expires = expires_at
        
        if token_expires.tzinfo is None:
            token_expires = token_expires.replace(tzinfo=timezone.utc)
        
        if token_expires < now:
            # Token expired, refresh it
            print(f"  🔄 Refreshing token for {handle}")
            client = SpotifyClient()
            try:
                new_tokens = await client.refresh_access_token(refresh_token)
                
                # Update token in database
                with neo4j_driver.get_driver().session() as session:
                    repository = SpotifyRepository(session)
                    repository.update_access_token(
                        user_id=user_id,
                        access_token=new_tokens["access_token"],
                        expires_in=new_tokens["expires_in"]
                    )
                
                access_token = new_tokens["access_token"]
            finally:
                await client.close()
        
        # Fetch recently played
        client = SpotifyClient(access_token=access_token)
        
        try:
            with neo4j_driver.get_driver().session() as session:
                repository = SpotifyRepository(session)
                scrobble_service = SpotifyScrobbleService(session)
                
                # Get last play timestamp to avoid duplicates
                last_play_ts = repository.get_last_play_timestamp(user_id)
                
                # Fetch recently played (with timestamp filter)
                recently_played = await client.get_recently_played(
                    limit=50,
                    after=last_play_ts
                )
                
                items = recently_played.get("items", [])
                
                if not items:
                    print(f"  ✓ {handle}: No new plays")
                    return
                
                # Process plays
                stats = await scrobble_service.process_recently_played(
                    user_id=user_id,
                    recently_played_items=items
                )
                
                print(f"  ✅ {handle}: Processed {stats.get('processed', 0)} plays, "
                      f"scrobbled {stats.get('scrobbled', 0)}, "
                      f"skipped {stats.get('skipped', 0)}")
                
        finally:
            await client.close()


# Global polling service instance
polling_service = SpotifyPollingService(poll_interval=300)  # 5 minutes

