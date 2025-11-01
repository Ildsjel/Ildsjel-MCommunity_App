"""
Neo4j Repository for User Gallery
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from neo4j import Session


class GalleryRepository:
    """Repository for gallery operations"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def add_gallery_image(
        self,
        user_id: str,
        image_id: str,
        image_url: str,
        thumbnail_url: str,
        caption: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add a new image to user's gallery"""
        # Get current max position
        position_query = """
        MATCH (u:User {id: $user_id})-[:HAS_GALLERY_IMAGE]->(img:GalleryImage)
        RETURN COALESCE(MAX(img.position), -1) as max_position
        """
        result = self.session.run(position_query, user_id=user_id)
        record = result.single()
        next_position = (record["max_position"] + 1) if record else 0
        
        # Check if user already has 10 images
        if next_position >= 10:
            raise ValueError("Gallery is full. Maximum 10 images allowed.")
        
        # Create gallery image node
        query = """
        MATCH (u:User {id: $user_id})
        CREATE (img:GalleryImage {
            id: $image_id,
            user_id: $user_id,
            image_url: $image_url,
            thumbnail_url: $thumbnail_url,
            caption: $caption,
            uploaded_at: datetime(),
            position: $position
        })
        CREATE (u)-[:HAS_GALLERY_IMAGE]->(img)
        RETURN img
        """
        
        result = self.session.run(
            query,
            user_id=user_id,
            image_id=image_id,
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            caption=caption,
            position=next_position
        )
        
        record = result.single()
        if not record:
            raise ValueError("Failed to create gallery image")
        
        img = record["img"]
        return {
            "id": img["id"],
            "user_id": img["user_id"],
            "image_url": img["image_url"],
            "thumbnail_url": img["thumbnail_url"],
            "caption": img["caption"],
            "uploaded_at": img["uploaded_at"].to_native(),
            "position": img["position"]
        }
    
    def get_user_gallery(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all gallery images for a user"""
        query = """
        MATCH (u:User {id: $user_id})-[:HAS_GALLERY_IMAGE]->(img:GalleryImage)
        RETURN img
        ORDER BY img.position ASC
        """
        
        result = self.session.run(query, user_id=user_id)
        
        images = []
        for record in result:
            img = record["img"]
            images.append({
                "id": img["id"],
                "user_id": img["user_id"],
                "image_url": img["image_url"],
                "thumbnail_url": img["thumbnail_url"],
                "caption": img.get("caption"),
                "uploaded_at": img["uploaded_at"].to_native(),
                "position": img["position"]
            })
        
        return images
    
    def delete_gallery_image(self, user_id: str, image_id: str) -> bool:
        """Delete a gallery image and reorder remaining images"""
        # Get the position of the image to delete
        get_pos_query = """
        MATCH (u:User {id: $user_id})-[:HAS_GALLERY_IMAGE]->(img:GalleryImage {id: $image_id})
        RETURN img.position as position, img.image_url as image_url
        """
        result = self.session.run(get_pos_query, user_id=user_id, image_id=image_id)
        record = result.single()
        
        if not record:
            return False
        
        deleted_position = record["position"]
        image_url = record["image_url"]
        
        # Delete the image node
        delete_query = """
        MATCH (u:User {id: $user_id})-[r:HAS_GALLERY_IMAGE]->(img:GalleryImage {id: $image_id})
        DELETE r, img
        """
        self.session.run(delete_query, user_id=user_id, image_id=image_id)
        
        # Reorder remaining images
        reorder_query = """
        MATCH (u:User {id: $user_id})-[:HAS_GALLERY_IMAGE]->(img:GalleryImage)
        WHERE img.position > $deleted_position
        SET img.position = img.position - 1
        """
        self.session.run(reorder_query, user_id=user_id, deleted_position=deleted_position)
        
        return True
    
    def update_image_caption(
        self, 
        user_id: str, 
        image_id: str, 
        caption: Optional[str]
    ) -> bool:
        """Update caption for a gallery image"""
        query = """
        MATCH (u:User {id: $user_id})-[:HAS_GALLERY_IMAGE]->(img:GalleryImage {id: $image_id})
        SET img.caption = $caption
        RETURN img
        """
        
        result = self.session.run(
            query,
            user_id=user_id,
            image_id=image_id,
            caption=caption
        )
        
        return result.single() is not None
    
    def reorder_gallery(self, user_id: str, image_positions: List[Dict[str, int]]) -> bool:
        """
        Reorder gallery images
        image_positions: [{"image_id": "...", "position": 0}, ...]
        """
        for item in image_positions:
            query = """
            MATCH (u:User {id: $user_id})-[:HAS_GALLERY_IMAGE]->(img:GalleryImage {id: $image_id})
            SET img.position = $position
            """
            self.session.run(
                query,
                user_id=user_id,
                image_id=item["image_id"],
                position=item["position"]
            )
        
        return True
    
    def get_gallery_count(self, user_id: str) -> int:
        """Get total number of images in user's gallery"""
        query = """
        MATCH (u:User {id: $user_id})-[:HAS_GALLERY_IMAGE]->(img:GalleryImage)
        RETURN COUNT(img) as count
        """
        
        result = self.session.run(query, user_id=user_id)
        record = result.single()
        return record["count"] if record else 0

