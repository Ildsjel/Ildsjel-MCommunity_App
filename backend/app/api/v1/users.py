"""
User API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user_models import UserResponse
from app.services.user_service import UserService
from app.db.neo4j_driver import get_neo4j_session
from app.auth.security import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    session = Depends(get_neo4j_session)
):
    """
    Get current authenticated user's profile
    
    Args:
        current_user: Current user from JWT token
        session: Neo4j database session
    
    Returns:
        User profile data
    
    Raises:
        HTTPException: If user not found
    """
    user_service = UserService(session)
    user_profile = user_service.get_user_profile(current_user["sub"])
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user_profile


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    session = Depends(get_neo4j_session)
):
    """
    Get user profile by ID (public endpoint)
    
    Args:
        user_id: User's ID
        session: Neo4j database session
    
    Returns:
        User profile data
    
    Raises:
        HTTPException: If user not found
    """
    user_service = UserService(session)
    user_profile = user_service.get_user_profile(user_id)
    
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user_profile

