"""
Ticketmaster Discovery API → Neo4j event sync.

Efficiency strategy (two-step with ID caching):
  1.  FIRST sync:   lookup each band's TM attraction ID  → cache it on the Band node.
  2.  LATER syncs:  use the cached attraction ID directly → skip the lookup entirely.

  This halves API usage after the first run. With 5 000 free calls/day and
  0.22 s per call the service can refresh ~200 bands in under 2 minutes.

Rate limit: 5 req/sec → 0.22 s sleep between calls.
Retries:    exponential back-off on HTTP 429.
Dedup:      MERGE on external_id (TM event ID) — safe to re-run at any time.
"""
import time
import uuid
import logging
from datetime import date, timedelta, datetime, timezone
from typing import Optional

import requests

log = logging.getLogger(__name__)

TM_BASE        = "https://app.ticketmaster.com/discovery/v2"
RATE_SLEEP     = 0.5         # 2 req/sec — conservative to avoid 429 bursts
MAX_RETRIES    = 3
RATE_LIMIT_BACKOFF = 60      # after all retries exhausted on 429, pause 60 s
LOOKAHEAD_DAYS = 180
PAGE_SIZE      = 200         # TM max per page

# Genre verification — only accept attractions in Music / metal-adjacent genres.
# TM's taxonomy: Segment → Genre → Sub-genre.
# We accept any "Music" attraction whose genre or sub-genre is in this set.
# "Other" is intentionally included because many metal acts are mis-classified there.
TM_ACCEPTABLE_SEGMENT = "Music"
TM_ACCEPTABLE_GENRES  = {
    "Metal", "Rock", "Hard Rock", "Alternative", "Punk", "Indie",
    "Electronic", "Pop", "R&B", "Country", "Other",
}
# If NO classification data is present at all we treat the attraction as
# acceptable (TM often omits classifications for niche artists).
# However if classifications ARE present and none match, we reject.


# ── HTTP ──────────────────────────────────────────────────────────────────────

def _get(path: str, params: dict, api_key: str) -> Optional[dict]:
    """GET with retry on 429; returns parsed JSON or None."""
    params = {**params, "apikey": api_key}
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.get(f"{TM_BASE}{path}", params=params, timeout=10)
            if r.status_code == 429:
                wait = 2 ** (attempt + 2)  # 8 s, 16 s, 32 s
                log.warning("TM rate-limited — sleeping %ss (attempt %d)", wait, attempt + 1)
                time.sleep(wait)
                continue
            if r.status_code == 200:
                return r.json()
            log.debug("TM %s HTTP %s", path, r.status_code)
            return None
        except requests.RequestException as exc:
            log.warning("TM request error: %s", exc)
            time.sleep(2 ** attempt)
    # All retries exhausted on rate limit — back off hard before next band
    log.warning("TM rate-limit retries exhausted — backing off %ss", RATE_LIMIT_BACKOFF)
    time.sleep(RATE_LIMIT_BACKOFF)
    return None


# ── Genre verification ────────────────────────────────────────────────────────

def _is_tm_attraction_metal(attraction: dict) -> bool:
    """
    Return True if the TM attraction is in an acceptable music genre.

    Acceptable  = segment is "Music" AND (genre is in TM_ACCEPTABLE_GENRES
                   OR no genre info is present at all).
    Reject      = segment is not "Music" (e.g. "Sports", "Arts & Theatre"),
                  OR genre info is present but none of the genres match.
    """
    classifications = attraction.get("classifications", [])
    if not classifications:
        # No classification data at all — give the benefit of the doubt.
        return True

    for cls in classifications:
        segment_name  = (cls.get("segment") or {}).get("name", "")
        genre_name    = (cls.get("genre")   or {}).get("name", "")
        subgenre_name = (cls.get("subGenre") or {}).get("name", "")

        if segment_name and segment_name != TM_ACCEPTABLE_SEGMENT:
            # This classification says it's NOT music (e.g. Sports)
            continue

        # Segment is Music (or absent within this classification block)
        if not genre_name or genre_name.lower() in ("undefined", "unknown", ""):
            # No usable genre info but it IS in the Music segment → accept.
            # TM often labels niche/metal acts as "Undefined" rather than "Metal".
            return True

        if genre_name in TM_ACCEPTABLE_GENRES or subgenre_name in TM_ACCEPTABLE_GENRES:
            return True

        # Genre present but not in our allow-list → log and reject this block
        log.debug(
            "TM genre rejected: segment=%r genre=%r subgenre=%r",
            segment_name, genre_name, subgenre_name,
        )

    # Fell through — check if ALL classifications lacked segment info entirely
    # (means TM returned classifications with no real data → treat as unknown = accept)
    all_empty = all(
        not (cls.get("segment") or {}).get("name", "")
        and not (cls.get("genre")   or {}).get("name", "")
        for cls in classifications
    )
    return all_empty


