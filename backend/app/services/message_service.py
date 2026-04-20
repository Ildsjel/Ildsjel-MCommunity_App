from typing import List, Optional
from app.db.repositories.message_repository import MessageRepository


class MessageService:
    def __init__(self, session):
        self.repo = MessageRepository(session)

    def get_or_create_conversation(self, user_a: str, user_b: str) -> dict:
        return self.repo.get_or_create_conversation(user_a, user_b)

    def list_conversations(self, user_id: str) -> List[dict]:
        return self.repo.list_conversations(user_id)

    def get_conversation(self, conversation_id: str, user_id: str) -> Optional[dict]:
        return self.repo.get_conversation(conversation_id, user_id)

    def get_messages(self, conversation_id: str, skip: int = 0, limit: int = 50) -> List[dict]:
        return self.repo.get_messages(conversation_id, skip, limit)

    def count_messages(self, conversation_id: str) -> int:
        return self.repo.count_messages(conversation_id)

    def send_message(self, conversation_id: str, sender_id: str, text: str) -> dict:
        return self.repo.send_message(conversation_id, sender_id, text)

    def mark_read(self, conversation_id: str, user_id: str) -> None:
        self.repo.mark_read(conversation_id, user_id)
