"""
Last.fm sync background tasks.

Pure side-effecting functions used by the Last.fm router's background queue
and by other routers that need to trigger a Last.fm sync. Keeping them here
avoids router-to-router imports.
"""
import asyncio

from app.config.settings import settings
from app.db.neo4j_driver import neo4j_driver
from app.services.lastfm_client import LastFmClient


_IMAGE_SIZE_PREFERENCE = ("extralarge", "large", "medium", "small")


def _pick_lastfm_image(images: list[dict]) -> str | None:
    """Pick the highest-resolution non-empty image URL from a Last.fm image list."""
    by_size = {img.get("size"): img.get("#text") for img in images if img.get("#text")}
    for size in _IMAGE_SIZE_PREFERENCE:
        if by_size.get(size):
            return by_size[size]
    return None


async def sync_top_artists(user_id: str, lastfm_username: str) -> None:
    """Sync top artists, total plays, and top tags from Last.fm into Neo4j."""
    print(f"🎵 Syncing Last.fm top artists for {lastfm_username}")
    client = LastFmClient(settings.LASTFM_API_KEY, settings.LASTFM_API_SECRET)
    try:
        top_artists_response, user_info, top_tags_response = await asyncio.gather(
            client.get_user_top_artists(lastfm_username, period="overall", limit=50),
            client.get_user_info(lastfm_username),
            client.get_user_top_tags(lastfm_username, limit=20),
        )
        artists = top_artists_response.get("topartists", {}).get("artist", [])
        if isinstance(artists, dict):
            artists = [artists]

        total_plays = int(user_info.get("user", {}).get("playcount", 0))

        raw_tags = top_tags_response.get("toptags", {}).get("tag", [])
        if isinstance(raw_tags, dict):
            raw_tags = [raw_tags]
        top_tags = [t["name"] for t in raw_tags if t.get("name")]

        with neo4j_driver.get_driver().session() as db:
            db.run(
                "MATCH (u:User {id: $uid}) SET u.lastfm_total_plays = $tp, u.lastfm_top_tags = $tags",
                uid=user_id, tp=total_plays, tags=top_tags,
            )
            db.run(
                "MATCH (u:User {id: $uid})-[r:TOP_ARTIST {source: 'lastfm'}]->() DELETE r",
                uid=user_id,
            )
            for rank, artist in enumerate(artists, 1):
                name = artist["name"]
                mbid = artist.get("mbid") or None
                play_count = int(artist.get("playcount", 0))
                name_norm = name.lower().strip()

                # Always MERGE by name_normalized so Spotify and Last.fm share the same node.
                # lastfm_mbid is stored as additional data, not as the primary key.
                db.run(
                    """
                    MERGE (a:Artist {name_normalized: $name_norm})
                    ON CREATE SET a.id = randomUUID(), a.created_at = datetime()
                    SET a.name = $name,
                        a.name_normalized = $name_norm,
                        a.lastfm_name = $name,
                        a.lastfm_mbid = CASE WHEN $mbid IS NOT NULL THEN $mbid
                                             ELSE a.lastfm_mbid END,
                        a.updated_at = datetime()
                    WITH a
                    MATCH (u:User {id: $uid})
                    CREATE (u)-[:TOP_ARTIST {rank: $rank, time_range: 'overall',
                                             source: 'lastfm', play_count: $pc}]->(a)
                    """,
                    name_norm=name_norm, name=name, mbid=mbid,
                    uid=user_id, rank=rank, pc=play_count,
                )

        print(f"✅ Last.fm sync complete — {len(artists)} artists for {lastfm_username}")
    except Exception as e:
        print(f"❌ Last.fm sync failed: {e}")
    finally:
        await client.close()


async def sync_top_albums(user_id: str, lastfm_username: str) -> None:
    """Sync top albums from Last.fm into Neo4j."""
    print(f"💿 Syncing Last.fm top albums for {lastfm_username}")
    client = LastFmClient(settings.LASTFM_API_KEY, settings.LASTFM_API_SECRET)
    try:
        data = await client.get_user_top_albums(lastfm_username, period="overall", limit=50)
        albums = data.get("topalbums", {}).get("album", [])
        if isinstance(albums, dict):
            albums = [albums]

        with neo4j_driver.get_driver().session() as db:
            db.run(
                "MATCH (u:User {id: $uid})-[r:TOP_ALBUM]->() DELETE r",
                uid=user_id,
            )
            for rank, album in enumerate(albums, 1):
                name = album["name"]
                artist_name = album.get("artist", {}).get("name", "")
                mbid = album.get("mbid") or None
                play_count = int(album.get("playcount", 0))
                image_url = _pick_lastfm_image(album.get("image", []))

                name_norm = f"{artist_name.lower().strip()}::{name.lower().strip()}"
                # Always MERGE by name_normalized — same key Spotify uses — to prevent duplicates.
                db.run(
                    """
                    MERGE (a:Album {name_normalized: $name_norm})
                    ON CREATE SET a.id = randomUUID(), a.created_at = datetime()
                    SET a.name = $name,
                        a.artist_name = $artist_name,
                        a.image_url = CASE WHEN $image_url IS NOT NULL THEN $image_url
                                          ELSE a.image_url END,
                        a.lastfm_mbid = CASE WHEN $mbid IS NOT NULL THEN $mbid
                                             ELSE a.lastfm_mbid END,
                        a.updated_at = datetime()
                    WITH a
                    MATCH (u:User {id: $uid})
                    CREATE (u)-[:TOP_ALBUM {rank: $rank, play_count: $pc,
                                            source: 'lastfm', period: 'overall'}]->(a)
                    """,
                    name_norm=name_norm, name=name, artist_name=artist_name,
                    image_url=image_url, mbid=mbid,
                    uid=user_id, rank=rank, pc=play_count,
                )

        print(f"✅ Last.fm album sync complete — {len(albums)} albums for {lastfm_username}")
    except Exception as e:
        print(f"❌ Last.fm album sync failed: {e}")
    finally:
        await client.close()
