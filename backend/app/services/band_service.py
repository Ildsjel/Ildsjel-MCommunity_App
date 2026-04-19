from typing import Optional, List
from app.db.repositories.band_repository import BandRepository


class BandService:
    def __init__(self, session):
        self.repo = BandRepository(session)

    # ── Bands ────────────────────────────────────────────────────────────────

    def create_band(self, data: dict, created_by_id: str) -> dict:
        return self.repo.create_band(data, created_by_id)

    def get_band(self, band_id: str) -> Optional[dict]:
        return self.repo.get_band(band_id)

    def get_band_by_slug(self, slug: str) -> Optional[dict]:
        return self.repo.get_band_by_slug(slug)

    def list_bands(self, status: Optional[str] = None, skip: int = 0, limit: int = 50, query: Optional[str] = None) -> dict:
        return self.repo.list_bands(status, skip, limit, query)

    def update_band(self, band_id: str, data: dict, updated_by_id: str) -> Optional[dict]:
        return self.repo.update_band(band_id, data, updated_by_id)

    def delete_band(self, band_id: str) -> bool:
        return self.repo.delete_band(band_id)

    # ── Releases ─────────────────────────────────────────────────────────────

    def create_release(self, band_id: str, data: dict) -> dict:
        return self.repo.create_release(band_id, data)

    def get_release(self, release_id: str) -> Optional[dict]:
        return self.repo.get_release(release_id)

    def delete_release(self, release_id: str) -> bool:
        return self.repo.delete_release(release_id)

    # ── Genres ───────────────────────────────────────────────────────────────

    def create_genre(self, data: dict) -> dict:
        return self.repo.create_genre(data)

    def list_genres(self) -> List[dict]:
        return self.repo.list_genres()

    def get_genre(self, genre_id: str) -> Optional[dict]:
        return self.repo.get_genre(genre_id)

    def update_genre(self, genre_id: str, data: dict) -> Optional[dict]:
        return self.repo.update_genre(genre_id, data)

    def delete_genre(self, genre_id: str) -> bool:
        return self.repo.delete_genre(genre_id)

    # ── Tags ─────────────────────────────────────────────────────────────────

    def create_tag(self, data: dict) -> dict:
        return self.repo.create_tag(data)

    def list_tags(self, category: Optional[str] = None) -> List[dict]:
        return self.repo.list_tags(category)

    def update_tag(self, tag_id: str, data: dict) -> Optional[dict]:
        return self.repo.update_tag(tag_id, data)

    def delete_tag(self, tag_id: str) -> bool:
        return self.repo.delete_tag(tag_id)

    def merge_tags(self, source_id: str, target_id: str) -> bool:
        return self.repo.merge_tags(source_id, target_id)
