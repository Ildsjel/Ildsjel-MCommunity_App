"""
User API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user_models import UserResponse, UserUpdate, PrivacySettings
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


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user),
    session = Depends(get_neo4j_session)
):
    """
    Update current authenticated user's profile
    
    Args:
        user_update: User update data
        current_user: Current user from JWT token
        session: Neo4j database session
    
    Returns:
        Updated user profile data
    
    Raises:
        HTTPException: If update fails
    """
    user_service = UserService(session)
    
    # Only update fields that are provided
    updates = user_update.model_dump(exclude_unset=True)
    
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    updated_user = user_service.update_user_profile(current_user["sub"], updates)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return updated_user


@router.patch("/me/privacy", response_model=UserResponse)
async def update_privacy_settings(
    privacy_settings: PrivacySettings,
    current_user: dict = Depends(get_current_user),
    session = Depends(get_neo4j_session)
):
    """
    Update privacy/discoverability settings
    
    Args:
        privacy_settings: Privacy settings to update
        current_user: Current user from JWT token
        session: Neo4j database session
    
    Returns:
        Updated user profile data
    
    Raises:
        HTTPException: If update fails
    """
    user_service = UserService(session)
    
    # Only update fields that are provided
    updates = privacy_settings.model_dump(exclude_unset=True)
    
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    updated_user = user_service.update_user_profile(current_user["sub"], updates)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return updated_user

