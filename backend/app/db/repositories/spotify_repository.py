"""
Spotify Repository - Neo4j operations for Spotify data
"""
from typing import Optional, Dict, List
from datetime import datetime
import uuid
import hashlib


class SpotifyRepository:
    """Repository for Spotify data in Neo4j"""
    
    def __init__(self, session):
        self.session = session
    
    # ============= Token Management =============
    
    def save_spotify_tokens(
        self,
        user_id: str,
        access_token: str,
        refresh_token: str,
        expires_in: int,
        scopes: List[str],
        spotify_user_id: Optional[str] = None
    ) -> bool:
        """
        Save Spotify OAuth tokens for user
        
        Args:
            user_id: Internal user ID
            access_token: Spotify access token (encrypted in production!)
            refresh_token: Spotify refresh token (encrypted in production!)
            expires_in: Token expiry in seconds
            scopes: List of granted scopes
            spotify_user_id: Spotify user ID
        """
        query = """
        MATCH (u:User {id: $user_id})
        SET u.spotify_access_token = $access_token,
            u.spotify_refresh_token = $refresh_token,
            u.spotify_token_expires_at = datetime() + duration({seconds: $expires_in}),
            u.spotify_scopes = $scopes,
            u.spotify_user_id = $spotify_user_id,
            u.spotify_connected_at = datetime(),
            u.source_accounts = CASE 
                WHEN 'spotify' IN u.source_accounts THEN u.source_accounts
                ELSE u.source_accounts + 'spotify'
            END
        RETURN u
        """
        
        result = self.session.run(
            query,
            user_id=user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            scopes=scopes,
            spotify_user_id=spotify_user_id
        )
        return result.single() is not None
    
    def get_spotify_tokens(self, user_id: str) -> Optional[Dict]:
        """Get Spotify tokens for user"""
        query = """
        MATCH (u:User {id: $user_id})
        WHERE u.spotify_refresh_token IS NOT NULL
        RETURN u.spotify_access_token as access_token,
               u.spotify_refresh_token as refresh_token,
               u.spotify_token_expires_at as expires_at,
               u.spotify_scopes as scopes
        """
        
        result = self.session.run(query, user_id=user_id)
        record = result.single()
        
        if record:
            data = dict(record)
            # Convert Neo4j DateTime to Python datetime
            if data.get("expires_at"):
                data["expires_at"] = data["expires_at"].to_native()
            return data
        return None
    
    def update_access_token(
        self,
        user_id: str,
        access_token: str,
        expires_in: int
    ) -> bool:
        """Update access token after refresh"""
        query = """
        MATCH (u:User {id: $user_id})
        SET u.spotify_access_token = $access_token,
            u.spotify_token_expires_at = datetime() + duration({seconds: $expires_in})
        RETURN u
        """
        
        result = self.session.run(
            query,
            user_id=user_id,
            access_token=access_token,
            expires_in=expires_in
        )
        return result.single() is not None
    
    # ============= Track/Artist/Album Management =============
    
    def create_or_update_track(
        self,
        spotify_id: str,
        name: str,
        duration_ms: int,
        album_spotify_id: str,
        artist_spotify_ids: List[str],
        isrc: Optional[str] = None,
        popularity: Optional[int] = None
    ) -> str:
        """
        Create or update track node
        
        Returns:
            Internal track ID
        """
        query = """
        MERGE (t:Track {spotify_id: $spotify_id})
        ON CREATE SET 
            t.id = $track_id,
            t.name = $name,
            t.duration_ms = $duration_ms,
            t.isrc = $isrc,
            t.popularity = $popularity,
            t.created_at = datetime()
        ON MATCH SET
            t.name = $name,
            t.duration_ms = $duration_ms,
            t.popularity = $popularity,
            t.updated_at = datetime()
        RETURN t.id as id
        """
        
        track_id = str(uuid.uuid4())
        result = self.session.run(
            query,
            track_id=track_id,
            spotify_id=spotify_id,
            name=name,
            duration_ms=duration_ms,
            isrc=isrc,
            popularity=popularity
        )
        
        record = result.single()
        internal_id = record["id"] if record else track_id
        
        # Link to album
        self._link_track_to_album(spotify_id, album_spotify_id)
        
        # Link to artists
        for artist_id in artist_spotify_ids:
            self._link_track_to_artist(spotify_id, artist_id)
        
        return internal_id
    
    def _link_track_to_album(self, track_spotify_id: str, album_spotify_id: str):
        """Create relationship between track and album"""
        query = """
        MATCH (t:Track {spotify_id: $track_id})
        MERGE (a:Album {spotify_id: $album_id})
        ON CREATE SET a.id = randomUUID(), a.created_at = datetime()
        MERGE (t)-[:ON_ALBUM]->(a)
        """
        self.session.run(
            query,
            track_id=track_spotify_id,
            album_id=album_spotify_id
        )
    
    def _link_track_to_artist(self, track_spotify_id: str, artist_spotify_id: str):
        """Create relationship between track and artist"""
        query = """
        MATCH (t:Track {spotify_id: $track_id})
        MERGE (a:Artist {spotify_id: $artist_id})
        ON CREATE SET a.id = randomUUID(), a.created_at = datetime()
        MERGE (a)-[:PERFORMED]->(t)
        """
        self.session.run(
            query,
            track_id=track_spotify_id,
            artist_id=artist_spotify_id
        )
    
    def create_or_update_artist(
        self,
        spotify_id: str,
        name: str,
        genres: List[str] = [],
        popularity: Optional[int] = None
    ) -> str:
        """Create or update artist node"""
        query = """
        MERGE (a:Artist {spotify_id: $spotify_id})
        ON CREATE SET 
            a.id = $artist_id,
            a.name = $name,
            a.genres = $genres,
            a.popularity = $popularity,
            a.created_at = datetime()
        ON MATCH SET
            a.name = $name,
            a.genres = $genres,
            a.popularity = $popularity,
            a.updated_at = datetime()
        RETURN a.id as id
        """
        
        artist_id = str(uuid.uuid4())
        result = self.session.run(
            query,
            artist_id=artist_id,
            spotify_id=spotify_id,
            name=name,
            genres=genres,
            popularity=popularity
        )
        
        record = result.single()
        return record["id"] if record else artist_id
    
    def create_or_update_album(
        self,
        spotify_id: str,
        name: str,
        release_date: Optional[str] = None,
        album_type: Optional[str] = None,
        total_tracks: Optional[int] = None,
        image_url: Optional[str] = None
    ) -> str:
        """Create or update album node"""
        query = """
        MERGE (a:Album {spotify_id: $spotify_id})
        ON CREATE SET 
            a.id = $album_id,
            a.name = $name,
            a.release_date = $release_date,
            a.album_type = $album_type,
            a.total_tracks = $total_tracks,
            a.image_url = $image_url,
            a.created_at = datetime()
        ON MATCH SET
            a.name = $name,
            a.release_date = $release_date,
            a.album_type = $album_type,
            a.total_tracks = $total_tracks,
            a.image_url = $image_url,
            a.updated_at = datetime()
        RETURN a.id as id
        """
        
        album_id = str(uuid.uuid4())
        result = self.session.run(
            query,
            album_id=album_id,
            spotify_id=spotify_id,
            name=name,
            release_date=release_date,
            album_type=album_type,
            total_tracks=total_tracks,
            image_url=image_url
        )
        
        record = result.single()
        return record["id"] if record else album_id
    
    # ============= Play/Scrobble Management =============
    
    def create_play(
        self,
        user_id: str,
        track_spotify_id: str,
        played_at: datetime,
        duration_played_ms: int,
        source: str = "spotify",
        confidence: float = 1.0,
        context_type: Optional[str] = None,
        context_uri: Optional[str] = None
    ) -> Optional[str]:
        """
        Create a play/scrobble record (idempotent)
        
        Uses dedup key: hash(user_id, track_spotify_id, played_at_floor_to_1s)
        
        Returns:
            Play ID if created, None if duplicate
        """
        # Generate dedup key
        played_at_ts = int(played_at.timestamp())
        dedup_str = f"{user_id}:{track_spotify_id}:{played_at_ts}"
        dedup_key = hashlib.sha256(dedup_str.encode()).hexdigest()
        
        query = """
        MATCH (u:User {id: $user_id})
        MATCH (t:Track {spotify_id: $track_spotify_id})
        MERGE (p:Play {dedup_key: $dedup_key})
        ON CREATE SET
            p.id = $play_id,
            p.played_at = datetime($played_at),
            p.duration_played_ms = $duration_played_ms,
            p.source = $source,
            p.confidence = $confidence,
            p.context_type = $context_type,
            p.context_uri = $context_uri,
            p.ingested_at = datetime()
        WITH p, u, t
        WHERE p.id = $play_id
        MERGE (u)-[:PLAYED]->(p)
        MERGE (p)-[:OF_TRACK]->(t)
        RETURN p.id as id
        """
        
        play_id = str(uuid.uuid4())
        result = self.session.run(
            query,
            play_id=play_id,
            user_id=user_id,
            track_spotify_id=track_spotify_id,
            dedup_key=dedup_key,
            played_at=played_at.isoformat(),
            duration_played_ms=duration_played_ms,
            source=source,
            confidence=confidence,
            context_type=context_type,
            context_uri=context_uri
        )
        
        record = result.single()
        return record["id"] if record else None
    
    def get_last_play_timestamp(self, user_id: str) -> Optional[int]:
        """
        Get timestamp of user's last play (in milliseconds)
        
        Used for backfill to avoid re-importing
        """
        query = """
        MATCH (u:User {id: $user_id})-[:PLAYED]->(p:Play)
        RETURN p.played_at as played_at
        ORDER BY p.played_at DESC
        LIMIT 1
        """
        
        result = self.session.run(query, user_id=user_id)
        record = result.single()
        
        if record and record["played_at"]:
            dt = record["played_at"].to_native()
            return int(dt.timestamp() * 1000)
        return None
    
    def get_user_play_count(self, user_id: str) -> int:
        """Get total number of plays for user"""
        query = """
        MATCH (u:User {id: $user_id})-[:PLAYED]->(p:Play)
        RETURN count(p) as count
        """
        
        result = self.session.run(query, user_id=user_id)
        record = result.single()
        return record["count"] if record else 0
    
    def get_user_top_artists(
        self,
        user_id: str,
        limit: int = 50,
        time_range_days: Optional[int] = None
    ) -> List[Dict]:
        """
        Get user's top artists based on play count
        
        Args:
            user_id: User ID
            limit: Number of artists to return
            time_range_days: Only count plays from last N days (None = all time)
        """
        time_filter = ""
        if time_range_days:
            time_filter = f"AND p.played_at > datetime() - duration({{days: {time_range_days}}})"
        
        query = f"""
        MATCH (u:User {{id: $user_id}})-[:PLAYED]->(p:Play)-[:OF_TRACK]->(t:Track)
        <-[:PERFORMED]-(a:Artist)
        WHERE true {time_filter}
        WITH a, count(p) as play_count
        ORDER BY play_count DESC
        LIMIT $limit
        RETURN a.id as id,
               a.spotify_id as spotify_id,
               a.name as name,
               a.genres as genres,
               play_count
        """
        
        result = self.session.run(query, user_id=user_id, limit=limit)
        return [dict(record) for record in result]

