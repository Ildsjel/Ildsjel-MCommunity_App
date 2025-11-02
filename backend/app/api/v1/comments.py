"""
API endpoints for image comments
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.comment_models import (
    CommentCreate,
    CommentUpdate,
    Comment,
    CommentListResponse
)
from app.db.neo4j_driver import get_neo4j_session
from app.db.repositories.comment_repository import CommentRepository
from app.auth.jwt_handler import get_current_user

router = APIRouter(prefix="/comments", tags=["Comments"])


@router.post("", response_model=Comment, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new comment on an image
    
    - **image_id**: ID of the gallery image
    - **content**: Rich text content (max 5000 chars, ~500 words)
    """
    user_id = current_user["id"]
    
    try:
        comment = CommentRepository.create_comment(
            session=session,
            user_id=user_id,
            image_id=comment_data.image_id,
            content=comment_data.content
        )
        return comment
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create comment: {str(e)}"
        )


@router.get("/image/{image_id}", response_model=CommentListResponse)
async def get_comments_for_image(
    image_id: str,
    limit: int = 50,
    offset: int = 0,
    session=Depends(get_neo4j_session)
):
    """
    Get all comments for a specific image
    
    - **image_id**: ID of the gallery image
    - **limit**: Maximum number of comments to return (default: 50)
    - **offset**: Number of comments to skip (default: 0)
    """
    try:
        comments, total = CommentRepository.get_comments_for_image(
            session=session,
            image_id=image_id,
            limit=limit,
            offset=offset
        )
        
        return CommentListResponse(
            comments=comments,
            total=total,
            image_id=image_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch comments: {str(e)}"
        )


@router.put("/{comment_id}", response_model=Comment)
async def update_comment(
    comment_id: str,
    comment_data: CommentUpdate,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Update a comment (only by author)
    
    - **comment_id**: ID of the comment to update
    - **content**: New rich text content
    """
    user_id = current_user["id"]
    
    try:
        comment = CommentRepository.update_comment(
            session=session,
            comment_id=comment_id,
            user_id=user_id,
            content=comment_data.content
        )
        
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found or you don't have permission to edit it"
            )
        
        return comment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update comment: {str(e)}"
        )


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a comment
    
    Can be deleted by:
    - Comment author
    - Image owner
    
    - **comment_id**: ID of the comment to delete
    """
    user_id = current_user["id"]
    
    try:
        deleted = CommentRepository.delete_comment(
            session=session,
            comment_id=comment_id,
            user_id=user_id
        )
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found or you don't have permission to delete it"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete comment: {str(e)}"
        )


@router.get("/image/{image_id}/count")
async def get_comment_count(
    image_id: str,
    session=Depends(get_neo4j_session)
):
    """
    Get total comment count for an image
    
    - **image_id**: ID of the gallery image
    """
    try:
        count = CommentRepository.get_comment_count_for_image(
            session=session,
            image_id=image_id
        )
        
        return {"image_id": image_id, "count": count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get comment count: {str(e)}"
        )

