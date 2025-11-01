"""
Search Service - Business logic for profile search with ranking
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import time
import math

from app.db.repositories.search_repository import SearchRepository
from app.models.search_models import (
    ProfileSearchHit,
    ProfileSearchResponse,
    SearchType,
    SharedArtist
)


class SearchService:
    """Service for profile search with ranking"""
    
    def __init__(self, session):
        self.repository = SearchRepository(session)
    
    def search_profiles(
        self,
        query: str,
        requester_id: str,
        search_type: SearchType = SearchType.MIXED,
        city: Optional[str] = None,
        radius_km: int = 50,
        limit: int = 20,
        offset: int = 0,
        min_shared_artists: Optional[int] = None
    ) -> ProfileSearchResponse:
        """
        Search for user profiles with ranking
        
        Args:
            query: Search query string
            requester_id: ID of user performing search
            search_type: Type of search (name, artist, genre, mixed)
            city: Filter by city (optional)
            radius_km: Search radius in km
            limit: Max results
            offset: Pagination offset
            min_shared_artists: Minimum shared artists filter
        
        Returns:
            ProfileSearchResponse with ranked hits
        """
        start_time = time.time()
        
        # Execute search based on type
        if search_type == SearchType.NAME:
            raw_results = self.repository.search_by_name(
                query, requester_id, limit * 2, offset  # Fetch more for ranking
            )
        elif search_type == SearchType.ARTIST:
            raw_results = self.repository.search_by_artist(
                query, requester_id, limit * 2, offset
            )
        elif search_type == SearchType.GENRE:
            raw_results = self.repository.search_by_genre(
                query, requester_id, limit * 2, offset
            )
        else:  # MIXED
            # Combine results from multiple search types
            name_results = self.repository.search_by_name(
                query, requester_id, limit, 0
            )
            artist_results = self.repository.search_by_artist(
                query, requester_id, limit, 0
            )
            
            # Merge and deduplicate
            seen_ids = set()
            raw_results = []
            for result in name_results + artist_results:
                user_id = result["user_id"]
                if user_id not in seen_ids:
                    seen_ids.add(user_id)
                    raw_results.append(result)
        
        # Enrich results with compatibility and ranking
        hits = []
        for result in raw_results:
            target_id = result["user_id"]
            
            # Get shared artists
            shared_artists_data = self.repository.get_shared_artists(
                requester_id, target_id, limit=3
            )
            shared_artists = [
                SharedArtist(
                    artist_id=a["artist_id"],
                    artist_name=a["artist_name"],
                    play_count_requester=a["play_count_requester"],
                    play_count_target=a["play_count_target"]
                )
                for a in shared_artists_data
            ]
            
            # Apply min_shared_artists filter
            if min_shared_artists and len(shared_artists) < min_shared_artists:
                continue
            
            # Get shared genres
            shared_genres = self.repository.get_shared_genres(
                requester_id, target_id, limit=5
            )
            
            # Calculate compatibility score
            compatibility_score = self.repository.calculate_compatibility_score(
                requester_id, target_id
            )
            
            # Calculate activity score
            activity_score = self.repository.get_activity_score(target_id, days=30)
            
            # Calculate proximity score
            requester_city = city  # Use filter city or fetch from requester profile
            target_city = result.get("city")
            distance_km = self.repository.calculate_distance_km(
                requester_city, target_city
            ) if requester_city and target_city else None
            
            proximity_score = self._calculate_proximity_score(distance_km)
            
            # Calculate profile quality score
            profile_quality = self._calculate_profile_quality(result)
            
            # Calculate combined search score
            search_score = self._calculate_search_score(
                compatibility_score or 0,
                activity_score,
                proximity_score,
                profile_quality
            )
            
            # Format city bucket based on privacy settings
            city_bucket = self._format_city_bucket(
                result.get("city"),
                result.get("country"),
                result.get("city_visible", "city")
            )
            
            # Format last active
            last_active = self._format_last_active(result.get("last_active_at"))
            
            # Create hit
            hit = ProfileSearchHit(
                user_id=target_id,
                handle=result["handle"],
                city_bucket=city_bucket,
                profile_image_url=result.get("profile_image_url"),
                top_shared_artists=shared_artists,
                shared_genres=shared_genres,
                compatibility_score=compatibility_score,
                search_score=search_score,
                badges=self._get_badges(result),
                distance_km=distance_km,
                last_active=last_active
            )
            
            hits.append(hit)
        
        # Sort by search_score
        hits.sort(key=lambda h: h.search_score, reverse=True)
        
        # Apply limit
        hits = hits[:limit]
        
        # Calculate query time
        query_time_ms = int((time.time() - start_time) * 1000)
        
        # Build response
        return ProfileSearchResponse(
            hits=hits,
            total=len(hits),  # For MVP, return actual count. In production, use COUNT query
            next_cursor=None,  # For MVP, no cursor pagination
            query_time_ms=query_time_ms
        )
    
    def _calculate_search_score(
        self,
        compatibility: float,  # 0-100
        activity: float,  # 0-1
        proximity: float,  # 0-1
        profile_quality: float  # 0-1
    ) -> float:
        """
        Calculate combined search score
        
        Formula: S = 0.5·Compat + 0.2·Activity + 0.2·Proximity + 0.1·Quality
        
        Returns:
            Score 0-100
        """
        # Normalize compatibility to 0-1
        compat_normalized = compatibility / 100.0
        
        score = (
            0.5 * compat_normalized +
            0.2 * activity +
            0.2 * proximity +
            0.1 * profile_quality
        )
        
        return round(score * 100, 2)
    
    def _calculate_proximity_score(self, distance_km: Optional[float]) -> float:
        """
        Calculate proximity score based on distance
        
        Uses exponential decay: exp(-d/400)
        - 0 km = 1.0
        - 50 km = 0.88
        - 200 km = 0.61
        - 400 km = 0.37
        
        Args:
            distance_km: Distance in kilometers
        
        Returns:
            Proximity score 0-1
        """
        if distance_km is None:
            return 0.5  # Neutral score if distance unknown
        
        return math.exp(-distance_km / 400.0)
    
    def _calculate_profile_quality(self, user_data: Dict) -> float:
        """
        Calculate profile quality score
        
        Based on:
        - Has profile image
        - Has about_me
        - Has location
        - Has connected accounts
        
        Returns:
            Quality score 0-1
        """
        score = 0.0
        
        if user_data.get("profile_image_url"):
            score += 0.3
        
        if user_data.get("city"):
            score += 0.2
        
        # Assume connected accounts if we have artist data
        # (In production, check source_accounts field)
        score += 0.5
        
        return min(score, 1.0)
    
    def _format_city_bucket(
        self,
        city: Optional[str],
        country: Optional[str],
        city_visible: str
    ) -> Optional[str]:
        """
        Format city display based on privacy settings
        
        Args:
            city: City name
            country: Country name
            city_visible: Privacy setting ("city", "region", "hidden")
        
        Returns:
            Formatted city string or None
        """
        if city_visible == "hidden" or not city:
            return None
        
        if city_visible == "region":
            # Show region/country only
            return country if country else None
        
        # city_visible == "city"
        return city
    
    def _format_last_active(self, last_active_at) -> Optional[str]:
        """
        Format last active timestamp as relative time
        
        Args:
            last_active_at: DateTime or None
        
        Returns:
            Formatted string like "2 days ago" or None
        """
        if not last_active_at:
            return None
        
        # Convert Neo4j DateTime to Python datetime if needed
        if hasattr(last_active_at, 'to_native'):
            last_active_at = last_active_at.to_native()
        
        now = datetime.utcnow()
        
        # Handle timezone-aware datetimes
        if last_active_at.tzinfo is not None:
            from datetime import timezone
            now = datetime.now(timezone.utc)
        
        delta = now - last_active_at
        
        if delta.days == 0:
            if delta.seconds < 3600:
                return "Just now"
            hours = delta.seconds // 3600
            return f"{hours}h ago"
        elif delta.days == 1:
            return "1 day ago"
        elif delta.days < 7:
            return f"{delta.days} days ago"
        elif delta.days < 30:
            weeks = delta.days // 7
            return f"{weeks}w ago"
        else:
            months = delta.days // 30
            return f"{months}mo ago"
    
    def _get_badges(self, user_data: Dict) -> List[str]:
        """
        Get user badges for display
        
        Args:
            user_data: User data dict
        
        Returns:
            List of badge strings
        """
        badges = []
        
        # Add badges based on user data
        # (In production, fetch from user profile)
        
        return badges

