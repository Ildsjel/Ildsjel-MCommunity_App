"""
Favourites — explicit + auto-favourites for artists and albums
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user

router = APIRouter(prefix="/favourites", tags=["Favourites"])


@router.get("")
async def get_favourites(
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["id"]

    explicit_artists = [
        {"name": r["name"], "name_norm": r["name_norm"], "image_url": r["image_url"], "auto": False}
        for r in session.run(
            """
            MATCH (u:User {id: $uid})-[:FAVOURITE_ARTIST]->(a:Artist)
            RETURN a.name AS name, a.name_normalized AS name_norm,
                   a.spotify_image_url AS image_url
            """,
            uid=uid,
        )
    ]

    auto_artists = [
        {"name": r["name"], "name_norm": r["name_norm"], "image_url": r["image_url"], "auto": True}
        for r in session.run(
            """
            MATCH (u:User {id: $uid})-[r:TOP_ARTIST]->(a:Artist)
            WHERE r.rank <= 10
            AND NOT (u)-[:FAVOURITE_ARTIST]->(a)
            AND NOT (u)-[:UNFAVOURITE_ARTIST]->(a)
            WITH DISTINCT a
            RETURN a.name AS name, a.name_normalized AS name_norm,
                   a.spotify_image_url AS image_url
            """,
            uid=uid,
        )
    ]

    explicit_albums = [
        {
            "id": r["id"], "name": r["name"], "artist_name": r["artist_name"],
            "image_url": r["image_url"], "play_count": 0, "auto": False,
        }
        for r in session.run(
            """
            MATCH (u:User {id: $uid})-[:FAVOURITE_ALBUM]->(a:Album)
            RETURN a.id AS id, a.name AS name, a.artist_name AS artist_name,
                   a.image_url AS image_url
            """,
            uid=uid,
        )
    ]

    auto_albums = [
        {
            "id": r["id"], "name": r["name"], "artist_name": r["artist_name"],
            "image_url": r["image_url"], "play_count": r["play_count"] or 0, "auto": True,
        }
        for r in session.run(
            """
            MATCH (u:User {id: $uid})-[r:TOP_ALBUM]->(a:Album)
            WHERE r.rank <= 10
            AND NOT (u)-[:FAVOURITE_ALBUM]->(a)
            AND NOT (u)-[:UNFAVOURITE_ALBUM]->(a)
            RETURN a.id AS id, a.name AS name, a.artist_name AS artist_name,
                   a.image_url AS image_url, r.play_count AS play_count
            ORDER BY r.rank ASC
            """,
            uid=uid,
        )
    ]

    return {
        "artists": explicit_artists + auto_artists,
        "albums": explicit_albums + auto_albums,
    }


@router.post("/artist")
async def add_favourite_artist(
    body: dict,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    name_norm = body.get("name_norm")
    if not name_norm:
        raise HTTPException(status_code=400, detail="Missing name_norm")
    session.run(
        """
        MATCH (u:User {id: $uid}), (a:Artist {name_normalized: $name_norm})
        MERGE (u)-[:FAVOURITE_ARTIST]->(a)
        WITH u, a
        OPTIONAL MATCH (u)-[uf:UNFAVOURITE_ARTIST]->(a)
        DELETE uf
        """,
        uid=current_user["id"], name_norm=name_norm,
    )
    return {"ok": True}


@router.delete("/artist/{name_norm}")
async def remove_favourite_artist(
    name_norm: str,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    session.run(
        """
        MATCH (u:User {id: $uid}), (a:Artist {name_normalized: $name_norm})
        OPTIONAL MATCH (u)-[f:FAVOURITE_ARTIST]->(a)
        DELETE f
        WITH u, a
        MERGE (u)-[:UNFAVOURITE_ARTIST]->(a)
        """,
        uid=current_user["id"], name_norm=name_norm,
    )
    return {"ok": True}


@router.post("/album")
async def add_favourite_album(
    body: dict,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    album_id = body.get("album_id")
    if not album_id:
        raise HTTPException(status_code=400, detail="Missing album_id")
    session.run(
        """
        MATCH (u:User {id: $uid}), (a:Album {id: $album_id})
        MERGE (u)-[:FAVOURITE_ALBUM]->(a)
        WITH u, a
        OPTIONAL MATCH (u)-[uf:UNFAVOURITE_ALBUM]->(a)
        DELETE uf
        """,
        uid=current_user["id"], album_id=album_id,
    )
    return {"ok": True}


@router.delete("/album/{album_id}")
async def remove_favourite_album(
    album_id: str,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    session.run(
        """
        MATCH (u:User {id: $uid}), (a:Album {id: $album_id})
        OPTIONAL MATCH (u)-[f:FAVOURITE_ALBUM]->(a)
        DELETE f
        WITH u, a
        MERGE (u)-[:UNFAVOURITE_ALBUM]->(a)
        """,
        uid=current_user["id"], album_id=album_id,
    )
    return {"ok": True}


@router.get("/visibility")
async def get_visibility(
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    rec = session.run(
        """
        MATCH (u:User {id: $uid})
        RETURN COALESCE(u.vis_top_artists, true) AS top_artists,
               COALESCE(u.vis_top_albums, true) AS top_albums,
               COALESCE(u.vis_favourites, true) AS favourites
        """,
        uid=current_user["id"],
    ).single()
    if not rec:
        return {"top_artists": True, "top_albums": True, "favourites": True}
    return dict(rec)


@router.patch("/visibility")
async def update_visibility(
    body: dict,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    session.run(
        """
        MATCH (u:User {id: $uid})
        SET u.vis_top_artists = $top_artists,
            u.vis_top_albums  = $top_albums,
            u.vis_favourites  = $favourites
        """,
        uid=current_user["id"],
        top_artists=body.get("top_artists", True),
        top_albums=body.get("top_albums", True),
        favourites=body.get("favourites", True),
    )
    return {"ok": True}
