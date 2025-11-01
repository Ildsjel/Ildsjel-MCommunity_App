"""
Search Repository - Neo4j operations for profile search
"""
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import math


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
        
        // Find users who listen to these artists
        MATCH (u:User)-[r:LISTENS_TO]->(a)
        WHERE u.id <> $requester_id
          AND u.is_active = true
          AND u.email_verified = true
          AND u.discoverable_by_music = true
        
        WITH u, SUM(r.play_count) as total_plays, COLLECT({artist_id: a.id, artist_name: a.name, play_count: r.play_count}) as artists
        
        RETURN u.id as user_id,
               u.handle as handle,
               u.city as city,
               u.country as country,
               u.city_visible as city_visible,
               u.profile_image_url as profile_image_url,
               u.last_active_at as last_active_at,
               artists,
               total_plays
        ORDER BY total_plays DESC
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
        // Find matching genres
        CALL db.index.fulltext.queryNodes('genre_name_search', $genre_query)
        YIELD node as g, score
        WITH g
        LIMIT 3
        
        // Find users who listen to artists in these genres
        MATCH (u:User)-[:LISTENS_TO]->(a:Artist)-[:TAGGED_AS]->(g)
        WHERE u.id <> $requester_id
          AND u.is_active = true
          AND u.email_verified = true
          AND u.discoverable_by_music = true
        
        WITH u, COLLECT(DISTINCT g.name) as genres, COUNT(DISTINCT a) as artist_count
        
        RETURN u.id as user_id,
               u.handle as handle,
               u.city as city,
               u.country as country,
               u.city_visible as city_visible,
               u.profile_image_url as profile_image_url,
               u.last_active_at as last_active_at,
               genres,
               artist_count
        ORDER BY artist_count DESC
        SKIP $offset
        LIMIT $limit
        """
        
        result = self.session.run(
            cypher_query,
            genre_query=f"{genre_query}*",
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
        MATCH (u1:User {id: $requester_id})-[r1:LISTENS_TO]->(a:Artist)<-[r2:LISTENS_TO]-(u2:User {id: $target_id})
        WITH a, r1.play_count as count1, r2.play_count as count2
        ORDER BY (count1 + count2) DESC
        LIMIT $limit
        RETURN a.id as artist_id,
               a.name as artist_name,
               count1 as play_count_requester,
               count2 as play_count_target
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
        MATCH (u1:User {id: $requester_id})-[:LISTENS_TO]->(a1:Artist)-[:TAGGED_AS]->(g:Genre)
        <-[:TAGGED_AS]-(a2:Artist)<-[:LISTENS_TO]-(u2:User {id: $target_id})
        WITH g, COUNT(DISTINCT a1) + COUNT(DISTINCT a2) as relevance
        ORDER BY relevance DESC
        LIMIT $limit
        RETURN g.name as genre_name
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
        // Get shared artists
        MATCH (u1:User {id: $requester_id})-[r1:LISTENS_TO]->(a:Artist)<-[r2:LISTENS_TO]-(u2:User {id: $target_id})
        WITH COUNT(a) as shared_artists,
             SUM(r1.play_count * r2.play_count) as weighted_overlap
        
        // Get total artists for each user
        MATCH (u1:User {id: $requester_id})-[:LISTENS_TO]->(a1:Artist)
        WITH shared_artists, weighted_overlap, COUNT(DISTINCT a1) as total_u1
        
        MATCH (u2:User {id: $target_id})-[:LISTENS_TO]->(a2:Artist)
        WITH shared_artists, weighted_overlap, total_u1, COUNT(DISTINCT a2) as total_u2
        
        // Get shared genres
        MATCH (u1:User {id: $requester_id})-[:LISTENS_TO]->(:Artist)-[:TAGGED_AS]->(g:Genre)
        <-[:TAGGED_AS]-(:Artist)<-[:LISTENS_TO]-(u2:User {id: $target_id})
        WITH shared_artists, weighted_overlap, total_u1, total_u2, COUNT(DISTINCT g) as shared_genres
        
        RETURN shared_artists,
               shared_genres,
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
        shared_genres = record["shared_genres"]
        total_u1 = record["total_u1"]
        total_u2 = record["total_u2"]
        
        if total_u1 == 0 or total_u2 == 0:
            return None
        
        # Jaccard similarity for artists
        union_size = total_u1 + total_u2 - shared_artists
        artist_similarity = (shared_artists / union_size) if union_size > 0 else 0
        
        # Genre overlap bonus
        genre_bonus = min(shared_genres / 5.0, 1.0)  # Cap at 5 shared genres
        
        # Combined score (0-100)
        score = (artist_similarity * 70 + genre_bonus * 30)
        
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
        """
        Calculate approximate distance between two cities
        
        For MVP, this is a placeholder. In production, use:
        - Geocoding service (Google Maps, OpenStreetMap)
        - Pre-computed city coordinates database
        - Haversine formula for distance
        
        Args:
            city1: First city name
            city2: Second city name
        
        Returns:
            Distance in km, or None if cities unknown
        """
        # Placeholder: Return None for now
        # In production, implement actual distance calculation
        return None
    
    def update_user_activity(self, user_id: str):
        """Update user's last_active_at timestamp"""
        cypher_query = """
        MATCH (u:User {id: $user_id})
        SET u.last_active_at = datetime()
        """
        self.session.run(cypher_query, user_id=user_id)

