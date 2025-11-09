"""
Spotify Scrobble Service
Implements scrobble logic: 50% rule, 30s minimum, deduplication
"""
from typing import Optional, Dict, List, Tuple
from datetime import datetime, timedelta
from app.db.repositories.spotify_repository import SpotifyRepository
from app.services.spotify_client import SpotifyClient


class ScrobbleRule:
    """
    Scrobble Rule: Track is scrobbled if:
    - At least 30 seconds played, AND
    - At least 50% of track duration played (or 240 seconds, whichever is lower)
    """
    
    MIN_DURATION_MS = 30_000  # 30 seconds
    MAX_DURATION_FOR_50_PERCENT = 240_000  # 4 minutes
    
    @staticmethod
    def should_scrobble(
        duration_played_ms: int,
        track_duration_ms: int
    ) -> Tuple[bool, float]:
        """
        Determine if a play should be scrobbled
        
        Args:
            duration_played_ms: How long the track was played
            track_duration_ms: Total track duration
        
        Returns:
            Tuple of (should_scrobble, confidence_score)
        """
        # Rule 1: Must play at least 30 seconds
        if duration_played_ms < ScrobbleRule.MIN_DURATION_MS:
            return False, 0.0
        
        # Rule 2: Must play at least 50% of track (or 240s, whichever is lower)
        required_duration = min(
            track_duration_ms * 0.5,
            ScrobbleRule.MAX_DURATION_FOR_50_PERCENT
        )
        
        if duration_played_ms < required_duration:
            return False, 0.0
        
        # Calculate confidence score (0.0 - 1.0)
        # 100% = played entire track
        # 50% = played minimum required
        play_percentage = duration_played_ms / track_duration_ms
        confidence = min(play_percentage, 1.0)
        
        return True, confidence


