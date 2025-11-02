"""
API endpoints for User Gallery and Avatar
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import List, Optional
import uuid

from app.auth.jwt_handler import get_current_user
from app.models.gallery_models import (
    GalleryImage,
    GalleryResponse,
    ImageUploadResponse
)
from app.models.user_models import UserResponse
from app.services.image_service import image_service
from app.db.neo4j_driver import neo4j_driver
from app.db.repositories.gallery_repository import GalleryRepository
from app.db.repositories.user_repository import UserRepository


router = APIRouter(tags=["gallery"])


@router.post("/users/me/avatar", response_model=ImageUploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload or update user avatar"""
    user_id = current_user["id"]
    
    try:
        # Process and save avatar
        image_url, file_path = await image_service.process_avatar(file, user_id)
        
        # Update user profile with new avatar URL
        with neo4j_driver.get_driver().session() as session:
            repo = UserRepository(session)
            updated_user = repo.update_user(user_id, {"profile_image_url": image_url, "avatar_url": image_url})
            
            if not updated_user:
                raise HTTPException(status_code=404, detail="User not found")
        
        return ImageUploadResponse(
            success=True,
            message="Avatar uploaded successfully",
            image_url=image_url
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {str(e)}")


@router.delete("/users/me/avatar")
async def delete_avatar(
    current_user: dict = Depends(get_current_user)
):
    """Delete user avatar"""
    user_id = current_user["id"]
    
    try:
        # Remove avatar URL from user profile
        with neo4j_driver.get_driver().session() as session:
            repo = UserRepository(session)
            updated_user = repo.update_user(user_id, {"profile_image_url": None, "avatar_url": None})
            
            if not updated_user:
                raise HTTPException(status_code=404, detail="User not found")
        
        # Note: We don't delete the physical file to preserve history
        # The file will be overwritten on next upload
        
        return {
            "success": True,
            "message": "Avatar deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete avatar: {str(e)}")


@router.post("/users/me/gallery", response_model=GalleryImage)
async def upload_gallery_image(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload a new image to user's gallery (max 10 images)"""
    user_id = current_user["id"]
    
    try:
        # Check current gallery count
        with neo4j_driver.get_driver().session() as session:
            repo = GalleryRepository(session)
            current_count = repo.get_gallery_count(user_id)
            
            if current_count >= 10:
                raise HTTPException(
                    status_code=400,
                    detail="Gallery is full. Maximum 10 images allowed. Delete an image first."
                )
            
            # Process and save image
            image_id = str(uuid.uuid4())
            image_url, thumbnail_url, file_path = await image_service.process_gallery_image(
                file, user_id
            )
            
            # Save to database
            image_data = repo.add_gallery_image(
                user_id=user_id,
                image_id=image_id,
                image_url=image_url,
                thumbnail_url=thumbnail_url,
                caption=caption
            )
            
            return GalleryImage(**image_data)
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@router.get("/users/me/gallery", response_model=GalleryResponse)
async def get_my_gallery(
    current_user: dict = Depends(get_current_user)
):
    """Get current user's gallery"""
    user_id = current_user["id"]
    
    try:
        with neo4j_driver.get_driver().session() as session:
            gallery_repo = GalleryRepository(session)
            user_repo = UserRepository(session)
            
            images = gallery_repo.get_user_gallery(user_id)
            user = user_repo.get_user_by_id(user_id)
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            return GalleryResponse(
                user_id=user_id,
                handle=user["handle"],
                images=[GalleryImage(**img) for img in images],
                total_images=len(images)
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get gallery: {str(e)}")


@router.get("/users/{user_id}/gallery", response_model=GalleryResponse)
async def get_user_gallery(user_id: str):
    """Get any user's public gallery"""
    try:
        with neo4j_driver.get_driver().session() as session:
            gallery_repo = GalleryRepository(session)
            user_repo = UserRepository(session)
            
            user = user_repo.get_user_by_id(user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            images = gallery_repo.get_user_gallery(user_id)
            
            return GalleryResponse(
                user_id=user_id,
                handle=user["handle"],
                images=[GalleryImage(**img) for img in images],
                total_images=len(images)
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get gallery: {str(e)}")


@router.delete("/users/me/gallery/{image_id}")
async def delete_gallery_image(
    image_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an image from user's gallery"""
    user_id = current_user["id"]
    
    try:
        with neo4j_driver.get_driver().session() as session:
            repo = GalleryRepository(session)
            
            # Get image info before deleting
            images = repo.get_user_gallery(user_id)
            image_to_delete = next((img for img in images if img["id"] == image_id), None)
            
            if not image_to_delete:
                raise HTTPException(status_code=404, detail="Image not found")
            
            # Delete from database
            success = repo.delete_gallery_image(user_id, image_id)
            
            if not success:
                raise HTTPException(status_code=404, detail="Image not found")
            
            # Delete physical files (best effort)
            image_service.delete_image(image_to_delete["image_url"])
            image_service.delete_image(image_to_delete["thumbnail_url"])
            
            return {"success": True, "message": "Image deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")


@router.patch("/users/me/gallery/{image_id}")
async def update_gallery_image_caption(
    image_id: str,
    caption: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Update caption for a gallery image"""
    user_id = current_user["id"]
    
    try:
        with neo4j_driver.get_driver().session() as session:
            repo = GalleryRepository(session)
            success = repo.update_image_caption(user_id, image_id, caption)
            
            if not success:
                raise HTTPException(status_code=404, detail="Image not found")
            
            return {"success": True, "message": "Caption updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update caption: {str(e)}")


@router.get("/users/{user_id}/profile", response_model=UserResponse)
async def get_public_user_profile(user_id: str):
    """Get public user profile (for viewing other users)"""
    try:
        with neo4j_driver.get_driver().session() as session:
            repo = UserRepository(session)
            user = repo.get_user_by_id(user_id)
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Return public user data
            return UserResponse(
                id=user["id"],
                handle=user["handle"],
                email=user["email"],
                country=user.get("country"),
                city=user.get("city"),
                created_at=user["created_at"],
                source_accounts=user.get("source_accounts", []),
                is_pro=user.get("is_pro", False),
                onboarding_complete=user.get("onboarding_complete", False),
                profile_image_url=user.get("profile_image_url"),
                email_verified=user.get("email_verified", False),
                is_active=user.get("is_active", True),
                about_me=user.get("about_me")
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")

