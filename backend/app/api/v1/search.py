"""
API endpoints for Profile Search
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.auth.jwt_handler import get_current_user
from app.db.neo4j_driver import neo4j_driver
from app.services.search_service import SearchService
from app.models.search_models import (
    ProfileSearchResponse,
    SearchType
)


router = APIRouter(tags=["search"])


@router.get("/search/random", response_model=ProfileSearchResponse)
async def get_random_profiles(
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get random user profiles for discovery
    
    Returns a random selection of discoverable users.
    Order changes on each request for variety.
    """
    requester_id = current_user["id"]
    
    try:
        import time
        start_time = time.time()
        
        with neo4j_driver.get_driver().session() as session:
            # Get random users with basic filtering
            cypher_query = """
            MATCH (u:User)
            WHERE u.id <> $requester_id
              AND u.is_active = true
              AND u.email_verified = true
              AND (u.discoverable_by_name = true OR u.discoverable_by_music = true)
            WITH u, rand() as random
            ORDER BY random
            LIMIT $limit
            RETURN u.id as user_id,
                   u.handle as handle,
                   u.city as city,
                   u.country as country,
                   u.city_visible as city_visible,
                   u.profile_image_url as profile_image_url,
                   u.last_active_at as last_active_at
            """
            
            result = session.run(cypher_query, requester_id=requester_id, limit=limit)
            raw_results = [dict(record) for record in result]
            
            # Enrich with compatibility data
            from app.services.search_service import SearchService
            search_service = SearchService(session)
            
            hits = []
            for user_data in raw_results:
                target_id = user_data["user_id"]
                
                # Get shared artists
                shared_artists_data = search_service.repository.get_shared_artists(
                    requester_id, target_id, limit=3
                )
                shared_artists = [
                    {
                        "artist_id": a["artist_id"],
                        "artist_name": a["artist_name"],
                        "play_count_requester": a["play_count_requester"],
                        "play_count_target": a["play_count_target"]
                    }
                    for a in shared_artists_data
                ]
                
                # Get shared genres
                shared_genres = search_service.repository.get_shared_genres(
                    requester_id, target_id, limit=5
                )
                
                # Calculate compatibility
                compatibility_score = search_service.repository.calculate_compatibility_score(
                    requester_id, target_id
                )
                
                # Calculate activity
                activity_score = search_service.repository.get_activity_score(target_id, days=30)
                
                # Simple search score for random users
                search_score = (
                    (compatibility_score or 0) * 0.5 +
                    activity_score * 50 +
                    (len(shared_artists) * 5)
                )
                
                # Format city bucket
                city_bucket = search_service._format_city_bucket(
                    user_data.get("city"),
                    user_data.get("country"),
                    user_data.get("city_visible", "city")
                )
                
                # Format last active
                last_active = search_service._format_last_active(user_data.get("last_active_at"))
                
                hit = {
                    "user_id": target_id,
                    "handle": user_data["handle"],
                    "city_bucket": city_bucket,
                    "profile_image_url": user_data.get("profile_image_url"),
                    "top_shared_artists": shared_artists,
                    "shared_genres": shared_genres,
                    "compatibility_score": compatibility_score,
                    "search_score": search_score,
                    "badges": [],
                    "distance_km": None,
                    "last_active": last_active
                }
                
                hits.append(hit)
            
            query_time_ms = int((time.time() - start_time) * 1000)
            
            return {
                "hits": hits,
                "total": len(hits),
                "next_cursor": None,
                "query_time_ms": query_time_ms
            }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get random profiles: {str(e)}"
        )


@router.get("/search/profiles", response_model=ProfileSearchResponse)
async def search_profiles(
    q: str = Query(..., min_length=2, max_length=100, description="Search query"),
    type: SearchType = Query(SearchType.MIXED, description="Search type"),
    city: Optional[str] = Query(None, description="Filter by city"),
    radius_km: int = Query(50, ge=10, le=500, description="Search radius in km"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    min_shared_artists: Optional[int] = Query(None, ge=1, le=50, description="Min shared artists"),
    current_user: dict = Depends(get_current_user)
):
    """
    Search for user profiles
    
    Search types:
    - **name**: Search by username/handle
    - **artist**: Search by artist name (finds users who listen to that artist)
    - **genre**: Search by genre (finds users who listen to artists in that genre)
    - **mixed**: Combined search across name and artist
    
    Results are ranked by:
    - Compatibility score (music taste overlap)
    - Activity (recent plays/events/reviews)
    - Proximity (distance from your location)
    - Profile quality (completeness)
    
    Privacy:
    - Only returns users who have enabled discoverability
    - Respects city_visible privacy settings
    - Excludes blocked/shadowbanned users
    """
    requester_id = current_user["id"]
    
    try:
        with neo4j_driver.get_driver().session() as session:
            search_service = SearchService(session)
            
            results = search_service.search_profiles(
                query=q,
                requester_id=requester_id,
                search_type=type,
                city=city,
                radius_km=radius_km,
                limit=limit,
                offset=offset,
                min_shared_artists=min_shared_artists
            )
            
            return results
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/search/autocomplete")
async def autocomplete(
    q: str = Query(..., min_length=2, max_length=100),
    type: SearchType = Query(SearchType.MIXED),
    limit: int = Query(10, ge=1, le=20),
    current_user: dict = Depends(get_current_user)
):
    """
    Autocomplete suggestions for search
    
    Returns quick suggestions for:
    - User handles
    - Artist names
    - Genre names
    """
    requester_id = current_user["id"]
    
    try:
        with neo4j_driver.get_driver().session() as session:
            suggestions = []
            
            if type in [SearchType.NAME, SearchType.MIXED]:
                # User handle suggestions
                user_cypher = """
                CALL db.index.fulltext.queryNodes('user_name_search', $search_query)
                YIELD node as u, score
                WHERE u.id <> $requester_id
                  AND u.is_active = true
                  AND u.discoverable_by_name = true
                RETURN u.handle as text, 'user' as type, score
                ORDER BY score DESC
                LIMIT $limit
                """
                result = session.run(user_cypher, search_query=f"{q}*", requester_id=requester_id, limit=limit)
                suggestions.extend([{"text": r["text"], "type": r["type"]} for r in result])
            
            if type in [SearchType.ARTIST, SearchType.MIXED]:
                # Artist suggestions
                artist_cypher = """
                CALL db.index.fulltext.queryNodes('artist_name_search', $search_query)
                YIELD node as a, score
                RETURN a.name as text, 'artist' as type, score
                ORDER BY score DESC
                LIMIT $limit
                """
                result = session.run(artist_cypher, search_query=f"{q}*", limit=limit)
                suggestions.extend([{"text": r["text"], "type": r["type"]} for r in result])
            
            if type in [SearchType.GENRE, SearchType.MIXED]:
                # Genre suggestions
                genre_cypher = """
                CALL db.index.fulltext.queryNodes('genre_name_search', $search_query)
                YIELD node as g, score
                RETURN g.name as text, 'genre' as type, score
                ORDER BY score DESC
                LIMIT $limit
                """
                result = session.run(genre_cypher, search_query=f"{q}*", limit=limit)
                suggestions.extend([{"text": r["text"], "type": r["type"]} for r in result])
            
            # Deduplicate and limit
            seen = set()
            unique_suggestions = []
            for s in suggestions:
                if s["text"] not in seen:
                    seen.add(s["text"])
                    unique_suggestions.append(s)
            
            return {"suggestions": unique_suggestions[:limit]}
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Autocomplete failed: {str(e)}"
        )

