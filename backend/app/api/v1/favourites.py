"""
Favourites — explicit + auto-favourites for artists and albums
"""
from fastapi import APIRouter, Depends, HTTPException
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user
from app.models.favourites_models import (
    FavouriteArtistRequest,
    FavouriteAlbumRequest,
    FavouriteBandRequest,
    AddFavouriteBandResponse,
    VisibilityUpdateRequest,
)
from app.utils.name_matching import normalize_for_matching

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

    # ── Grimr-catalogue bands (deduplicated against the artist list above) ──────
    #
    # A band is already represented in the artists list when it is linked via
    # (Artist)-[:LINKED_BAND]->(Band) to an artist the user has as a
    # TOP_ARTIST or FAVOURITE_ARTIST (and has not unfavourited).
    # We only surface bands that are NOT covered that way.
    grimr_bands = [
        {
            "id": r["id"],
            "slug": r["slug"],
            "name": r["name"],
            "genres": [dict(g) for g in (r.get("genres") or []) if g and g.get("id")],
            "grimr": True,
        }
        for r in session.run(
            """
            MATCH (u:User {id: $uid})-[:FAVOURITE_BAND]->(b:Band)
            WHERE NOT EXISTS {
              MATCH (u)-[:TOP_ARTIST|FAVOURITE_ARTIST]->(a:Artist)-[:LINKED_BAND]->(b)
              WHERE NOT (u)-[:UNFAVOURITE_ARTIST]->(a)
            }
            OPTIONAL MATCH (b)-[:TAGGED_WITH]->(g:Genre)
            WHERE g.id IS NOT NULL
            WITH b, collect(DISTINCT {id: g.id, slug: g.slug, name: g.name}) AS genres
            RETURN b.id AS id, b.slug AS slug, b.name AS name, genres
            ORDER BY b.name
            """,
            uid=uid,
        )
    ]

    return {
        "artists": explicit_artists + auto_artists,
        "albums": explicit_albums + auto_albums,
        "bands": grimr_bands,
    }


