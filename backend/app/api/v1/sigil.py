"""
Sigil API — Metal-ID data derived from merged Spotify + Last.fm artist/genre data
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user

router = APIRouter(prefix="/sigil", tags=["Sigil"])

# ── Genre lookup table ─────────────────────────────────────────────────────────
# Maps Spotify genre strings (lowercased) → short sigil label (≤10 chars).
# Ordered longest-first so the most-specific match wins.
_GENRE_MAP: dict[str, str] = {
    # Black metal variants
    "atmospheric black metal": "ATM BLACK",
    "blackened death metal":   "BLK DEATH",
    "blackened thrash metal":  "BLK THRSH",
    "blackened doom metal":    "BLK DOOM",
    "symphonic black metal":   "SYM BLACK",
    "raw black metal":         "RAW BLACK",
    "ambient black metal":     "AMB BLACK",
    "post-black metal":        "POST BLACK",
    "swedish black metal":     "BLACK",
    "norwegian black metal":   "BLACK",
    "icelandic black metal":   "BLACK",
    "greek black metal":       "BLACK",
    "black metal":             "BLACK",
    "depressive black metal":  "DSBM",
    "dsbm":                    "DSBM",
    # Death metal variants
    "atmospheric death metal": "ATM DEATH",
    "melodic death metal":     "MELODEATH",
    "technical death metal":   "TECH DEATH",
    "progressive death metal": "PROG DEATH",
    "brutal death metal":      "BRUTAL DM",
    "blackened death metal":   "BLK DEATH",
    "old school death metal":  "OSDM",
    "slam death metal":        "SLAM",
    "swedish death metal":     "DEATH",
    "finnish death metal":     "DEATH",
    "death metal":             "DEATH",
    "death-doom metal":        "DEATH DOOM",
    # Doom metal variants
    "funeral doom metal":      "FNR DOOM",
    "death doom metal":        "DEATH DOOM",
    "atmospheric doom metal":  "ATM DOOM",
    "sludge metal":            "SLUDGE",
    "stoner metal":            "STONER",
    "traditional doom metal":  "DOOM",
    "epic doom metal":         "DOOM",
    "gothic doom metal":       "DOOM",
    "doom metal":              "DOOM",
    # Thrash / speed
    "melodic thrash metal":    "MEL THRSH",
    "technical thrash metal":  "TECH THRSH",
    "bay area thrash":         "THRASH",
    "teutonic thrash metal":   "THRASH",
    "blackened thrash metal":  "BLK THRSH",
    "thrash metal":            "THRASH",
    "speed metal":             "SPEED",
    "crossover thrash":        "CROSSOVER",
    # Power / heavy
    "progressive power metal": "PROG PWR",
    "symphonic power metal":   "SYM POWER",
    "power metal":             "POWER",
    "traditional heavy metal": "HEAVY",
    "nwobhm":                  "NWOBHM",
    "heavy metal":             "HEAVY",
    # Prog / avant
    "progressive metal":       "PROG",
    "avant-garde metal":       "AVANT",
    "art metal":               "AVANT",
    "djent":                   "DJENT",
    "math metal":              "MATH",
    # Industrial / electronic
    "industrial metal":        "INDUSTRL",
    "industrial black metal":  "IND BLACK",
    "electronic metal":        "ELECTRO",
    # Grind / noise
    "grindcore":               "GRIND",
    "goregrind":               "GRIND",
    "noisegrind":              "GRIND",
    "noisecore":               "NOISE",
    "noise rock":              "NOISE",
    "powerviolence":           "PV",
    # Core
    "metalcore":               "METALCORE",
    "deathcore":               "DEATHCORE",
    "mathcore":                "MATHCORE",
    "post-hardcore":           "POST-HC",
    "hardcore punk":           "HARDCORE",
    "hardcore":                "HARDCORE",
    # Post / ambient
    "post-metal":              "POST",
    "post metal":              "POST",
    "atmospheric post-metal":  "ATM POST",
    "ambient metal":           "AMBIENT",
    "ambient black":           "AMB BLACK",
    "dark ambient":            "DARK AMB",
    "dark folk":               "DARK FOLK",
    "folk metal":              "FOLK",
    "pagan metal":             "PAGAN",
    "viking metal":            "VIKING",
    "medieval metal":          "MEDIEVAL",
    # Gothic / goth
    "gothic metal":            "GOTHIC",
    "gothic rock":             "GOTHIC",
    "dark wave":               "DARKWAVE",
    "darkwave":                "DARKWAVE",
    # Misc
    "nu-metal":                "NU-METAL",
    "nu metal":                "NU-METAL",
    "glam metal":              "GLAM",
    "hair metal":              "GLAM",
    "shock rock":              "SHOCK",
    "country":                 "COUNTRY",
    "jazz":                    "JAZZ",
    "blues":                   "BLUES",
    "punk":                    "PUNK",
    "rock":                    "ROCK",
}

# Prefixes/suffixes to strip when no exact match is found
_GEO_PREFIXES = {
    "swedish", "norwegian", "finnish", "icelandic", "german", "french",
    "american", "british", "english", "australian", "canadian", "japanese",
    "greek", "polish", "brazilian", "dutch", "danish",
}
_STRIP_WORDS = {"metal", "rock", "music", "band", "bands"}


def _normalize_genre(g: str) -> str:
    """Map a raw Spotify/Last.fm genre string to a short sigil label (≤10 chars)."""
    key = g.lower().strip()

    # 1. Exact lookup
    if key in _GENRE_MAP:
        return _GENRE_MAP[key]

    # 2. Partial / substring lookup (longest matching key wins)
    best = ""
    for map_key, label in _GENRE_MAP.items():
        if map_key in key and len(map_key) > len(best):
            best = map_key
    if best:
        return _GENRE_MAP[best]

    # 3. Fallback: strip geo-prefixes and filler words, take first meaningful word
    words = key.split()
    words = [w for w in words if w not in _GEO_PREFIXES and w not in _STRIP_WORDS]
    if words:
        return words[0].upper()[:9]

    # 4. Last resort: uppercase the raw string, truncate
    return key.upper()[:9]


@router.get("")
async def get_sigil_data(
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Return merged genre + artist data for the user's Metal-ID sigil.

    Artists: top 8, ordered by play_count > rank across all sources.
    Genres: top 7, aggregated from Spotify genre tags on the top 20 artists.
    """
    uid = current_user["id"]

    artist_result = session.run(
        """
        MATCH (u:User {id: $uid})-[r:TOP_ARTIST]->(a:Artist)
        WITH a,
             min(r.rank) AS best_rank,
             sum(COALESCE(toInteger(r.play_count), 0)) AS total_plays
        RETURN a.name AS name
        ORDER BY CASE WHEN total_plays > 0 THEN total_plays ELSE -best_rank END DESC
        LIMIT 8
        """,
        uid=uid,
    )
    artists = [r["name"] for r in artist_result]

    # Genres: first try Spotify genre tags from stored Artist nodes
    genre_result = session.run(
        """
        MATCH (u:User {id: $uid})-[r:TOP_ARTIST]->(a:Artist)
        WHERE a.genres IS NOT NULL AND size(a.genres) > 0
        WITH a, min(r.rank) AS best_rank
        ORDER BY best_rank ASC
        LIMIT 20
        UNWIND a.genres AS genre
        WITH genre, count(genre) AS freq
        ORDER BY freq DESC
        LIMIT 10
        RETURN genre
        """,
        uid=uid,
    )
    raw_genres = [r["genre"] for r in genre_result]

    # Fallback: use Last.fm user top tags if no Spotify genre data
    if not raw_genres:
        tag_result = session.run(
            "MATCH (u:User {id: $uid}) RETURN coalesce(u.lastfm_top_tags, []) AS tags",
            uid=uid,
        ).single()
        raw_genres = tag_result["tags"] if tag_result else []

    genres = list(dict.fromkeys(_normalize_genre(g) for g in raw_genres if g))[:7]

    # Total connected artist count (not capped at 8)
    count_rec = session.run(
        "MATCH (u:User {id: $uid})-[:TOP_ARTIST]->() RETURN count(*) AS n",
        uid=uid,
    ).single()
    total_artists = count_rec["n"] if count_rec else len(artists)

    return {
        "genres": genres,
        "artists": artists,
        "total_artists": total_artists,
    }