# ── Step 1: attraction ID lookup ──────────────────────────────────────────────

def _lookup_attraction_id(band_name: str, api_key: str) -> Optional[str]:
    """
    Find the Ticketmaster attraction ID for a band.

    Priority order (all with genre verification):
      1. Exact name match  + acceptable genre  → use immediately
      2. First result      + acceptable genre  → use as best guess
      3. Any result with no genre info         → use (TM niche-artist fallback)
      4. Nothing passes                        → return None

    This prevents non-metal bands that share names with metal bands (e.g. an
    "Ascension" pop act) from polluting the cache.
    """
    data = _get("/attractions.json", {
        "keyword": band_name,
        "classificationName": "Music",
        "size": 5,
    }, api_key)
    time.sleep(RATE_SLEEP)

    if not data:
        return None
    attractions = data.get("_embedded", {}).get("attractions", [])
    if not attractions:
        return None

    lower = band_name.lower()
    first_passing: Optional[str] = None   # first genre-passing result (any name)

    for a in attractions:
        name  = a.get("name", "")
        tm_id = a.get("id", "")

        passes_genre = _is_tm_attraction_metal(a)

        if not passes_genre:
            log.info(
                "Rejected TM attraction %r (id=%s) for band %r — genre mismatch",
                name, tm_id, band_name,
            )
            continue

        if name.lower() == lower:
            # Exact name match with good genre — best possible result
            log.debug("Exact TM match for %r → %s", band_name, tm_id)
            return tm_id

        if first_passing is None:
            first_passing = tm_id

    if first_passing:
        log.debug("Best-guess TM match for %r → %s", band_name, first_passing)
        return first_passing

    log.info("No acceptable TM attraction found for %r (all rejected by genre)", band_name)
    return None


# ── Step 2: fetch events by attraction ID ─────────────────────────────────────

def _fetch_events_by_attraction(attraction_id: str, api_key: str,
                                 start: str, end: str) -> list:
    """Fetch all upcoming events for a TM attraction ID (auto-paginated)."""
    events: list = []
    page = 0
    while True:
        data = _get("/events.json", {
            "attractionId": attraction_id,
            "startDateTime": f"{start}T00:00:00Z",
            "endDateTime":   f"{end}T23:59:59Z",
            "size": PAGE_SIZE,
            "page": page,
            "sort": "date,asc",
            "locale": "*",
        }, api_key)
        time.sleep(RATE_SLEEP)

        if not data:
            break
        batch = data.get("_embedded", {}).get("events", [])
        events.extend(batch)
        page_info   = data.get("page", {})
        total_pages = page_info.get("totalPages", 1)
        if page + 1 >= total_pages or not batch:
            break
        page += 1

    return events


# ── TM event → flat dict ──────────────────────────────────────────────────────