@router.post("/artist")
async def add_favourite_artist(
    body: FavouriteArtistRequest,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    session.run(
        """
        MATCH (u:User {id: $uid}), (a:Artist {name_normalized: $name_norm})
        MERGE (u)-[:FAVOURITE_ARTIST]->(a)
        WITH u, a
        OPTIONAL MATCH (u)-[uf:UNFAVOURITE_ARTIST]->(a)
        DELETE uf
        """,
        uid=current_user["id"], name_norm=body.name_norm,
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
    body: FavouriteAlbumRequest,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    session.run(
        """
        MATCH (u:User {id: $uid}), (a:Album {id: $album_id})
        MERGE (u)-[:FAVOURITE_ALBUM]->(a)
        WITH u, a
        OPTIONAL MATCH (u)-[uf:UNFAVOURITE_ALBUM]->(a)
        DELETE uf
        """,
        uid=current_user["id"], album_id=body.album_id,
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


# ── Band Favourites ──────────────────────────────────────────────────────────

@router.get("/bands")
async def get_favourite_bands(
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["id"]
    records = session.run(
        """
        MATCH (u:User {id: $uid})-[:FAVOURITE_BAND]->(b:Band)
        OPTIONAL MATCH (b)-[:TAGGED_WITH]->(g:Genre)
        WITH b, collect(DISTINCT CASE WHEN g IS NOT NULL
             THEN {id: g.id, slug: g.slug, name: g.name} END) AS genres
        RETURN b, genres
        ORDER BY b.name
        """,
        uid=uid,
    )
    bands = []
    for r in records:
        b = dict(r["b"])
        genres = [dict(g) for g in (r.get("genres") or []) if g and g.get("id")]
        bands.append({**b, "genres": genres, "releases": []})
    return bands


@router.get("/band/{band_id}")
async def get_favourite_band_status(
    band_id: str,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    rec = session.run(
        """
        MATCH (u:User {id: $uid}), (b:Band {id: $band_id})
        OPTIONAL MATCH (u)-[f:FAVOURITE_BAND]->(b)
        RETURN f IS NOT NULL AS is_favourite
        """,
        uid=current_user["id"], band_id=band_id,
    ).single()
    return {"is_favourite": bool(rec["is_favourite"]) if rec else False}


@router.post("/band", response_model=AddFavouriteBandResponse)
async def add_favourite_band(
    body: FavouriteBandRequest,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """Favourite a band from the catalogue.

    After creating the ``[:FAVOURITE_BAND]`` edge this endpoint attempts to
    match the band against the user's existing Spotify / Last.fm artist library
    using normalised string comparison (v1).  If a match is found:

    * An ``(Artist)-[:LINKED_BAND]->(Band)`` edge is merged so the two
      representations are connected in the graph.
    * The response includes ``matched_external=True`` so the frontend can
      surface a "found in your library" notice.

    No match leaves the state unchanged (idempotent MERGE semantics).
    """
    uid = current_user["id"]
    band_id = body.band_id

    # ── 1. Resolve the band name ─────────────────────────────────────────────
    band_rec = session.run(
        "MATCH (b:Band {id: $band_id}) RETURN b.name AS name",
        band_id=band_id,
    ).single()
    if not band_rec:
        raise HTTPException(status_code=404, detail="Band not found")

    band_name_norm = normalize_for_matching(band_rec["name"])

    # ── 2. Create the canonical FAVOURITE_BAND edge ──────────────────────────
    session.run(
        """
        MATCH (u:User {id: $uid}), (b:Band {id: $band_id})
        MERGE (u)-[:FAVOURITE_BAND]->(b)
        """,
        uid=uid,
        band_id=band_id,
    )

    # ── 3. Try to match against the user's external artist library ───────────
    #
    # We look at both TOP_ARTIST (imported from Spotify/Last.fm sync) and any
    # explicit FAVOURITE_ARTIST relationships.
    #
    # Matching strategy (exact, case-insensitive, whitespace-collapsed):
    #   a) Compare against `name_normalized` when it exists (Last.fm-sourced)
    #   b) Fall back to toLower(trim(a.name)) for Spotify-only nodes
    #
    # We pick LIMIT 1 — if multiple artists match (unlikely), we take the
    # first.  Ambiguous multi-match resolution is out-of-scope for v1.
    match_rec = session.run(
        """
        MATCH (u:User {id: $uid})-[:TOP_ARTIST|FAVOURITE_ARTIST]->(a:Artist)
        WHERE
          CASE
            WHEN a.name_normalized IS NOT NULL
              THEN apoc.text.regreplace(a.name_normalized, '\\\\s+', ' ')
            ELSE toLower(trim(a.name))
          END = $band_name_norm
        WITH DISTINCT a
        RETURN
          a.id          AS artist_id,
          a.name        AS artist_name,
          CASE
            WHEN a.spotify_id IS NOT NULL AND a.lastfm_mbid IS NOT NULL THEN 'both'
            WHEN a.spotify_id IS NOT NULL                               THEN 'spotify'
            ELSE                                                             'lastfm'
          END           AS source
        LIMIT 1
        """,
        uid=uid,
        band_name_norm=band_name_norm,
    ).single()

    if not match_rec:
        # No external match — plain favourite, nothing more to do
        return AddFavouriteBandResponse(matched_external=False)

    # ── 4. Match found — link the Artist node to the Band catalogue entity ───
    session.run(
        """
        MATCH (a:Artist {id: $artist_id}), (b:Band {id: $band_id})
        MERGE (a)-[:LINKED_BAND]->(b)
        """,
        artist_id=match_rec["artist_id"],
        band_id=band_id,
    )

    return AddFavouriteBandResponse(
        matched_external=True,
        matched_artist_name=match_rec["artist_name"],
        matched_source=match_rec["source"],
    )


@router.delete("/band/{band_id}")
async def remove_favourite_band(
    band_id: str,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    session.run(
        """
        MATCH (u:User {id: $uid})-[f:FAVOURITE_BAND]->(b:Band {id: $band_id})
        DELETE f
        """,
        uid=current_user["id"], band_id=band_id,
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
    body: VisibilityUpdateRequest,
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
        top_artists=body.top_artists,
        top_albums=body.top_albums,
        favourites=body.favourites,
    )
    return {"ok": True}
