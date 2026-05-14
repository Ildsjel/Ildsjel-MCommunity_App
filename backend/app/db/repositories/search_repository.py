"""
Search Repository - Neo4j operations for profile search
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import math

from app.utils.geo import distance_between_cities_km


class SearchRepository:
    """Repository for profile search operations"""
    
    def __init__(self, session):
        self.session = session
    
    def search_by_name(
        self,
        query: str,
        requester_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict]:
        """
        Search users by name/handle using full-text search
        
        Args:
            query: Search query string
            requester_id: ID of user performing search
            limit: Max results
            offset: Pagination offset
        
        Returns:
            List of user dicts with basic info
        """
        cypher_query = """
        CALL db.index.fulltext.queryNodes('user_name_search', $search_query)
        YIELD node as u, score
        WHERE u.id <> $requester_id
          AND u.is_active = true
          AND u.email_verified = true
          AND u.onboarding_complete = true
          AND u.discoverable_by_name = true
        RETURN u.id as user_id,
               u.handle as handle,
               u.city as city,
               u.country as country,
               u.city_visible as city_visible,
               u.profile_image_url as profile_image_url,
               u.last_active_at as last_active_at,
               score
        ORDER BY score DESC
        SKIP $offset
        LIMIT $limit
        """
        
        result = self.session.run(
            cypher_query,
            search_query=f"{query}*",  # Prefix search
            requester_id=requester_id,
            offset=offset,
            limit=limit
        )
        
        return [dict(record) for record in result]
    
    def search_by_artist(
        self,
        artist_query: str,
        requester_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict]:
        """
        Search users who listen to a specific artist
        
        Args:
            artist_query: Artist name search query
            requester_id: ID of user performing search
            limit: Max results
            offset: Pagination offset
        
        Returns:
            List of user dicts with artist overlap info
        """
        cypher_query = """
        // Find matching artists
        CALL db.index.fulltext.queryNodes('artist_name_search', $artist_query)
        YIELD node as a, score
        WITH a
        LIMIT 5  // Consider top 5 matching artists
        
        // Find users who have these artists in their top artists
        MATCH (u:User)-[r:TOP_ARTIST]->(a)
        WHERE u.id <> $requester_id
          AND u.is_active = true
          AND u.email_verified = true
          AND u.discoverable_by_music = true

        WITH u, MIN(r.rank) as best_rank, COLLECT({artist_id: a.id, artist_name: a.name, rank: r.rank}) as artists

        RETURN u.id as user_id,
               u.handle as handle,
               u.city as city,
               u.country as country,
               u.city_visible as city_visible,
               u.profile_image_url as profile_image_url,
               u.last_active_at as last_active_at,
               artists,
               best_rank as total_plays
        ORDER BY best_rank ASC
        SKIP $offset
        LIMIT $limit
        """
        
        result = self.session.run(
            cypher_query,
            artist_query=f"{artist_query}*",
            requester_id=requester_id,
            offset=offset,
            limit=limit
        )
        
        return [dict(record) for record in result]
    
    def search_by_genre(
        self,
        genre_query: str,
        requester_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict]:
        """
        Search users by genre preference
        
        Args:
            genre_query: Genre name search query
            requester_id: ID of user performing search
            limit: Max results
            offset: Pagination offset
        
        Returns:
            List of user dicts with genre info
        """
        cypher_query = """
        MATCH (u:User)-[:TOP_ARTIST]->(a:Artist)
        WHERE u.id <> $requester_id
          AND u.is_active = true
          AND u.email_verified = true
          AND u.discoverable_by_music = true
          AND a.genres IS NOT NULL
          AND any(genre IN a.genres WHERE toLower(genre) CONTAINS toLower($genre_query))
        WITH u, COLLECT(DISTINCT a) as matched_artists, COUNT(DISTINCT a) as artist_count
        WITH u, REDUCE(s = [], a IN matched_artists | s + a.genres) as genres, artist_count
        RETURN u.id as user_id,
               u.handle as handle,
               u.city as city,
               u.country as country,
               u.city_visible as city_visible,
               u.profile_image_url as profile_image_url,
               u.last_active_at as last_active_at,
               [g IN genres WHERE toLower(g) CONTAINS toLower($genre_query)] as genres,
               artist_count
        ORDER BY artist_count DESC
        SKIP $offset
        LIMIT $limit
        """

        result = self.session.run(
            cypher_query,
            genre_query=genre_query,
            requester_id=requester_id,
            offset=offset,
            limit=limit
        )
        
        return [dict(record) for record in result]
    
    def get_shared_artists(
        self,
        requester_id: str,
        target_id: str,
        limit: int = 3
    ) -> List[Dict]:
        """
        Get top shared artists between two users
        
        Args:
            requester_id: Requesting user ID
            target_id: Target user ID
            limit: Max shared artists to return
        
        Returns:
            List of shared artist dicts with play counts
        """
        cypher_query = """
        MATCH (u1:User {id: $requester_id})-[r1:TOP_ARTIST]->(a:Artist)
              <-[r2:TOP_ARTIST]-(u2:User {id: $target_id})
        WITH a, MIN(r1.rank) as rank1, MIN(r2.rank) as rank2
        ORDER BY (rank1 + rank2) ASC
        LIMIT $limit
        RETURN a.id as artist_id,
               a.name as artist_name,
               rank1 as play_count_requester,
               rank2 as play_count_target
        """
        
        result = self.session.run(
            cypher_query,
            requester_id=requester_id,
            target_id=target_id,
            limit=limit
        )
        
        return [dict(record) for record in result]
    
    def get_shared_genres(
        self,
        requester_id: str,
        target_id: str,
        limit: int = 5
    ) -> List[str]:
        """
        Get shared genres between two users
        
        Args:
            requester_id: Requesting user ID
            target_id: Target user ID
            limit: Max genres to return
        
        Returns:
            List of genre names
        """
        cypher_query = """
        MATCH (u1:User {id: $requester_id})-[:TOP_ARTIST]->(a1:Artist)
        WHERE a1.genres IS NOT NULL AND size(a1.genres) > 0
        WITH a1.genres as genre_list1
        UNWIND genre_list1 as g1
        WITH COLLECT(DISTINCT g1) as genres1
        MATCH (u2:User {id: $target_id})-[:TOP_ARTIST]->(a2:Artist)
        WHERE a2.genres IS NOT NULL AND size(a2.genres) > 0
        UNWIND a2.genres as g2
        WITH genres1, g2
        WHERE g2 IN genres1
        RETURN DISTINCT g2 as genre_name
        LIMIT $limit
        """
        
        result = self.session.run(
            cypher_query,
            requester_id=requester_id,
            target_id=target_id,
            limit=limit
        )
        
        return [record["genre_name"] for record in result]
    
    def calculate_compatibility_score(
        self,
        requester_id: str,
        target_id: str
    ) -> Optional[float]:
        """
        Calculate compatibility score between two users based on music taste
        
        Score is based on:
        - Shared artists (weighted by play counts)
        - Shared genres
        - Artist diversity overlap
        
        Returns:
            Compatibility score 0-100, or None if insufficient data
        """
        cypher_query = """
        MATCH (u1:User {id: $requester_id})-[r1:TOP_ARTIST]->(a:Artist)
              <-[r2:TOP_ARTIST]-(u2:User {id: $target_id})
        WITH COUNT(DISTINCT a) as shared_artists,
             SUM((11.0 - r1.rank) * (11.0 - r2.rank)) as weighted_overlap

        MATCH (u1:User {id: $requester_id})-[:TOP_ARTIST]->(a1:Artist)
        WITH shared_artists, weighted_overlap, COUNT(DISTINCT a1) as total_u1

        MATCH (u2:User {id: $target_id})-[:TOP_ARTIST]->(a2:Artist)
        WITH shared_artists, weighted_overlap, total_u1, COUNT(DISTINCT a2) as total_u2

        RETURN shared_artists,
               total_u1,
               total_u2,
               weighted_overlap
        """
        
        result = self.session.run(
            cypher_query,
            requester_id=requester_id,
            target_id=target_id
        )
        
        record = result.single()
        if not record:
            return None
        
        shared_artists = record["shared_artists"]
        total_u1 = record["total_u1"]
        total_u2 = record["total_u2"]

        if total_u1 == 0 or total_u2 == 0:
            return None

        # Jaccard similarity for artists
        union_size = total_u1 + total_u2 - shared_artists
        artist_similarity = (shared_artists / union_size) if union_size > 0 else 0

        # Combined score (0-100)
        score = artist_similarity * 100

        return round(score, 1)
    
    def get_activity_score(self, user_id: str, days: int = 30) -> float:
        """
        Calculate user activity score based on recent plays
        
        Args:
            user_id: User ID
            days: Look-back period in days
        
        Returns:
            Activity score (log-scaled)
        """
        cypher_query = """
        MATCH (u:User {id: $user_id})-[:PLAYED]->(p:Play)
        WHERE p.played_at > datetime() - duration({days: $days})
        RETURN COUNT(p) as play_count
        """
        
        result = self.session.run(cypher_query, user_id=user_id, days=days)
        record = result.single()
        
        if not record:
            return 0.0
        
        play_count = record["play_count"]
        
        # Log scale: 0 plays = 0, 10 plays = ~0.3, 100 plays = ~0.6, 1000 plays = ~0.9
        if play_count == 0:
            return 0.0
        
        return min(math.log10(play_count + 1) / 3.0, 1.0)
    
    def calculate_distance_km(
        self,
        city1: Optional[str],
        city2: Optional[str]
    ) -> Optional[float]:
        return distance_between_cities_km(city1, city2)
    
    def update_user_activity(self, user_id: str):
        """Update user's last_active_at timestamp"""
        cypher_query = """
        MATCH (u:User {id: $user_id})
        SET u.last_active_at = datetime()
        """
        self.session.run(cypher_query, user_id=user_id)

