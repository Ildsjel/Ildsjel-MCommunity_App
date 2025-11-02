"""
Repository for comment operations in Neo4j
"""
from neo4j import Session
from neo4j.time import DateTime as Neo4jDateTime
from typing import Optional
from datetime import datetime
import uuid


def neo4j_datetime_to_python(dt) -> datetime:
    """Convert Neo4j DateTime to Python datetime"""
    if dt is None:
        return None
    if isinstance(dt, Neo4jDateTime):
        return datetime(
            dt.year, dt.month, dt.day,
            dt.hour, dt.minute, dt.second,
            dt.nanosecond // 1000  # Convert nanoseconds to microseconds
        )
    return dt


class CommentRepository:
    """Repository for managing image comments"""
    
    @staticmethod
    def create_comment(
        session: Session,
        user_id: str,
        image_id: str,
        content: str
    ) -> dict:
        """Create a new comment on an image"""
        comment_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        query = """
        MATCH (u:User {id: $user_id})
        MATCH (img:GalleryImage {id: $image_id})
        CREATE (c:Comment {
            id: $comment_id,
            content: $content,
            created_at: datetime($created_at),
            is_edited: false
        })
        CREATE (u)-[:WROTE]->(c)
        CREATE (c)-[:COMMENTED_ON]->(img)
        RETURN c.id as id,
               c.content as content,
               c.created_at as created_at,
               c.is_edited as is_edited,
               u.id as author_id,
               u.handle as author_username,
               u.display_name as author_display_name,
               COALESCE(u.avatar_url, u.profile_image_url) as author_avatar_url,
               img.id as image_id
        """
        
        result = session.run(
            query,
            user_id=user_id,
            image_id=image_id,
            comment_id=comment_id,
            content=content,
            created_at=now.isoformat()
        )
        
        record = result.single()
        if not record:
            raise ValueError("Failed to create comment")
        
        return {
            "id": record["id"],
            "image_id": record["image_id"],
            "content": record["content"],
            "created_at": neo4j_datetime_to_python(record["created_at"]),
            "updated_at": None,
            "is_edited": record["is_edited"],
            "author": {
                "user_id": record["author_id"],
                "username": record["author_username"],
                "display_name": record["author_display_name"],
                "avatar_url": record["author_avatar_url"]
            }
        }
    
    @staticmethod
    def get_comments_for_image(
        session: Session,
        image_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[list[dict], int]:
        """Get all comments for an image with pagination"""
        
        # Get comments
        query = """
        MATCH (img:GalleryImage {id: $image_id})
        MATCH (c:Comment)-[:COMMENTED_ON]->(img)
        MATCH (u:User)-[:WROTE]->(c)
        RETURN c.id as id,
               c.content as content,
               c.created_at as created_at,
               c.updated_at as updated_at,
               c.is_edited as is_edited,
               u.id as author_id,
               u.handle as author_username,
               u.display_name as author_display_name,
               COALESCE(u.avatar_url, u.profile_image_url) as author_avatar_url,
               img.id as image_id
        ORDER BY c.created_at DESC
        SKIP $offset
        LIMIT $limit
        """
        
        result = session.run(query, image_id=image_id, offset=offset, limit=limit)
        
        comments = []
        for record in result:
            comments.append({
                "id": record["id"],
                "image_id": record["image_id"],
                "content": record["content"],
                "created_at": neo4j_datetime_to_python(record["created_at"]),
                "updated_at": neo4j_datetime_to_python(record["updated_at"]),
                "is_edited": record["is_edited"],
                "author": {
                    "user_id": record["author_id"],
                    "username": record["author_username"],
                    "display_name": record["author_display_name"],
                    "avatar_url": record["author_avatar_url"]
                }
            })
        
        # Get total count
        count_query = """
        MATCH (img:GalleryImage {id: $image_id})
        MATCH (c:Comment)-[:COMMENTED_ON]->(img)
        RETURN count(c) as total
        """
        
        count_result = session.run(count_query, image_id=image_id)
        total = count_result.single()["total"]
        
        return comments, total
    
    @staticmethod
    def update_comment(
        session: Session,
        comment_id: str,
        user_id: str,
        content: str
    ) -> Optional[dict]:
        """Update a comment (only by author)"""
        now = datetime.utcnow()
        
        query = """
        MATCH (u:User {id: $user_id})-[:WROTE]->(c:Comment {id: $comment_id})
        SET c.content = $content,
            c.updated_at = datetime($updated_at),
            c.is_edited = true
        WITH c, u
        MATCH (c)-[:COMMENTED_ON]->(img:GalleryImage)
        RETURN c.id as id,
               c.content as content,
               c.created_at as created_at,
               c.updated_at as updated_at,
               c.is_edited as is_edited,
               u.id as author_id,
               u.handle as author_username,
               u.display_name as author_display_name,
               COALESCE(u.avatar_url, u.profile_image_url) as author_avatar_url,
               img.id as image_id
        """
        
        result = session.run(
            query,
            comment_id=comment_id,
            user_id=user_id,
            content=content,
            updated_at=now.isoformat()
        )
        
        record = result.single()
        if not record:
            return None
        
        return {
            "id": record["id"],
            "image_id": record["image_id"],
            "content": record["content"],
            "created_at": neo4j_datetime_to_python(record["created_at"]),
            "updated_at": neo4j_datetime_to_python(record["updated_at"]),
            "is_edited": record["is_edited"],
            "author": {
                "user_id": record["author_id"],
                "username": record["author_username"],
                "display_name": record["author_display_name"],
                "avatar_url": record["author_avatar_url"]
            }
        }
    
    @staticmethod
    def delete_comment(
        session: Session,
        comment_id: str,
        user_id: str
    ) -> bool:
        """Delete a comment (only by author or image owner)"""
        query = """
        MATCH (c:Comment {id: $comment_id})
        MATCH (c)-[:COMMENTED_ON]->(img:GalleryImage)
        MATCH (img_owner:User)-[:UPLOADED]->(img)
        MATCH (comment_author:User)-[:WROTE]->(c)
        WHERE comment_author.id = $user_id OR img_owner.id = $user_id
        DETACH DELETE c
        RETURN count(c) as deleted
        """
        
        result = session.run(query, comment_id=comment_id, user_id=user_id)
        record = result.single()
        
        return record["deleted"] > 0 if record else False
    
    @staticmethod
    def get_comment_count_for_image(
        session: Session,
        image_id: str
    ) -> int:
        """Get total comment count for an image"""
        query = """
        MATCH (img:GalleryImage {id: $image_id})
        MATCH (c:Comment)-[:COMMENTED_ON]->(img)
        RETURN count(c) as total
        """
        
        result = session.run(query, image_id=image_id)
        record = result.single()
        
        return record["total"] if record else 0

