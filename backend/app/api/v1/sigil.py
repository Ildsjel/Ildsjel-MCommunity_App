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
    # ── Black metal (most-specific first) ─────────────────────────────────────
    "suicidal depressive black metal": "DSBM",
    "depressive suicidal black metal": "DSBM",
    "atmospheric black metal":         "ATM BLACK",
    "industrial black metal":          "IND BLACK",
    "ambient black metal":             "AMB BLACK",
    "blackened doom metal":            "BLK DOOM",
    "blackened death metal":           "BLK DEATH",
    "blackened thrash metal":          "BLK THRSH",
    "symphonic black metal":           "SYM BLACK",
    "post-black metal":                "POST BLACK",
    "raw black metal":                 "RAW BLACK",
    "depressive black metal":          "DSBM",
    "orthodox black metal":            "BLACK",
    "norwegian black metal":           "BLACK",
    "swedish black metal":             "BLACK",
    "icelandic black metal":           "BLACK",
    "greek black metal":               "BLACK",
    "finnish black metal":             "BLACK",
    "french black metal":              "BLACK",
    "cascadian black metal":           "ATM BLACK",
    "black metal":                     "BLACK",
    "dsbm":                            "DSBM",
    # ── Death metal ────────────────────────────────────────────────────────────
    "atmospheric death metal":         "ATM DEATH",
    "melodic death metal":             "MELODEATH",
    "technical death metal":           "TECH DEATH",
    "progressive death metal":         "PROG DEATH",
    "brutal death metal":              "BRUTAL DM",
    "old school death metal":          "OSDM",
    "slam death metal":                "SLAM",
    "death-doom metal":                "DEATH DOOM",
    "death doom metal":                "DEATH DOOM",
    "swedish death metal":             "DEATH",
    "finnish death metal":             "DEATH",
    "death metal":                     "DEATH",
    # ── Doom / Sludge / Stoner ─────────────────────────────────────────────────
    "funeral doom metal":              "FNR DOOM",
    "atmospheric doom metal":          "ATM DOOM",
    "gothic doom metal":               "DOOM",
    "traditional doom metal":          "DOOM",
    "epic doom metal":                 "DOOM",
    "doom metal":                      "DOOM",
    "doom":                            "DOOM",
    "sludge metal":                    "SLUDGE",
    "sludge":                          "SLUDGE",
    "stoner metal":                    "STONER",
    "stoner rock":                     "STONER",
    # ── Thrash / Speed ─────────────────────────────────────────────────────────
    "teutonic thrash metal":           "THRASH",
    "melodic thrash metal":            "MEL THRSH",
    "technical thrash metal":          "TECH THRSH",
    "bay area thrash":                 "THRASH",
    "crossover thrash":                "CROSSOVER",
    "thrash metal":                    "THRASH",
    "speed metal":                     "SPEED",
    # ── Power / Heavy ──────────────────────────────────────────────────────────
    "progressive power metal":         "PROG PWR",
    "symphonic power metal":           "SYM POWER",
    "power metal":                     "POWER",
    "traditional heavy metal":         "HEAVY",
    "heavy metal":                     "HEAVY",
    "nwobhm":                          "NWOBHM",
    # ── Prog / Avant / Math ────────────────────────────────────────────────────
    "avant-garde metal":               "AVANT",
    "progressive metal":               "PROG",
    "art metal":                       "AVANT",
    "math metal":                      "MATH",
    "djent":                           "DJENT",
    # ── Industrial / Power electronics ────────────────────────────────────────
    "death industrial":                "DEATH IND",
    "power electronics":               "PWR ELEC",
    "harsh noise wall":                "HNW",
    "martial industrial":              "MARTIAL",
    "aggrotech":                       "AGGROTECH",
    "industrial black metal":          "IND BLACK",
    "industrial metal":                "INDUSTRL",
    "industrial rock":                 "INDUSTRL",
    "industrial":                      "INDUSTRL",
    "ebm":                             "EBM",
    "futurepop":                       "FUTUREPOP",
    "electro-industrial":              "ELECTRO",
    "electronic metal":                "ELECTRO",
    "electronica":                     "ELECTRO",
    "electronic":                      "ELECTRO",
    # ── Noise / Grind ──────────────────────────────────────────────────────────
    "grindcore":                       "GRIND",
    "goregrind":                       "GRIND",
    "noisegrind":                      "GRIND",
    "noisecore":                       "NOISE",
    "harsh noise":                     "NOISE",
    "noise rock":                      "NOISE",
    "noise":                           "NOISE",
    "powerviolence":                   "PV",
    # ── Core / Punk ────────────────────────────────────────────────────────────
    "metalcore":                       "METALCORE",
    "deathcore":                       "DEATHCORE",
    "mathcore":                        "MATHCORE",
    "post-hardcore":                   "POST-HC",
    "hardcore punk":                   "HARDCORE",
    "hardcore":                        "HARDCORE",
    "crust punk":                      "CRUST",
    "d-beat":                          "CRUST",
    "punk":                            "PUNK",
    # ── Post-metal / Post-rock ─────────────────────────────────────────────────
    "atmospheric post-metal":          "ATM POST",
    "post-metal":                      "POST",
    "post metal":                      "POST",
    "post-rock":                       "POST ROCK",
    "post rock":                       "POST ROCK",
    # ── Drone / Ambient ────────────────────────────────────────────────────────
    "drone metal":                     "DRONE",
    "drone doom":                      "DRONE",
    "drone":                           "DRONE",
    "dark ambient":                    "DARK AMB",
    "ambient black":                   "AMB BLACK",
    "ambient metal":                   "AMBIENT",
    "ambient":                         "AMBIENT",
    "isolationism":                    "AMBIENT",
    # ── Neofolk / Dark folk ────────────────────────────────────────────────────
    "apocalyptic folk":                "APO FOLK",
    "medieval metal":                  "MEDIEVAL",
    "pagan metal":                     "PAGAN",
    "viking metal":                    "VIKING",
    "folk metal":                      "FOLK",
    "dark folk":                       "DARK FOLK",
    "neofolk":                         "NEOFOLK",
    "neo-folk":                        "NEOFOLK",
    # ── Gothic / Darkwave ─────────────────────────────────────────────────────
    "neoclassical darkwave":           "NEO-CLASS",
    "gothic metal":                    "GOTHIC",
    "gothic rock":                     "GOTHIC",
    "ethereal wave":                   "ETHEREAL",
    "dark wave":                       "DARKWAVE",
    "darkwave":                        "DARKWAVE",
    "cold wave":                       "COLDWAVE",
    "post-punk":                       "POST PUNK",
    "minimal synth":                   "MIN SYNTH",
    # ── Shoegaze / Art rock ────────────────────────────────────────────────────
    "shoegaze":                        "SHOEGAZE",
    "blackgaze":                       "BLACKGAZE",
    "math rock":                       "MATH ROCK",
    "art rock":                        "ART ROCK",
    "krautrock":                       "KRAUTROCK",
    "space rock":                      "SPACE",
    "psychedelic rock":                "PSYCH",
    "psychedelic":                     "PSYCH",
    # ── Misc ──────────────────────────────────────────────────────────────────
    "nu-metal":                        "NU-METAL",
    "nu metal":                        "NU-METAL",
    "glam metal":                      "GLAM",
    "hair metal":                      "GLAM",
    "shock rock":                      "SHOCK",
    "grunge":                          "GRUNGE",
    "blues rock":                      "BLUES",
    "blues":                           "BLUES",
    "jazz":                            "JAZZ",
    "rock":                            "ROCK",
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


