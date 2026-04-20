from typing import Optional, List
from datetime import datetime


class FriendRepository:
    def __init__(self, session):
        self.session = session

    def get_status(self, my_id: str, other_id: str) -> str:
        result = self.session.run(
            """
            OPTIONAL MATCH (me:User {id: $my_id})-[r1:FRIEND_REQUEST]->(other:User {id: $other_id})
            OPTIONAL MATCH (other2:User {id: $other_id})-[r2:FRIEND_REQUEST]->(me2:User {id: $my_id})
            RETURN r1.status AS sent, r2.status AS received
            """,
            my_id=my_id,
            other_id=other_id,
        )
        record = result.single()
        if not record:
            return "none"
        sent = record["sent"]
        received = record["received"]
        if sent == "accepted" or received == "accepted":
            return "accepted"
        if sent == "pending":
            return "pending_sent"
        if received == "pending":
            return "pending_received"
        return "none"

    def send_request(self, from_id: str, to_id: str) -> bool:
        result = self.session.run(
            """
            MATCH (a:User {id: $from_id}), (b:User {id: $to_id})
            WHERE NOT (a)-[:FRIEND_REQUEST]-(b)
            CREATE (a)-[:FRIEND_REQUEST {status: 'pending', created_at: $now}]->(b)
            RETURN true AS ok
            """,
            from_id=from_id,
            to_id=to_id,
            now=datetime.utcnow().isoformat(),
        )
        record = result.single()
        return bool(record and record["ok"])

    def accept_request(self, requester_id: str, my_id: str) -> bool:
        result = self.session.run(
            """
            MATCH (r:User {id: $requester_id})-[rel:FRIEND_REQUEST {status: 'pending'}]->(me:User {id: $my_id})
            SET rel.status = 'accepted', rel.updated_at = $now
            RETURN true AS ok
            """,
            requester_id=requester_id,
            my_id=my_id,
            now=datetime.utcnow().isoformat(),
        )
        record = result.single()
        return bool(record and record["ok"])

    def decline_request(self, requester_id: str, my_id: str) -> bool:
        result = self.session.run(
            """
            MATCH (r:User {id: $requester_id})-[rel:FRIEND_REQUEST {status: 'pending'}]->(me:User {id: $my_id})
            DELETE rel
            RETURN true AS ok
            """,
            requester_id=requester_id,
            my_id=my_id,
        )
        record = result.single()
        return bool(record and record["ok"])

    def cancel_request(self, my_id: str, other_id: str) -> bool:
        result = self.session.run(
            """
            MATCH (me:User {id: $my_id})-[rel:FRIEND_REQUEST {status: 'pending'}]->(other:User {id: $other_id})
            DELETE rel
            RETURN true AS ok
            """,
            my_id=my_id,
            other_id=other_id,
        )
        record = result.single()
        return bool(record and record["ok"])

    def unfriend(self, my_id: str, other_id: str) -> bool:
        result = self.session.run(
            """
            MATCH (me:User {id: $my_id})-[rel:FRIEND_REQUEST {status: 'accepted'}]-(other:User {id: $other_id})
            DELETE rel
            RETURN true AS ok
            """,
            my_id=my_id,
            other_id=other_id,
        )
        record = result.single()
        return bool(record and record["ok"])

    def list_friends(self, my_id: str) -> List[dict]:
        result = self.session.run(
            """
            MATCH (me:User {id: $my_id})-[:FRIEND_REQUEST {status: 'accepted'}]-(friend:User)
            RETURN friend.id AS id, friend.handle AS handle, friend.profile_image_url AS profile_image_url
            ORDER BY friend.handle
            """,
            my_id=my_id,
        )
        return [{"id": r["id"], "handle": r["handle"], "profile_image_url": r["profile_image_url"]} for r in result]

    def list_pending_received(self, my_id: str) -> List[dict]:
        result = self.session.run(
            """
            MATCH (req:User)-[rel:FRIEND_REQUEST {status: 'pending'}]->(me:User {id: $my_id})
            RETURN req.id AS id, req.handle AS handle, req.profile_image_url AS profile_image_url, rel.created_at AS created_at
            ORDER BY rel.created_at DESC
            """,
            my_id=my_id,
        )
        return [
            {"id": r["id"], "handle": r["handle"], "profile_image_url": r["profile_image_url"], "created_at": r["created_at"]}
            for r in result
        ]