class SpotifyScrobbleService:
    """Service for managing Spotify scrobbles"""
    
    def __init__(self, session):
        self.repository = SpotifyRepository(session)
    
    async def process_currently_playing(
        self,
        user_id: str,
        currently_playing_data: Dict,
        previous_track_id: Optional[str] = None,
        previous_track_start_time: Optional[datetime] = None
    ) -> Optional[Dict]:
        """
        Process currently playing track and scrobble if needed
        
        This is called periodically (every 20-30s) to track playback.
        When track changes, we scrobble the previous track if it meets criteria.
        
        Args:
            user_id: User ID
            currently_playing_data: Data from Spotify API
            previous_track_id: Previously playing track ID
            previous_track_start_time: When previous track started
        
        Returns:
            Dict with current track info and scrobble status
        """
        if not currently_playing_data or not currently_playing_data.get("item"):
            return None
        
        item = currently_playing_data["item"]
        current_track_id = item["id"]
        current_progress_ms = currently_playing_data.get("progress_ms", 0)
        is_playing = currently_playing_data.get("is_playing", False)
        timestamp = currently_playing_data.get("timestamp", int(datetime.utcnow().timestamp() * 1000))
        
        result = {
            "track_id": current_track_id,
            "track_name": item["name"],
            "artist_names": [artist["name"] for artist in item["artists"]],
            "album_name": item["album"]["name"],
            "duration_ms": item["duration_ms"],
            "progress_ms": current_progress_ms,
            "is_playing": is_playing,
            "timestamp": timestamp,
            "scrobbled": False
        }
        
        # Check if track changed
        if previous_track_id and previous_track_id != current_track_id and previous_track_start_time:
            # Track changed - try to scrobble previous track
            scrobble_result = await self._scrobble_previous_track(
                user_id=user_id,
                track_id=previous_track_id,
                start_time=previous_track_start_time,
                end_time=datetime.utcnow()
            )
            
            if scrobble_result:
                result["previous_track_scrobbled"] = True
                result["scrobble_id"] = scrobble_result
        
        return result
    
    async def _scrobble_previous_track(
        self,
        user_id: str,
        track_id: str,
        start_time: datetime,
        end_time: datetime
    ) -> Optional[str]:
        """
        Scrobble a track that was previously playing
        
        Returns:
            Play ID if scrobbled, None otherwise
        """
        # Get track duration from database
        track = self._get_track_by_spotify_id(track_id)
        if not track:
            return None
        
        track_duration_ms = track["duration_ms"]
        duration_played_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Check scrobble rule
        should_scrobble, confidence = ScrobbleRule.should_scrobble(
            duration_played_ms=duration_played_ms,
            track_duration_ms=track_duration_ms
        )
        
        if not should_scrobble:
            return None
        
        # Create play record
        play_id = self.repository.create_play(
            user_id=user_id,
            track_spotify_id=track_id,
            played_at=start_time,
            duration_played_ms=duration_played_ms,
            source="spotify",
            confidence=confidence
        )
        
        return play_id
    
    def _get_track_by_spotify_id(self, spotify_id: str) -> Optional[Dict]:
        """Get track from database by Spotify ID"""
        query = """
        MATCH (t:Track {spotify_id: $spotify_id})
        RETURN t.id as id,
               t.spotify_id as spotify_id,
               t.name as name,
               t.duration_ms as duration_ms
        """
        
        result = self.repository.session.run(query, spotify_id=spotify_id)
        record = result.single()
        return dict(record) if record else None
    
    async def process_recently_played(
        self,
        user_id: str,
        recently_played_items: List[Dict]
    ) -> Dict[str, int]:
        """
        Process recently played tracks (backfill)
        
        Args:
            user_id: User ID
            recently_played_items: List of recently played items from Spotify API
        
        Returns:
            Dict with stats: {processed, scrobbled, skipped}
        """
        stats = {
            "processed": 0,
            "scrobbled": 0,
            "skipped": 0,
            "errors": 0
        }
        
        for item in recently_played_items:
            stats["processed"] += 1
            
            try:
                track = item["track"]
                played_at_str = item["played_at"]
                played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00"))
                
                track_id = track["id"]
                track_duration_ms = track["duration_ms"]
                
                # For backfill, assume full play (confidence = 1.0)
                # Spotify only returns completed plays in recently-played
                duration_played_ms = track_duration_ms
                
                # Check scrobble rule (should always pass for backfill)
                should_scrobble, confidence = ScrobbleRule.should_scrobble(
                    duration_played_ms=duration_played_ms,
                    track_duration_ms=track_duration_ms
                )
                
                if not should_scrobble:
                    stats["skipped"] += 1
                    continue
                
                # Ensure track exists in database
                await self._ensure_track_exists(track)
                
                # Create play record (idempotent)
                play_id = self.repository.create_play(
                    user_id=user_id,
                    track_spotify_id=track_id,
                    played_at=played_at,
                    duration_played_ms=duration_played_ms,
                    source="spotify",
                    confidence=confidence,
                    context_type=item.get("context", {}).get("type"),
                    context_uri=item.get("context", {}).get("uri")
                )
                
                if play_id:
                    stats["scrobbled"] += 1
                else:
                    stats["skipped"] += 1  # Duplicate
                    
            except Exception as e:
                print(f"❌ Error processing play: {e}")
                stats["errors"] += 1
        
        return stats
    
    async def _ensure_track_exists(self, track_data: Dict) -> str:
        """
        Ensure track exists in database, create if not
        
        Returns:
            Internal track ID
        """
        track_id = track_data["id"]
        
        # Check if track exists
        existing = self._get_track_by_spotify_id(track_id)
        if existing:
            return existing["id"]
        
        # Create track
        album = track_data.get("album", {})
        artists = track_data.get("artists", [])
        
        internal_id = self.repository.create_or_update_track(
            spotify_id=track_id,
            name=track_data["name"],
            duration_ms=track_data["duration_ms"],
            album_spotify_id=album.get("id", ""),
            artist_spotify_ids=[a["id"] for a in artists],
            isrc=track_data.get("external_ids", {}).get("isrc"),
            popularity=track_data.get("popularity")
        )
        
        # Also create/update album and artists
        if album.get("id"):
            # Extract album cover URL from Spotify images
            # Spotify provides images in descending size order: [large, medium, small]
            # We prefer medium size (640x640) for better balance of quality and performance
            images = album.get("images", [])
            image_url = None
            if len(images) > 1:
                image_url = images[1]["url"]  # Medium size (640x640)
            elif len(images) > 0:
                image_url = images[0]["url"]  # Fallback to largest if only one available
            
            self.repository.create_or_update_album(
                spotify_id=album["id"],
                name=album["name"],
                release_date=album.get("release_date"),
                album_type=album.get("album_type"),
                total_tracks=album.get("total_tracks"),
                image_url=image_url
            )
        
        for artist in artists:
            self.repository.create_or_update_artist(
                spotify_id=artist["id"],
                name=artist["name"],
                genres=artist.get("genres", []),
                popularity=artist.get("popularity")
            )
        
        return internal_id
    
    def get_user_listening_stats(self, user_id: str) -> Dict:
        """Get user's listening statistics"""
        total_plays = self.repository.get_user_play_count(user_id)
        top_artists = self.repository.get_user_top_artists(user_id, limit=10)
        
        return {
            "total_plays": total_plays,
            "top_artists": top_artists
        }