def _parse_event(tm_event: dict) -> Optional[dict]:
    """Extract the fields we care about from a TM event object."""
    start    = tm_event.get("dates", {}).get("start", {})
    date_str = start.get("localDate", "")
    if not date_str:
        return None

    venues    = tm_event.get("_embedded", {}).get("venues", [{}])
    v         = venues[0] if venues else {}
    city      = v.get("city", {}).get("name", "")
    if not city:
        return None                           # unusable without location

    country      = v.get("country", {}).get("name", "")
    country_code = v.get("country", {}).get("countryCode", "")
    venue_name   = v.get("name", "")

    # State code for US — append to city so geo lookup can try "Las Vegas, NV"
    state_code = v.get("state", {}).get("stateCode", "")
    display_city = f"{city}, {state_code}" if state_code else city

    attractions = tm_event.get("_embedded", {}).get("attractions", [])
    attraction_names = [a["name"] for a in attractions if a.get("name")]

    return {
        "tm_id":        tm_event["id"],
        "title":        tm_event.get("name", ""),
        "date":         date_str,
        "venue":        venue_name,
        "city":         city,
        "display_city": display_city,
        "country":      country,
        "country_code": country_code,
        "ticket_url":   tm_event.get("url", ""),
        "attractions":  attraction_names,
    }


# ── Neo4j upsert ──────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _upsert_event(session, fields: dict, headliner_band_id: str,
                   band_name_index: dict) -> bool:
    """
    MERGE event on external_id; link headliner and matching supporting acts.
    Returns True if the event was newly created.
    """
    tm_id = fields["tm_id"]
    now   = _now()

    existing = session.run(
        "MATCH (e:Event {external_id: $tm_id}) RETURN e.id AS id",
        tm_id=tm_id,
    ).single()

    is_new   = existing is None
    event_id = str(uuid.uuid4()) if is_new else existing["id"]

    if is_new:
        session.run(
            """
            CREATE (e:Event {
                id: $id, external_id: $tm_id, source: 'ticketmaster',
                title: $title, date: $date, venue: $venue,
                city: $city, country: $country, country_code: $country_code,
                ticket_url: $ticket_url,
                created_at: $now, updated_at: $now
            })
            """,
            id=event_id, tm_id=tm_id, now=now,
            title=fields["title"], date=fields["date"], venue=fields["venue"],
            city=fields["city"], country=fields["country"],
            country_code=fields["country_code"], ticket_url=fields["ticket_url"],
        )
    else:
        session.run(
            """
            MATCH (e:Event {external_id: $tm_id})
            SET e.title      = $title,
                e.date       = $date,
                e.venue      = $venue,
                e.ticket_url = $ticket_url,
                e.updated_at = $now
            """,
            tm_id=tm_id, now=now,
            title=fields["title"], date=fields["date"],
            venue=fields["venue"], ticket_url=fields["ticket_url"],
        )

    # Headliner
    session.run(
        "MATCH (b:Band {id: $bid}), (e:Event {id: $eid}) MERGE (b)-[:HEADLINES]->(e)",
        bid=headliner_band_id, eid=event_id,
    )

    # Supporting acts — match TM attraction names against bands in the DB
    for attr_name in fields["attractions"]:
        matched_id = band_name_index.get(attr_name.lower())
        if matched_id and matched_id != headliner_band_id:
            session.run(
                "MATCH (b:Band {id: $bid}), (e:Event {id: $eid}) MERGE (b)-[:SUPPORTS]->(e)",
                bid=matched_id, eid=event_id,
            )

    return is_new


# ── Re-verify cached attraction IDs ──────────────────────────────────────────