def _format_subgenre(raw: str) -> str:
    """Format a raw Spotify genre string for L2 satellite display (≤20 chars)."""
    g = raw.strip()
    for suffix in (" metal", " rock", " music"):
        if g.endswith(suffix):
            g = g[: -len(suffix)]
    return g.strip().title()[:20]


def _assign_cluster(raw_genres: list[str], top_genres: list[str]) -> str | None:
    """Assign an artist to one of the top-7 genre clusters.

    Pass 1: exact normalize match (e.g. 'black metal' → 'BLACK' which is in top 7).
    Pass 2: keyword substring match (e.g. 'atmospheric black metal' doesn't normalize
            to 'BLACK', but 'black' is a keyword of the 'BLACK' cluster and is present
            in the raw string).
    """
    if not top_genres or not raw_genres:
        return None

    # Pass 1 — exact normalize
    for raw_g in raw_genres:
        norm = _normalize_genre(raw_g)
        if norm in top_genres:
            return norm

    # Pass 2 — keyword fallback
    # For each cluster label extract meaningful words (len ≥ 4, skip filler short words)
    _SKIP = {"post", "prog", "atm"}
    for top_g in top_genres:
        label_words = [
            w.lower() for w in top_g.split()
            if len(w) >= 4 and w.lower() not in _SKIP
        ]
        if not label_words:
            label_words = [top_g.lower()][:1]
        for raw_g in raw_genres:
            raw_lower = raw_g.lower()
            if all(kw in raw_lower for kw in label_words):
                return top_g

    return None


