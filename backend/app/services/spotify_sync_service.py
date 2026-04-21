"""
Spotify sync background tasks.

Pure side-effecting functions used by the Spotify router's background queue
and by other routers that need to trigger a Spotify sync. Keeping them here
avoids router-to-router imports.
"""
from datetime import datetime

from app.db.neo4j_driver import neo4j_driver
from app.db.repositories.spotify_repository import SpotifyRepository
from app.services.spotify_client import SpotifyClient
from app.services.spotify_scrobble_service import SpotifyScrobbleService


async def sync_top_artists(user_id: str, access_token: str) -> None:
    """Sync top artists from Spotify into Neo4j for all three time ranges."""
    print(f"🎵 Syncing top artists for user {user_id}")
    client = SpotifyClient(access_token=access_token)
    try:
        with neo4j_driver.get_driver().session() as session:
            for time_range in ("short_term", "medium_term", "long_term"):
                data = await client.get_user_top_artists(time_range=time_range, limit=50)
                artists = data.get("items", [])
                session.run(
                    "MATCH (u:User {id: $uid})-[r:TOP_ARTIST {time_range: $tr}]->() DELETE r",
                    uid=user_id, tr=time_range,
                )
                for rank, artist in enumerate(artists, 1):
                    image_url = artist["images"][0]["url"] if artist.get("images") else None
                    session.run(
                        """
                        MERGE (a:Artist {spotify_id: $spotify_id})
                        ON CREATE SET a.id = randomUUID(), a.created_at = datetime()
                        SET a.name = $name, a.genres = $genres, a.spotify_image_url = $image_url
                        WITH a
                        MATCH (u:User {id: $uid})
                        CREATE (u)-[:TOP_ARTIST {rank: $rank, time_range: $tr}]->(a)
                        """,
                        spotify_id=artist["id"], name=artist["name"],
                        genres=artist.get("genres", []), image_url=image_url,
                        uid=user_id, rank=rank, tr=time_range,
                    )
        print(f"✅ Top artists sync complete for user {user_id}")
    except Exception as e:
        print(f"❌ Top artists sync failed for user {user_id}: {e}")
    finally:
        await client.close()


async def run_backfill(user_id: str, access_token: str) -> dict:
    """Fetch recently played tracks from Spotify and persist them as scrobbles."""
    client = SpotifyClient(access_token=access_token)
    try:
        with neo4j_driver.get_driver().session() as session:
            repository = SpotifyRepository(session)
            scrobble_service = SpotifyScrobbleService(session)

            last_play_ts = repository.get_last_play_timestamp(user_id)
            print(f"🔍 Last play timestamp: {last_play_ts}")

            recently_played = await client.get_recently_played(limit=50, after=None)
            items = recently_played.get("items", [])

            if not items:
                print(f"✅ No new plays for user {user_id}")
                return {"message": "No new plays found", "processed": 0}

            stats = await scrobble_service.process_recently_played(
                user_id=user_id,
                recently_played_items=items,
            )
            print(f"✅ Backfill complete for user {user_id}: {stats}")
            return {
                "message": "Backfill completed successfully",
                "processed": stats.get("processed", 0),
                "skipped": stats.get("skipped", 0),
                "stats": stats,
            }
    finally:
        await client.close()


async def run_backfill_background(user_id: str, access_token: str) -> None:
    """Fire-and-forget wrapper around run_backfill that swallows errors."""
    try:
        await run_backfill(user_id, access_token)
    except Exception as e:
        print(f"❌ Background backfill failed: {e}")


async def delete_spotify_data(user_id: str) -> None:
    """GDPR Art. 17: delete all Spotify-sourced data for a user."""
    print(f"🗑️  Starting DSGVO deletion for user {user_id}")
    try:
        with neo4j_driver.get_driver().session() as session:
            result = session.run(
                """
                MATCH (u:User {id: $user_id})-[:PLAYED]->(p:Play {source: "spotify"})
                WITH p, count(p) as play_count
                DETACH DELETE p
                RETURN play_count
                """,
                user_id=user_id,
            )
            record = result.single()
            plays_deleted = record["play_count"] if record else 0

            result = session.run(
                """
                MATCH (t:Track)
                WHERE NOT (t)<-[:OF_TRACK]-(:Play)
                WITH t, count(t) as track_count
                DETACH DELETE t
                RETURN track_count
                """,
            )
            record = result.single()
            tracks_deleted = record["track_count"] if record else 0

            result = session.run(
                """
                MATCH (a:Artist)
                WHERE NOT (a)-[:PERFORMED]->(:Track)
                WITH a, count(a) as artist_count
                DETACH DELETE a
                RETURN artist_count
                """,
            )
            record = result.single()
            artists_deleted = record["artist_count"] if record else 0

            result = session.run(
                """
                MATCH (al:Album)
                WHERE NOT (al)<-[:ON_ALBUM]-(:Track)
                WITH al, count(al) as album_count
                DETACH DELETE al
                RETURN album_count
                """,
            )
            record = result.single()
            albums_deleted = record["album_count"] if record else 0

            session.run(
                """
                MATCH (u:User {id: $user_id})
                SET u.spotify_data_deleted_at = datetime(),
                    u.spotify_deletion_stats = {
                        plays: $plays_deleted,
                        tracks: $tracks_deleted,
                        artists: $artists_deleted,
                        albums: $albums_deleted,
                        timestamp: $timestamp
                    }
                RETURN u
                """,
                user_id=user_id,
                plays_deleted=plays_deleted,
                tracks_deleted=tracks_deleted,
                artists_deleted=artists_deleted,
                albums_deleted=albums_deleted,
                timestamp=datetime.utcnow().isoformat(),
            )

            print(f"✅ DSGVO deletion complete for user {user_id}:")
            print(f"   - Plays deleted: {plays_deleted}")
            print(f"   - Tracks deleted: {tracks_deleted}")
            print(f"   - Artists deleted: {artists_deleted}")
            print(f"   - Albums deleted: {albums_deleted}")

    except Exception as e:
        print(f"❌ DSGVO deletion failed for user {user_id}: {e}")
        with neo4j_driver.get_driver().session() as session:
            session.run(
                """
                MATCH (u:User {id: $user_id})
                SET u.spotify_deletion_error = $error,
                    u.spotify_deletion_error_at = datetime()
                RETURN u
                """,
                user_id=user_id, error=str(e),
            )
