"""
Auto-Favourite Service
Nightly job: for every user, scan their Spotify/Last.fm artist library and
auto-create [:FAVOURITE_BAND] + [:LINKED_BAND] edges whenever a band in the
Grimr catalogue matches an artist name (normalised comparison).

This is the batch equivalent of the match logic in
POST /api/v1/favourites/band — it runs the same name-normalisation and
creates the same edges, so any band already in a user's streaming library
appears in their Grimr FAVOURITES tab without manual action.
"""
import asyncio
from datetime import datetime, timezone

from app.db.neo4j_driver import neo4j_driver
from app.utils.name_matching import normalize_for_matching


# ── Cypher ───────────────────────────────────────────────────────────────────

# Fetch every user + their linked artist names (TOP_ARTIST or FAVOURITE_ARTIST,
# excluding explicit unfavourites).
_QUERY_USERS_WITH_ARTISTS = """
MATCH (u:User)
OPTIONAL MATCH (u)-[:TOP_ARTIST|FAVOURITE_ARTIST]->(a:Artist)
WHERE NOT (u)-[:UNFAVOURITE_ARTIST]->(a)
RETURN u.id AS user_id,
       collect(DISTINCT {
           id:             a.id,
           name:           a.name,
           name_normalized: a.name_normalized,
           spotify_id:     a.spotify_id,
           lastfm_mbid:    a.lastfm_mbid
       }) AS artists
"""

# All bands in the catalogue that have both id and name.
_QUERY_ALL_BANDS = """
MATCH (b:Band)
WHERE b.id IS NOT NULL AND b.name IS NOT NULL
RETURN b.id AS id, b.name AS name, b.slug AS slug
"""

# Merge the FAVOURITE_BAND edge (idempotent) and link the Artist to the Band.
_MERGE_FAVOURITE_BAND = """
MATCH (u:User {id: $user_id}), (b:Band {id: $band_id})
MERGE (u)-[:FAVOURITE_BAND]->(b)
"""

_MERGE_LINKED_BAND = """
MATCH (a:Artist {id: $artist_id}), (b:Band {id: $band_id})
MERGE (a)-[:LINKED_BAND]->(b)
"""


# ── Service ──────────────────────────────────────────────────────────────────

class AutoFavouriteService:
    """Background service that runs a nightly auto-favourite pass."""

    def __init__(self, interval_seconds: int = 86_400):
        """
        Args:
            interval_seconds: How often to run the job (default 24 h).
        """
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._task: asyncio.Task | None = None

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._loop())
        print(f"🎸 Auto-favourite service started (interval: {self.interval_seconds}s)")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        print("🛑 Auto-favourite service stopped")

    async def _loop(self):
        while self.is_running:
            try:
                await self._run()
            except Exception as exc:
                print(f"❌ Auto-favourite error: {exc}")
            await asyncio.sleep(self.interval_seconds)

    # ── Core logic ──────────────────────────────────────────────────────────

    async def _run(self):
        print(f"🔄 Auto-favourite pass starting at {datetime.now(timezone.utc).isoformat()}")

        with neo4j_driver.get_driver().session() as session:
            # Build a lookup: normalised_name → band
            band_rows = list(session.run(_QUERY_ALL_BANDS))
            band_by_norm: dict[str, dict] = {}
            for r in band_rows:
                norm = normalize_for_matching(r["name"])
                if norm:
                    band_by_norm[norm] = {"id": r["id"], "slug": r["slug"], "name": r["name"]}

            if not band_by_norm:
                print("  ℹ️  No bands in catalogue — skipping")
                return

            # Process each user
            user_rows = list(session.run(_QUERY_USERS_WITH_ARTISTS))
            matched_total = 0

            for user_rec in user_rows:
                user_id = user_rec["user_id"]
                artists = [a for a in (user_rec["artists"] or []) if a and a.get("id")]

                for artist in artists:
                    # Normalise artist name the same way add_favourite_band does
                    raw_norm = artist.get("name_normalized") or ""
                    if not raw_norm:
                        raw_norm = (artist.get("name") or "").lower().strip()
                    # Collapse whitespace (mirrors the APOC regex in the Cypher)
                    import re
                    artist_norm = re.sub(r"\s+", " ", raw_norm).strip()

                    band = band_by_norm.get(artist_norm)
                    if not band:
                        continue

                    # Auto-create FAVOURITE_BAND + LINKED_BAND (both idempotent MERGEs)
                    session.run(_MERGE_FAVOURITE_BAND, user_id=user_id, band_id=band["id"])
                    session.run(_MERGE_LINKED_BAND, artist_id=artist["id"], band_id=band["id"])
                    matched_total += 1

        print(f"  ✅ Auto-favourite pass done — {matched_total} band edges merged")


# Global singleton — 24-hour interval
auto_favourite_service = AutoFavouriteService(interval_seconds=86_400)