@router.post("/sync")
async def sync_sigil(
    background_tasks: BackgroundTasks,
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Re-sync artist data from all connected sources and prune orphan Artist nodes.
    Idempotent — safe to call multiple times.
    """
    uid = current_user["id"]
    user_rec = session.run(
        """
        MATCH (u:User {id: $uid})
        RETURN u.lastfm_session_key IS NOT NULL AS has_lfm,
               u.lastfm_username AS lfm_user,
               u.spotify_access_token IS NOT NULL AS has_spotify,
               u.spotify_access_token AS spotify_token
        """,
        uid=uid,
    ).single()

    sources: list[str] = []
    if user_rec:
        if user_rec["has_lfm"] and user_rec["lfm_user"]:
            from app.services.lastfm_sync_service import sync_top_artists as sync_lastfm_artists
            background_tasks.add_task(
                sync_lastfm_artists,
                user_id=uid,
                lastfm_username=user_rec["lfm_user"],
            )
            sources.append("lastfm")
        if user_rec["has_spotify"] and user_rec["spotify_token"]:
            from app.services.spotify_sync_service import sync_top_artists as sync_spotify_artists
            background_tasks.add_task(
                sync_spotify_artists,
                user_id=uid,
                access_token=user_rec["spotify_token"],
            )
            sources.append("spotify")

    background_tasks.add_task(_prune_orphan_artists)

    return {
        "message": f"Sigil sync queued from: {', '.join(sources) or 'none (no services connected)'}",
        "sources": sources,
    }


async def _prune_orphan_artists():
    """
    Delete Artist nodes that are no longer referenced by any relationship.
    These accumulate when the MBID-keyed path previously created a separate node
    that the name_normalized MERGE now bypasses.
    """
    from app.db.neo4j_driver import neo4j_driver

    with neo4j_driver.get_driver().session() as db:
        count_rec = db.run(
            """
            MATCH (a:Artist)
            WHERE NOT ()-[:TOP_ARTIST]->(a)
              AND NOT ()-[:FAVOURITE_ARTIST]->(a)
              AND NOT ()-[:UNFAVOURITE_ARTIST]->(a)
            RETURN count(a) AS n
            """
        ).single()
        n = count_rec["n"] if count_rec else 0

        if n > 0:
            db.run(
                """
                MATCH (a:Artist)
                WHERE NOT ()-[:TOP_ARTIST]->(a)
                  AND NOT ()-[:FAVOURITE_ARTIST]->(a)
                  AND NOT ()-[:UNFAVOURITE_ARTIST]->(a)
                DETACH DELETE a
                """
            )
            print(f"🗑️  Pruned {n} orphan Artist nodes")
        else:
            print("✅ No orphan Artist nodes found")
