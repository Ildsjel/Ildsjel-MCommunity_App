from typing import List
from app.db.repositories.friend_repository import FriendRepository


class FriendService:
    def __init__(self, session):
        self.repo = FriendRepository(session)

    def get_status(self, my_id: str, other_id: str) -> str:
        return self.repo.get_status(my_id, other_id)

    def send_request(self, from_id: str, to_id: str) -> bool:
        return self.repo.send_request(from_id, to_id)

    def accept_request(self, requester_id: str, my_id: str) -> bool:
        return self.repo.accept_request(requester_id, my_id)

    def decline_request(self, requester_id: str, my_id: str) -> bool:
        return self.repo.decline_request(requester_id, my_id)

    def cancel_request(self, my_id: str, other_id: str) -> bool:
        return self.repo.cancel_request(my_id, other_id)

    def unfriend(self, my_id: str, other_id: str) -> bool:
        return self.repo.unfriend(my_id, other_id)

    def list_friends(self, my_id: str) -> List[dict]:
        return self.repo.list_friends(my_id)

    def list_pending_received(self, my_id: str) -> List[dict]:
        return self.repo.list_pending_received(my_id)