async def _build_sigil_for_user(uid: str, session) -> dict:
    """
    Build and return sigil data for the given user id.

    Artists: top 7, ordered by play_count > rank across all sources.
    Genres: top 7, aggregated from Spotify genre tags on the top 20 artists.
    Clusters: per-genre subgenre breakdown + artist list (for L2/L3 rendering).
    """
    # ── Top 7 artists for L1 inner ring labels ─────────────────────────────────
    artist_result = session.run(
        """
        MATCH (u:User {id: $uid})-[r:TOP_ARTIST]->(a:Artist)
        WITH a,
             min(r.rank) AS best_rank,
             sum(COALESCE(toInteger(r.play_count), 0)) AS total_plays
        RETURN a.name AS name
        ORDER BY CASE WHEN total_plays > 0 THEN total_plays ELSE -best_rank END DESC
        LIMIT 7
        """,
        uid=uid,
    )
    artists = [r["name"] for r in artist_result]

    # ── Top 7 genres from Spotify genre tags on top-20 artists ─────────────────
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

    if not raw_genres:
        tag_result = session.run(
            "MATCH (u:User {id: $uid}) RETURN coalesce(u.lastfm_top_tags, []) AS tags",
            uid=uid,
        ).single()
        raw_genres = tag_result["tags"] if tag_result else []

    genres = list(dict.fromkeys(_normalize_genre(g) for g in raw_genres if g))[:7]

    # ── Total artist count ──────────────────────────────────────────────────────
    count_rec = session.run(
        "MATCH (u:User {id: $uid})-[:TOP_ARTIST]->() RETURN count(*) AS n",
        uid=uid,
    ).single()
    total_artists = count_rec["n"] if count_rec else len(artists)

    # ── All artists with weights + raw genre tags (for L2/L3 clusters) ─────────
    all_rec = session.run(
        """
        MATCH (u:User {id: $uid})-[r:TOP_ARTIST]->(a:Artist)
        WITH a,
             min(r.rank) AS best_rank,
             sum(COALESCE(toInteger(r.play_count), 0)) AS total_plays
        RETURN a.name AS name,
               coalesce(a.genres, []) AS raw_genres,
               CASE WHEN total_plays > 0 THEN total_plays ELSE 0 END AS plays,
               best_rank AS rank
        ORDER BY CASE WHEN total_plays > 0 THEN total_plays ELSE -best_rank END DESC
        LIMIT 80
        """,
        uid=uid,
    )
    all_artists = [
        {
            "name": r["name"],
            "weight": int(r["plays"]) if r["plays"] > 0 else max(0, 50 - int(r["rank"])),
            "genres": list(r["raw_genres"]),
        }
        for r in all_rec
    ]

    # Normalise weights to 0-100 scale
    max_w = max((a["weight"] for a in all_artists), default=1) or 1
    for a in all_artists:
        a["weight"] = round(a["weight"] / max_w * 100)

    # ── Build genre clusters for L2/L3 ─────────────────────────────────────────
    cluster_map: dict[str, dict] = {
        g: {"artists": [], "subgenre_counts": {}}
        for g in genres
    }

    for a in all_artists:
        cl = _assign_cluster(a["genres"], genres)
        if cl and cl in cluster_map:
            cluster_map[cl]["artists"].append({"name": a["name"], "weight": a["weight"]})
            # Tally raw sub-genre strings that normalise to this cluster
            for raw_g in a["genres"]:
                if _assign_cluster([raw_g], [cl]) == cl:
                    key = raw_g.strip().lower()
                    cluster_map[cl]["subgenre_counts"][key] = (
                        cluster_map[cl]["subgenre_counts"].get(key, 0) + 1
                    )

    # ── Build clusters list ────────────────────────────────────────────────────
    # Only artists that matched a cluster via _assign_cluster appear in the sigil.
    # Artists with no matching genre tags are excluded entirely rather than being
    # force-distributed into random clusters (Busta Rhymes → Sludge, etc.).
    clusters = []
    for g in genres:
        cm = cluster_map[g]
        n = len(cm["artists"]) or 1
        sorted_sg = sorted(cm["subgenre_counts"].items(), key=lambda x: -x[1])
        artists_sorted = sorted(cm["artists"], key=lambda x: -x["weight"])[:14]
        # Mark all as natural (properly genre-matched)
        for a in artists_sorted:
            a["natural"] = True
        clusters.append(
            {
                "label": g,
                "artist_count": len(cm["artists"]),
                "subgenres": [
                    {"label": _format_subgenre(raw), "pct": round(c / n * 100)}
                    for raw, c in sorted_sg[:5]
                    if _format_subgenre(raw) != g
                ],
                "artists": artists_sorted,
            }
        )

    return {
        "genres": genres,
        "artists": artists,
        "total_artists": total_artists,
        "clusters": clusters,
    }


