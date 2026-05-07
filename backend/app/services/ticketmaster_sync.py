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

TM_BASE       = "https://app.ticketmaster.com/discovery/v2"
RATE_SLEEP    = 0.22        # stay just under 5 req/sec
MAX_RETRIES   = 3
LOOKAHEAD_DAYS = 180
PAGE_SIZE     = 200         # TM max per page


# ── HTTP ──────────────────────────────────────────────────────────────────────

def _get(path: str, params: dict, api_key: str) -> Optional[dict]:
    """GET with retry on 429; returns parsed JSON or None."""
    params = {**params, "apikey": api_key}
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.get(f"{TM_BASE}{path}", params=params, timeout=10)
            if r.status_code == 429:
                wait = 2 ** (attempt + 1)
                log.warning("TM rate-limited — sleeping %ss", wait)
                time.sleep(wait)
                continue
            if r.status_code == 200:
                return r.json()
            log.debug("TM %s HTTP %s", path, r.status_code)
            return None
        except requests.RequestException as exc:
            log.warning("TM request error: %s", exc)
            time.sleep(2 ** attempt)
    return None


# ── Step 1: attraction ID lookup ──────────────────────────────────────────────

def _lookup_attraction_id(band_name: str, api_key: str) -> Optional[str]:
    """
    Find the Ticketmaster attraction ID for a band.
    Returns the first Music-classification result whose name matches exactly
    (case-insensitive), falling back to the first result if no exact match.
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

    # Prefer exact name match
    lower = band_name.lower()
    for a in attractions:
        if a.get("name", "").lower() == lower:
            return a["id"]
    return attractions[0]["id"]   # best-guess first result


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
        MATCH (b:Band) WHERE b.status IN ['active', 'approved']
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
