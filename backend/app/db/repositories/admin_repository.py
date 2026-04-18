import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List


class AdminRepository:
    def __init__(self, session):
        self.session = session

    # ── Admin tokens ────────────────────────────────────────────────────────

    async def create_token(self, created_by_id: str, note: Optional[str] = None) -> dict:
        token_id = str(uuid.uuid4())
        token_val = secrets.token_hex(32)
        expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        created_at = datetime.now(timezone.utc).isoformat()

        await self.session.run(
            """
            CREATE (t:AdminToken {
                id: $id, token: $token, note: $note,
                created_by_id: $created_by_id, redeemed_by_id: null,
                created_at: $created_at, expires_at: $expires_at
            })
            """,
            id=token_id, token=token_val, note=note,
            created_by_id=created_by_id, created_at=created_at, expires_at=expires_at,
        )
        return {
            "id": token_id, "token": token_val, "note": note,
            "created_by_id": created_by_id, "redeemed_by_id": None,
            "created_at": created_at, "expires_at": expires_at,
        }

    async def get_tokens(self, created_by_id: str) -> List[dict]:
        result = await self.session.run(
            "MATCH (t:AdminToken {created_by_id: $id}) RETURN t ORDER BY t.created_at DESC",
            id=created_by_id,
        )
        return [dict(record["t"]) for record in await result.fetch(100)]

    async def redeem_token(self, token_val: str, user_id: str) -> Optional[dict]:
        now = datetime.now(timezone.utc).isoformat()
        result = await self.session.run(
            """
            MATCH (t:AdminToken {token: $token})
            WHERE t.redeemed_by_id IS NULL AND t.expires_at > $now
            SET t.redeemed_by_id = $user_id
            WITH t
            MATCH (u:User {id: $user_id})
            SET u.role = 'admin'
            RETURN t
            """,
            token=token_val, user_id=user_id, now=now,
        )
        record = await result.single()
        return dict(record["t"]) if record else None

    # ── User role management ────────────────────────────────────────────────

    async def list_users_with_roles(self) -> List[dict]:
        result = await self.session.run(
            "MATCH (u:User) RETURN u.id AS id, u.handle AS handle, u.email AS email, u.role AS role ORDER BY u.role, u.handle"
        )
        return [
            {
                "id": r["id"], "handle": r["handle"],
                "email": r["email"], "role": r["role"] or "user",
            }
            for r in await result.fetch(500)
        ]

    async def set_user_role(self, user_id: str, role: str) -> bool:
        result = await self.session.run(
            "MATCH (u:User {id: $id}) SET u.role = $role RETURN u.id",
            id=user_id, role=role,
        )
        record = await result.single()
        return record is not None

    async def get_user_role(self, user_id: str) -> str:
        result = await self.session.run(
            "MATCH (u:User {id: $id}) RETURN u.role AS role", id=user_id,
        )
        record = await result.single()
        return (record["role"] if record and record["role"] else "user")
