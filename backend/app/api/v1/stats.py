"""
API endpoints for User Statistics
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from app.auth.jwt_handler import get_current_user
from app.db.neo4j_driver import neo4j_driver


router = APIRouter(tags=["stats"])


@router.get("/users/me/top-artists")
async def get_my_top_artists(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get current user's top artists based on scrobbles"""
    user_id = current_user["id"]
    
    try:
        with neo4j_driver.get_driver().session() as session:
            query = """
            MATCH (u:User {id: $user_id})-[:PLAYED]->(p:Play)-[:OF_TRACK]->(t:Track)
            <-[:PERFORMED]-(a:Artist)
            WITH a, COUNT(p) as play_count
            ORDER BY play_count DESC, a.name ASC
            LIMIT $limit
            RETURN a.id as artist_id, 
                   a.name as artist_name, 
                   a.spotify_url as spotify_url,
                   play_count
            """
            
            result = session.run(query, user_id=user_id, limit=limit)
            
            top_artists = []
            for record in result:
                top_artists.append({
                    "artist_id": record["artist_id"],
                    "artist_name": record["artist_name"],
                    "spotify_url": record["spotify_url"],
                    "play_count": record["play_count"],
                    "rank": len(top_artists) + 1
                })
            
            return top_artists
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get top artists: {str(e)}")


@router.get("/users/{user_id}/top-artists")
async def get_user_top_artists(
    user_id: str,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Get any user's top artists based on scrobbles (public)"""
    try:
        with neo4j_driver.get_driver().session() as session:
            query = """
            MATCH (u:User {id: $user_id})-[:PLAYED]->(p:Play)-[:OF_TRACK]->(t:Track)
            <-[:PERFORMED]-(a:Artist)
            WITH a, COUNT(p) as play_count
            ORDER BY play_count DESC, a.name ASC
            LIMIT $limit
            RETURN a.id as artist_id, 
                   a.name as artist_name, 
                   a.spotify_url as spotify_url,
                   play_count
            """
            
            result = session.run(query, user_id=user_id, limit=limit)
            
            top_artists = []
            for record in result:
                top_artists.append({
                    "artist_id": record["artist_id"],
                    "artist_name": record["artist_name"],
                    "spotify_url": record["spotify_url"],
                    "play_count": record["play_count"],
                    "rank": len(top_artists) + 1
                })
            
            return top_artists
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get top artists: {str(e)}")

