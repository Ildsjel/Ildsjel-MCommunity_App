"""
Search Repository - Neo4j operations for profile search
"""
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import math

# City coordinate lookup (lat, lon) — covers major metal scene cities
_CITY_COORDS: Dict[str, Tuple[float, float]] = {
    # Germany
    'berlin':      (52.5200, 13.4050),
    'hamburg':     (53.5511,  9.9937),
    'munich':      (48.1351, 11.5820),
    'münchen':     (48.1351, 11.5820),
    'cologne':     (50.9333,  6.9500),
    'köln':        (50.9333,  6.9500),
    'frankfurt':   (50.1109,  8.6821),
    'stuttgart':   (48.7758,  9.1829),
    'düsseldorf':  (51.2217,  6.7762),
    'dusseldorf':  (51.2217,  6.7762),
    'dortmund':    (51.5136,  7.4653),
    'essen':       (51.4556,  7.0116),
    'leipzig':     (51.3397, 12.3731),
    'bremen':      (53.0793,  8.8017),
    'dresden':     (51.0504, 13.7373),
    'hannover':    (52.3759,  9.7320),
    'nuremberg':   (49.4521, 11.0767),
    'nürnberg':    (49.4521, 11.0767),
    'mannheim':    (49.4875,  8.4660),
    'wacken':      (54.0783,  9.3740),
    # Austria
    'vienna':      (48.2082, 16.3738),
    'wien':        (48.2082, 16.3738),
    'graz':        (47.0707, 15.4395),
    'linz':        (48.3069, 14.2858),
    'salzburg':    (47.8095, 13.0550),
    'innsbruck':   (47.2692, 11.4041),
    # Switzerland
    'zurich':      (47.3769,  8.5417),
    'zürich':      (47.3769,  8.5417),
    'bern':        (46.9481,  7.4474),
    'basel':       (47.5596,  7.5886),
    'geneva':      (46.2044,  6.1432),
    # Scandinavia
    'oslo':        (59.9139, 10.7522),
    'stockholm':   (59.3293, 18.0686),
    'copenhagen':  (55.6761, 12.5683),
    'gothenburg':  (57.7089, 11.9746),
    'göteborg':    (57.7089, 11.9746),
    'helsinki':    (60.1699, 24.9384),
    'bergen':      (60.3913,  5.3221),
    'trondheim':   (63.4305, 10.3951),
    # UK & Ireland
    'london':      (51.5074, -0.1278),
    'manchester':  (53.4808, -2.2426),
    'birmingham':  (52.4862, -1.8904),
    'edinburgh':   (55.9533, -3.1883),
    'glasgow':     (55.8642, -4.2518),
    'dublin':      (53.3498, -6.2603),
    # Netherlands & Belgium
    'amsterdam':   (52.3676,  4.9041),
    'rotterdam':   (51.9244,  4.4777),
    'brussels':    (50.8503,  4.3517),
    'antwerp':     (51.2194,  4.4025),
    # France
    'paris':       (48.8566,  2.3522),
    'lyon':        (45.7640,  4.8357),
    'marseille':   (43.2965,  5.3698),
    'bordeaux':    (44.8378, -0.5792),
    'toulouse':    (43.6047,  1.4442),
    # Poland
    'warsaw':      (52.2297, 21.0122),
    'wroclaw':     (51.1079, 17.0385),
    'wrocław':     (51.1079, 17.0385),
    'krakow':      (50.0647, 19.9450),
    'kraków':      (50.0647, 19.9450),
    'gdansk':      (54.3520, 18.6466),
    'gdańsk':      (54.3520, 18.6466),
    # Czech Republic
    'prague':      (50.0755, 14.4378),
    'praha':       (50.0755, 14.4378),
    'brno':        (49.1951, 16.6068),
    # Italy
    'rome':        (41.9028, 12.4964),
    'milan':       (45.4642,  9.1900),
    'milano':      (45.4642,  9.1900),
    'florence':    (43.7696, 11.2558),
    'bologna':     (44.4949, 11.3426),
    # Spain
    'madrid':      (40.4168, -3.7038),
    'barcelona':   (41.3851,  2.1734),
    'bilbao':      (43.2630, -2.9340),
    # USA
    'new york':    (40.7128, -74.0060),
    'los angeles': (34.0522,-118.2437),
    'chicago':     (41.8781, -87.6298),
    'portland':    (45.5231,-122.6765),
    'seattle':     (47.6062,-122.3321),
    'san francisco':(37.7749,-122.4194),
    'atlanta':     (33.7490, -84.3880),
    'denver':      (39.7392,-104.9903),
    'boston':      (42.3601, -71.0589),
    # Canada
    'toronto':     (43.6532, -79.3832),
    'montreal':    (45.5017, -73.5673),
    'vancouver':   (49.2827,-123.1207),
    # Other
    'tokyo':       (35.6762, 139.6503),
    'sydney':      (-33.8688, 151.2093),
    'melbourne':   (-37.8136, 144.9631),
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


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
        MATCH (u1:User {id: $requester_id})-[r1:LISTENS_TO]->(a1:Artist)
        MATCH (u2:User {id: $target_id})-[r2:LISTENS_TO]->(a2:Artist)
        WHERE a1.name = a2.name
        WITH a1, a2, r1.play_count as count1, r2.play_count as count2
        ORDER BY (count1 + count2) DESC
        LIMIT $limit
        RETURN COALESCE(a1.id, a2.id) as artist_id,
               a1.name as artist_name,
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
        // Get shared artists (by name to handle duplicate artist nodes)
        MATCH (u1:User {id: $requester_id})-[r1:LISTENS_TO]->(a1:Artist)
        MATCH (u2:User {id: $target_id})-[r2:LISTENS_TO]->(a2:Artist)
        WHERE a1.name = a2.name
        WITH COUNT(DISTINCT a1.name) as shared_artists,
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
        if not city1 or not city2:
            return None
        key1 = city1.lower().strip()
        key2 = city2.lower().strip()
        coords1 = _CITY_COORDS.get(key1)
        coords2 = _CITY_COORDS.get(key2)
        if coords1 is None or coords2 is None:
            return None
        return round(_haversine_km(coords1[0], coords1[1], coords2[0], coords2[1]))
    
    def update_user_activity(self, user_id: str):
        """Update user's last_active_at timestamp"""
        cypher_query = """
        MATCH (u:User {id: $user_id})
        SET u.last_active_at = datetime()
        """
        self.session.run(cypher_query, user_id=user_id)

