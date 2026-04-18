from typing import Optional, List
from app.db.repositories.band_repository import BandRepository


class BandService:
    def __init__(self, session):
        self.repo = BandRepository(session)

    # ── Bands ────────────────────────────────────────────────────────────────

    async def create_band(self, data: dict, created_by_id: str) -> dict:
        return await self.repo.create_band(data, created_by_id)

    async def get_band(self, band_id: str) -> Optional[dict]:
        return await self.repo.get_band(band_id)

    async def get_band_by_slug(self, slug: str) -> Optional[dict]:
        return await self.repo.get_band_by_slug(slug)

    async def list_bands(self, status: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[dict]:
        return await self.repo.list_bands(status, skip, limit)

    async def update_band(self, band_id: str, data: dict, updated_by_id: str) -> Optional[dict]:
        return await self.repo.update_band(band_id, data, updated_by_id)

    async def delete_band(self, band_id: str) -> bool:
        return await self.repo.delete_band(band_id)

    # ── Releases ─────────────────────────────────────────────────────────────

    async def create_release(self, band_id: str, data: dict) -> dict:
        return await self.repo.create_release(band_id, data)

    async def get_release(self, release_id: str) -> Optional[dict]:
        return await self.repo.get_release(release_id)

    async def delete_release(self, release_id: str) -> bool:
        return await self.repo.delete_release(release_id)

    # ── Genres ───────────────────────────────────────────────────────────────

    async def create_genre(self, data: dict) -> dict:
        return await self.repo.create_genre(data)

    async def list_genres(self) -> List[dict]:
        return await self.repo.list_genres()

    async def get_genre(self, genre_id: str) -> Optional[dict]:
        return await self.repo.get_genre(genre_id)

    async def update_genre(self, genre_id: str, data: dict) -> Optional[dict]:
        return await self.repo.update_genre(genre_id, data)

    async def delete_genre(self, genre_id: str) -> bool:
        return await self.repo.delete_genre(genre_id)

    # ── Tags ─────────────────────────────────────────────────────────────────

    async def create_tag(self, data: dict) -> dict:
        return await self.repo.create_tag(data)

    async def list_tags(self, category: Optional[str] = None) -> List[dict]:
        return await self.repo.list_tags(category)

    async def update_tag(self, tag_id: str, data: dict) -> Optional[dict]:
        return await self.repo.update_tag(tag_id, data)

    async def delete_tag(self, tag_id: str) -> bool:
        return await self.repo.delete_tag(tag_id)

    async def merge_tags(self, source_id: str, target_id: str) -> bool:
        return await self.repo.merge_tags(source_id, target_id)
