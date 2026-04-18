from typing import Optional, List
from app.db.repositories.admin_repository import AdminRepository
from app.db.repositories.band_repository import BandRepository


class AdminService:
    def __init__(self, session):
        self.admin_repo = AdminRepository(session)
        self.band_repo = BandRepository(session)

    # ── Tokens ──────────────────────────────────────────────────────────────

    async def generate_token(self, created_by_id: str, note: Optional[str]) -> dict:
        return await self.admin_repo.create_token(created_by_id, note)

    async def list_tokens(self, created_by_id: str) -> List[dict]:
        return await self.admin_repo.get_tokens(created_by_id)

    async def redeem_token(self, token: str, user_id: str) -> Optional[dict]:
        result = await self.admin_repo.redeem_token(token, user_id)
        if result is None:
            return None
        return result

    # ── Users ────────────────────────────────────────────────────────────────

    async def list_users(self) -> List[dict]:
        return await self.admin_repo.list_users_with_roles()

    async def set_role(self, user_id: str, role: str) -> bool:
        return await self.admin_repo.set_user_role(user_id, role)

    async def get_role(self, user_id: str) -> str:
        return await self.admin_repo.get_user_role(user_id)