def reverify_cached_attraction_ids(session, api_key: str,
                                   status: Optional[dict] = None) -> dict:
    """
    Re-fetch attraction details for every Band that already has a
    tm_attraction_id and remove the cached ID if the attraction no longer
    passes genre verification.

    Pass a mutable `status` dict to receive live progress updates
    (used by the admin polling endpoint).

    Returns summary: {checked, cleared, kept, errors}
    """
    if not api_key:
        raise ValueError("TICKETMASTER_API_KEY is not configured")

    result = session.run(
        """
        MATCH (b:Band)
        WHERE b.tm_attraction_id IS NOT NULL
        RETURN b.id AS id, b.name AS name, b.tm_attraction_id AS tm_attraction_id
        """
    )
    bands = [dict(r) for r in result]

    stats: dict = {"checked": 0, "cleared": 0, "kept": 0, "errors": 0}
    total = len(bands)
    log.info("Re-verifying %d cached TM attraction IDs", total)

    if status is not None:
        status.update({"total": total, "done": 0})

    for band in bands:
        try:
            tm_id = band["tm_attraction_id"]
            # Fetch the single attraction directly by ID
            data = _get(f"/attractions/{tm_id}.json", {}, api_key)
            time.sleep(RATE_SLEEP)
            stats["checked"] += 1

            if data is None:
                # 404 or error — treat as unknown, keep the ID to avoid thrashing
                stats["kept"] += 1
            elif _is_tm_attraction_metal(data):
                stats["kept"] += 1
                log.debug("Kept TM ID for %r (%s) — genre OK", band["name"], tm_id)
            else:
                session.run(
                    "MATCH (b:Band {id: $bid}) REMOVE b.tm_attraction_id",
                    bid=band["id"],
                )
                stats["cleared"] += 1
                log.info(
                    "Cleared TM attraction ID for %r (%s) — genre mismatch",
                    band["name"], tm_id,
                )

        except Exception as exc:
            log.error("Error re-verifying band %r: %s", band["name"], exc)
            stats["errors"] += 1

        if status is not None:
            status["done"] = stats["checked"] + stats["errors"]

    log.info("Re-verify complete: %s", stats)
    return stats


# ── Public entry point ────────────────────────────────────────────────────────

def sync_events(session, api_key: str, days: int = LOOKAHEAD_DAYS) -> dict:
    """
    Sync upcoming events from Ticketmaster for all active/approved bands.

    Two-step strategy:
      • If a band has no cached tm_attraction_id, look it up and cache it.
      • Fetch events by attraction ID for precise results.

    Returns summary dict: {bands_checked, api_calls, events_new,
                           events_updated, errors, skipped}
    """
    if not api_key:
        raise ValueError("TICKETMASTER_API_KEY is not configured")

    today    = date.today().isoformat()
    end_date = (date.today() + timedelta(days=days)).isoformat()

    # Load all active bands with any cached TM attraction ID
    result = session.run(
        """
        MATCH (b:Band) WHERE b.status IN ['active', 'approved', 'published']
        // 'published' is the live status; 'active'/'approved' kept for legacy data
        RETURN b.id AS id, b.name AS name, b.slug AS slug,
               b.tm_attraction_id AS tm_attraction_id
        """
    )
    bands = [dict(r) for r in result]
    log.info("Syncing events for %d bands (next %d days)", len(bands), days)

    # Build lowercase name → band_id index for supporting-act matching
    band_name_index: dict[str, str] = {b["name"].lower(): b["id"] for b in bands}

    stats = {
        "bands_checked":  len(bands),
        "api_calls":      0,
        "events_new":     0,
        "events_updated": 0,
        "errors":         0,
        "skipped":        0,
    }

    for band in bands:
        try:
            tm_id = band.get("tm_attraction_id")

            # ── Step 1: resolve attraction ID (cached after first run) ────────
            if not tm_id:
                tm_id = _lookup_attraction_id(band["name"], api_key)
                stats["api_calls"] += 1
                if tm_id:
                    # Cache it on the Band node for future syncs
                    session.run(
                        "MATCH (b:Band {id: $bid}) SET b.tm_attraction_id = $tid",
                        bid=band["id"], tid=tm_id,
                    )
                else:
                    log.debug("No TM attraction found for %r — skipping", band["name"])
                    stats["skipped"] += 1
                    continue

            # ── Step 2: fetch events by attraction ID ─────────────────────────
            tm_events = _fetch_events_by_attraction(tm_id, api_key, today, end_date)
            stats["api_calls"] += 1 + (len(tm_events) // PAGE_SIZE)  # pages fetched

            for tm_event in tm_events:
                fields = _parse_event(tm_event)
                if not fields:
                    stats["skipped"] += 1
                    continue
                is_new = _upsert_event(session, fields, band["id"], band_name_index)
                if is_new:
                    stats["events_new"] += 1
                else:
                    stats["events_updated"] += 1

        except Exception as exc:
            log.error("Error syncing band %r: %s", band["name"], exc)
            stats["errors"] += 1

    log.info("Sync complete: %s", stats)
    return stats