@router.get("")
async def get_sigil_data(
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    return await _build_sigil_for_user(current_user["id"], session)


@router.get("/friends")
async def get_sigil_friends(
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Return accepted friends who share at least one top artist with the current user,
    along with the list of shared artist names (for drawing connections in L3).
    """
    uid = current_user["id"]
    result = session.run(
        """
        MATCH (me:User {id: $uid})-[:FRIEND_REQUEST {status: 'accepted'}]-(friend:User)
        OPTIONAL MATCH (me)-[:TOP_ARTIST]->(shared:Artist)<-[:TOP_ARTIST]-(friend)
        WITH friend, collect(DISTINCT shared.name) AS shared_artists
        WHERE size(shared_artists) > 0
        RETURN friend.handle AS handle,
               friend.profile_image_url AS avatar_url,
               shared_artists[0..6] AS shared_artists
        ORDER BY size(shared_artists) DESC
        LIMIT 10
        """,
        uid=uid,
    )
    friends = [
        {
            "handle": r["handle"],
            "avatar_url": r["avatar_url"],
            "shared_artists": list(r["shared_artists"]),
            "primary_artist": r["shared_artists"][0] if r["shared_artists"] else None,
        }
        for r in result
    ]
    return {"friends": friends}


@router.get("/{user_id}")
async def get_user_sigil_data(
    user_id: str,
    session=Depends(get_neo4j_session),
    _: dict = Depends(get_current_user),  # requires auth only
):
    return await _build_sigil_for_user(user_id, session)


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
