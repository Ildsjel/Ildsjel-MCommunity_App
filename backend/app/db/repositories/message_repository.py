from typing import List, Optional
from datetime import datetime
import uuid


class MessageRepository:
    def __init__(self, session):
        self.session = session

    def get_or_create_conversation(self, user_a: str, user_b: str) -> dict:
        """Find existing DM conversation between two users, or create one."""
        result = self.session.run(
            """
            MATCH (a:User {id: $user_a})-[:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(b:User {id: $user_b})
            RETURN c.id AS id, c.created_at AS created_at, c.last_message_at AS last_message_at
            LIMIT 1
            """,
            user_a=user_a, user_b=user_b,
        )
        record = result.single()
        if record:
            return {"id": record["id"], "created_at": record["created_at"], "last_message_at": record["last_message_at"]}

        conv_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        self.session.run(
            """
            MATCH (a:User {id: $user_a}), (b:User {id: $user_b})
            CREATE (c:Conversation {id: $conv_id, created_at: $now, last_message_at: $now})
            CREATE (a)-[:PARTICIPATES_IN {joined_at: $now, last_read_at: $now}]->(c)
            CREATE (b)-[:PARTICIPATES_IN {joined_at: $now, last_read_at: null}]->(c)
            """,
            user_a=user_a, user_b=user_b, conv_id=conv_id, now=now,
        )
        return {"id": conv_id, "created_at": now, "last_message_at": now}

    def list_conversations(self, user_id: str) -> List[dict]:
        """Return all conversations for a user, sorted by last message."""
        result = self.session.run(
            """
            MATCH (me:User {id: $user_id})-[my_rel:PARTICIPATES_IN]->(c:Conversation)<-[:PARTICIPATES_IN]-(other:User)
            WHERE other.id <> $user_id
            OPTIONAL MATCH (last_msg:Message)-[:PART_OF]->(c)
            WITH c, other, my_rel, last_msg
            ORDER BY last_msg.created_at DESC
            WITH c, other, my_rel, collect(last_msg)[0] AS last_msg
            OPTIONAL MATCH (unread:Message)-[:PART_OF]->(c)
            WHERE unread.sender_id <> $user_id
              AND (my_rel.last_read_at IS NULL OR unread.created_at > my_rel.last_read_at)
            RETURN c.id AS id,
                   c.last_message_at AS last_message_at,
                   other.id AS other_id,
                   other.handle AS other_handle,
                   other.profile_image_url AS other_image,
                   other.city AS other_city,
                   other.country AS other_country,
                   last_msg.text AS last_text,
                   last_msg.sender_id AS last_sender_id,
                   last_msg.created_at AS last_msg_at,
                   count(unread) AS unread_count
            ORDER BY c.last_message_at DESC
            """,
            user_id=user_id,
        )
        return [
            {
                "id": r["id"],
                "last_message_at": r["last_message_at"],
                "other_user": {
                    "id": r["other_id"],
                    "handle": r["other_handle"],
                    "profile_image_url": r["other_image"],
                    "city": r["other_city"],
                    "country": r["other_country"],
                },
                "last_message": {
                    "text": r["last_text"],
                    "sender_id": r["last_sender_id"],
                    "created_at": r["last_msg_at"],
                } if r["last_text"] else None,
                "unread_count": r["unread_count"],
            }
            for r in result
        ]

    def get_conversation(self, conversation_id: str, user_id: str) -> Optional[dict]:
        """Get conversation with other participant info. Returns None if user is not a participant."""
        result = self.session.run(
            """
            MATCH (me:User {id: $user_id})-[:PARTICIPATES_IN]->(c:Conversation {id: $conv_id})<-[:PARTICIPATES_IN]-(other:User)
            WHERE other.id <> $user_id
            RETURN c.id AS id, c.created_at AS created_at,
                   other.id AS other_id, other.handle AS other_handle,
                   other.profile_image_url AS other_image,
                   other.city AS other_city, other.country AS other_country
            LIMIT 1
            """,
            user_id=user_id, conv_id=conversation_id,
        )
        record = result.single()
        if not record:
            return None
        return {
            "id": record["id"],
            "created_at": record["created_at"],
            "other_user": {
                "id": record["other_id"],
                "handle": record["other_handle"],
                "profile_image_url": record["other_image"],
                "city": record["other_city"],
                "country": record["other_country"],
            },
        }

    def get_messages(self, conversation_id: str, skip: int = 0, limit: int = 50) -> List[dict]:
        """Get messages for a conversation, newest first."""
        result = self.session.run(
            """
            MATCH (m:Message)-[:PART_OF]->(c:Conversation {id: $conv_id})
            RETURN m.id AS id, m.text AS text, m.sender_id AS sender_id, m.created_at AS created_at
            ORDER BY m.created_at DESC
            SKIP $skip LIMIT $limit
            """,
            conv_id=conversation_id, skip=skip, limit=limit,
        )
        return [
            {"id": r["id"], "text": r["text"], "sender_id": r["sender_id"], "created_at": r["created_at"]}
            for r in result
        ]

    def count_messages(self, conversation_id: str) -> int:
        result = self.session.run(
            "MATCH (m:Message)-[:PART_OF]->(c:Conversation {id: $conv_id}) RETURN count(m) AS n",
            conv_id=conversation_id,
        )
        record = result.single()
        return record["n"] if record else 0

    def send_message(self, conversation_id: str, sender_id: str, text: str) -> dict:
        msg_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        self.session.run(
            """
            MATCH (c:Conversation {id: $conv_id})
            CREATE (m:Message {id: $msg_id, text: $text, sender_id: $sender_id, created_at: $now})
            CREATE (m)-[:PART_OF]->(c)
            SET c.last_message_at = $now
            """,
            conv_id=conversation_id, msg_id=msg_id, text=text, sender_id=sender_id, now=now,
        )
        self.session.run(
            """
            MATCH (u:User {id: $sender_id})-[rel:PARTICIPATES_IN]->(c:Conversation {id: $conv_id})
            SET rel.last_read_at = $now
            """,
            sender_id=sender_id, conv_id=conversation_id, now=now,
        )
        return {"id": msg_id, "text": text, "sender_id": sender_id, "created_at": now}

    def mark_read(self, conversation_id: str, user_id: str) -> None:
        now = datetime.utcnow().isoformat()
        self.session.run(
            """
            MATCH (u:User {id: $user_id})-[rel:PARTICIPATES_IN]->(c:Conversation {id: $conv_id})
            SET rel.last_read_at = $now
            """,
            user_id=user_id, conv_id=conversation_id, now=now,
        )
