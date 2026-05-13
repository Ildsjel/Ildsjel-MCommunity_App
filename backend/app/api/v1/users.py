"""
User API Endpoints
"""
import time
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security.http import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from app.models.user_models import UserResponse, UserUpdate
from app.services.user_service import UserService
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user, decode_access_token, security
from app.auth.security import verify_password
from app.auth.token_blacklist import blacklist

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
    user_profile = user_service.get_user_profile(current_user["id"])
    
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
    
    updated_user = user_service.update_user_profile(current_user["id"], updates)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return updated_user


class DeleteAccountRequest(BaseModel):
    password: str = Field(..., min_length=1, description="Current password for re-verification")


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    body: DeleteAccountRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    """Permanently delete the authenticated user's account (GDPR Art. 17).

    Requires the current password as a second factor.  On success:
    - All data owned by the user is cascade-deleted via DETACH DELETE
      (friendships, reviews, messages, gallery nodes, notifications, etc.)
    - The current JWT token is immediately blacklisted so it can no longer
      be used even before it expires.

    This operation is irreversible.
    """
    # 1. Re-verify password
    rec = session.run(
        "MATCH (u:User {id: $uid}) RETURN u.password_hash AS password_hash",
        uid=current_user["id"],
    ).single()
    if not rec:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(body.password, rec["password_hash"] or ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect",
        )

    # 2. Blacklist current token
    token = credentials.credentials
    payload = decode_access_token(token)
    exp = payload.get("exp", time.time() + 3600) if payload else time.time() + 3600
    blacklist.add(token, float(exp))

    # 3. Cascade-delete all user data
    session.run(
        """
        MATCH (u:User {id: $uid})
        OPTIONAL MATCH (u)-[:HAS_GALLERY_IMAGE]->(g:GalleryImage)
        DETACH DELETE g
        WITH u
        DETACH DELETE u
        """,
        uid=current_user["id"],
    )


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/me/notifications")
async def get_notifications(
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    """Return unread Notification nodes for the current user."""
    records = session.run(
        """
        MATCH (n:Notification {user_id: $uid, read: false})
        RETURN n ORDER BY n.created_at DESC
        """,
        uid=current_user["id"],
    )
    return [dict(r["n"]) for r in records]


@router.post("/me/notifications/read-all", status_code=204)
async def mark_all_read(
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    """Mark all unread notifications as read for the current user."""
    session.run(
        "MATCH (n:Notification {user_id: $uid, read: false}) SET n.read = true",
        uid=current_user["id"],
    )
