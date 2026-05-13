"""
Event ranking service — implements the full matching algorithm spec.

Scoring weights:  location 50% · taste 35% · friends 15%

Location score
  - Within DEFAULT_RADIUS_KM (100 km): 1.0
  - 100–300 km: linear 1.0 → 0.15
  - 300–600 km: linear 0.15 → 0.02
  - > 600 km: 0.0  (strong deprioritisation; far events can never beat a near one)
  - No user location available: 0.4 neutral (rely on taste/friends)

Taste score
  - Headliner match: +0.70 (binary)
  - Each support match: diminishing (+0.25, +0.15, +0.10, …) — capped at 0.30 total
  - Total capped at 1.0

Friends score
  - log(1 + n) / log(7) → f(1)≈0.36, f(3)≈0.71, f(6)=1.0
  - Capped at 1.0

Tie-breaking (all deterministic):
  location_score → taste_score → friends_score → date ASC → event id
"""
import math
from typing import List, Optional, Dict, Any
from app.db.repositories.event_repository import EventRepository

# ── City lookup table (fallback when no GPS) ─────────────────────────────────

CITY_COORDS: Dict[str, tuple] = {
    # Germany
    'berlin': (52.520, 13.405), 'hamburg': (53.550, 9.994),
    'munich': (48.135, 11.582), 'münchen': (48.135, 11.582),
    'cologne': (50.933, 6.950), 'köln': (50.933, 6.950),
    'frankfurt': (50.111, 8.682), 'frankfurt am main': (50.111, 8.682),
    'düsseldorf': (51.225, 6.782), 'stuttgart': (48.776, 9.183),
    'leipzig': (51.340, 12.373), 'dresden': (51.050, 13.737),
    'bremen': (53.075, 8.808), 'hannover': (52.373, 9.738),
    'nuremberg': (49.453, 11.077), 'nürnberg': (49.453, 11.077),
    'wacken': (54.078, 9.374), 'dortmund': (51.514, 7.468),
    'bochum': (51.482, 7.217), 'essen': (51.457, 7.012),
    # Austria / Switzerland
    'vienna': (48.208, 16.374), 'wien': (48.208, 16.374),
    'graz': (47.071, 15.440), 'salzburg': (47.810, 13.055),
    'linz': (48.306, 14.286),
    'zurich': (47.377, 8.542), 'zürich': (47.377, 8.542),
    'bern': (46.948, 7.447), 'geneva': (46.204, 6.143), 'basel': (47.560, 7.590),
    # Nordics
    'oslo': (59.914, 10.752), 'bergen': (60.392, 5.324),
    'stockholm': (59.329, 18.069), 'gothenburg': (57.707, 11.967),
    'copenhagen': (55.676, 12.568), 'aarhus': (56.157, 10.211),
    'helsinki': (60.170, 24.938), 'tampere': (61.498, 23.761),
    'reykjavik': (64.136, -21.895),
    # UK / Ireland
    'london': (51.507, -0.128), 'manchester': (53.481, -2.243),
    'glasgow': (55.864, -4.252), 'edinburgh': (55.953, -3.188),
    'birmingham': (52.480, -1.903), 'leeds': (53.800, -1.549),
    'bristol': (51.455, -2.588), 'sheffield': (53.383, -1.466),
    'dublin': (53.350, -6.260), 'belfast': (54.597, -5.930),
    # Benelux
    'amsterdam': (52.368, 4.904), 'rotterdam': (51.924, 4.478),
    'the hague': (52.070, 4.300), 'utrecht': (52.090, 5.121),
    'brussels': (50.850, 4.352), 'antwerp': (51.221, 4.400),
    'luxembourg': (49.611, 6.132),
    # France
    'paris': (48.857, 2.352), 'lyon': (45.764, 4.836),
    'marseille': (43.297, 5.381), 'toulouse': (43.604, 1.444),
    'bordeaux': (44.837, -0.579), 'lille': (50.629, 3.057),
    # Iberia
    'madrid': (40.417, -3.704), 'barcelona': (41.385, 2.173),
    'seville': (37.388, -5.982), 'bilbao': (43.262, -2.925),
    'lisbon': (38.717, -9.139), 'porto': (41.157, -8.629),
    # Italy
    'rome': (41.903, 12.496), 'milan': (45.464, 9.190),
    'naples': (40.851, 14.268), 'turin': (45.070, 7.687),
    'bologna': (44.494, 11.343), 'florence': (43.769, 11.256),
    # Eastern Europe
    'warsaw': (52.230, 21.012), 'krakow': (50.061, 19.937),
    'prague': (50.076, 14.438), 'brno': (49.196, 16.607),
    'budapest': (47.498, 19.040), 'bucharest': (44.426, 26.103),
    'sofia': (42.698, 23.322), 'belgrade': (44.787, 20.457),
    'zagreb': (45.815, 15.982), 'ljubljana': (46.051, 14.506),
    'bratislava': (48.148, 17.107), 'tallinn': (59.437, 24.754),
    'riga': (56.946, 24.106), 'vilnius': (54.687, 25.280),
    # Greece / Turkey
    'athens': (37.984, 23.728), 'thessaloniki': (40.636, 22.945),
    'istanbul': (41.015, 28.979), 'ankara': (39.920, 32.854),
    # North America
    'new york': (40.713, -74.006), 'los angeles': (34.052, -118.244),
    'chicago': (41.878, -87.630), 'toronto': (43.653, -79.383),
    'montreal': (45.501, -73.567), 'vancouver': (49.283, -123.121),
    'san francisco': (37.775, -122.419), 'seattle': (47.606, -122.332),
    'boston': (42.360, -71.059), 'dallas': (32.776, -96.797),
    'houston': (29.760, -95.370), 'atlanta': (33.749, -84.388),
    'miami': (25.775, -80.208), 'phoenix': (33.448, -112.074),
    'denver': (39.739, -104.984), 'detroit': (42.332, -83.046),
    'portland': (45.523, -122.676), 'las vegas': (36.175, -115.137),
    'minneapolis': (44.977, -93.265), 'nashville': (36.174, -86.768),
    # Oceania
    'sydney': (-33.869, 151.209), 'melbourne': (-37.814, 144.963),
    'brisbane': (-27.468, 153.028), 'perth': (-31.952, 115.861),
    'auckland': (-36.852, 174.763),
    # Asia
    'tokyo': (35.676, 139.650), 'osaka': (34.693, 135.502),
    'seoul': (37.566, 126.978), 'beijing': (39.906, 116.391),
    'shanghai': (31.228, 121.474), 'hong kong': (22.396, 114.109),
    'singapore': (1.352, 103.820), 'taipei': (25.047, 121.519),
    # South America
    'buenos aires': (-34.603, -58.382), 'sao paulo': (-23.549, -46.633),
    'santiago': (-33.459, -70.648), 'bogota': (4.711, -74.072),
    # Russia
    'moscow': (55.751, 37.617), 'saint petersburg': (59.939, 30.316),
}

DEFAULT_RADIUS_KM = 100   # full-score radius
FAR_THRESHOLD_KM  = 600   # beyond this → score = 0 (effectively excluded)


# ── Maths helpers ─────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _event_coords(row: dict) -> Optional[tuple]:
    """Return (lat, lon) for an event — from stored coords or city lookup."""
    lat, lon = row.get("lat"), row.get("lon")
    if lat is not None and lon is not None:
        return (lat, lon)
    city = (row.get("city") or "").lower().strip()
    return CITY_COORDS.get(city)


def _location_score(dist_km: Optional[float]) -> float:
    """Piecewise location score with steep drop-off past the travel radius."""
    if dist_km is None:
        return 0.4   # neutral — no penalty, no boost
    if dist_km <= DEFAULT_RADIUS_KM:
        return 1.0
    if dist_km <= DEFAULT_RADIUS_KM * 3:   # 100–300 km
        t = (dist_km - DEFAULT_RADIUS_KM) / (DEFAULT_RADIUS_KM * 2)
        return 1.0 - 0.85 * t              # 1.0 → 0.15
    if dist_km <= FAR_THRESHOLD_KM:        # 300–600 km
        t = (dist_km - DEFAULT_RADIUS_KM * 3) / (DEFAULT_RADIUS_KM * 3)
        return max(0.02, 0.15 - 0.13 * t)  # 0.15 → 0.02
    return 0.0                              # > 600 km: effectively excluded


def _taste_score(headliner_matches: int, support_matches: int) -> float:
    """
    Headliner match is worth 0.70.
    Support matches add diminishing returns (capped at 0.30 total).
    """
    h_score = 0.70 * min(1, headliner_matches)
    # Diminishing: +0.25 first support, +0.15 second, +0.10 third, ... → asymptote ~0.30
    support_weights = [0.25, 0.15, 0.10]
    s_score = sum(support_weights[i] for i in range(min(support_matches, len(support_weights))))
    if support_matches > len(support_weights):
        s_score += 0.05 * (support_matches - len(support_weights))  # tiny marginal gain
    return min(1.0, h_score + min(0.30, s_score))


def _friends_score(n: int) -> float:
    """log(1+n)/log(7) → f(1)≈0.36, f(3)≈0.71, f(6)=1.0, capped at 1.0."""
    if n == 0:
        return 0.0
    return min(1.0, math.log(1 + n) / math.log(7))


def _explain(dist_km: Optional[float],
             headliner_matches: int, support_matches: int,
             friends_count: int) -> dict:
    """Privacy-safe explainability payload for the UI."""
    parts = {}
    if dist_km is not None:
        if dist_km <= 10:
            parts["location"] = "in your city"
        elif dist_km <= DEFAULT_RADIUS_KM:
            parts["location"] = f"{dist_km} km away"
        elif dist_km <= 300:
            parts["location"] = f"~{round(dist_km / 50) * 50} km away"
        else:
            parts["location"] = "far away"
    total_taste = headliner_matches + support_matches
    if total_taste > 0:
        parts["taste"] = f"{total_taste} matching band{'s' if total_taste != 1 else ''}"
    if friends_count > 0:
        parts["friends"] = f"{friends_count} friend{'s' if friends_count != 1 else ''} interested"
    return parts


# ── Service ───────────────────────────────────────────────────────────────────

class EventService:
    def __init__(self, session):
        self.repo = EventRepository(session)

    def list_events(
        self,
        user_id: str,
        user_city: Optional[str],
        today_str: str,
        user_lat: Optional[float] = None,
        user_lon: Optional[float] = None,
        page: int = 1,
        limit: int = 25,
    ) -> dict:
        """
        Return a ranked, paginated event feed.

        Ranking is done in Python (after fetching all upcoming events) so that
        the sort order is stable across pages.  For typical city feeds (<500 events)
        this is fast enough (p95 << 50 ms); for very large datasets a pre-computed
        score column in Neo4j would be better.
        """
        # Fetch ALL upcoming events (no skip/limit in DB — we sort then paginate)
        all_events = self.repo.list_upcoming(user_id, today_str, skip=0, limit=5000)
        total = len(all_events)

        # Resolve user coords: GPS first → profile city fallback
        user_coords: Optional[tuple] = None
        has_gps = False
        if user_lat is not None and user_lon is not None:
            user_coords = (user_lat, user_lon)
            has_gps = True
        elif user_city:
            user_coords = CITY_COORDS.get(user_city.lower().strip())

        # Deduplicate: same headliner + date + city = same concert indexed under
        # multiple TM attraction IDs.  Keep the first occurrence (DB order = insert order).
        seen_keys: set = set()
        deduped: List[Dict[str, Any]] = []
        for e in all_events:
            headliner = e.get("headliner")
            dedup_key = (
                headliner["id"] if headliner else e.get("title", ""),
                e.get("date", ""),
                (e.get("city") or "").lower().strip(),
            )
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)
            deduped.append(e)
        all_events = deduped
        total = len(all_events)

        # Score every event
        scored: List[Dict[str, Any]] = []
        for e in all_events:
            ev_coords = _event_coords(e)

            # Distance
            dist_km: Optional[int] = None
            if user_coords and ev_coords:
                dist_km = round(_haversine_km(
                    user_coords[0], user_coords[1],
                    ev_coords[0],   ev_coords[1],
                ))

            # Map friends_going / friends_interested → avatar group fields
            e["going_avatars"]      = (e.pop("friends_going", None) or [])[:8]
            e["interested_avatars"] = (e.pop("friends_interested", None) or [])[:8]

            h_matches = int(e.pop("taste_headliner_count", 0) or 0)
            s_matches = int(e.pop("taste_support_count", 0) or 0)
            f_count   = len(e.get("going_avatars", [])) + len(e.get("interested_avatars", []))

            loc_s     = _location_score(dist_km)
            taste_s   = _taste_score(h_matches, s_matches)
            friends_s = _friends_score(f_count)

            match_score = 0.50 * loc_s + 0.35 * taste_s + 0.15 * friends_s

            e["match_score"]     = round(match_score, 4)
            e["location_score"]  = round(loc_s, 4)
            e["taste_score"]     = round(taste_s, 4)
            e["friends_score"]   = round(friends_s, 4)
            e["distance_km"]     = dist_km
            e["explain"]         = _explain(dist_km, h_matches, s_matches, f_count)
            # Remove internal lat/lon from response
            e.pop("lat", None)
            e.pop("lon", None)
            scored.append(e)

        # Stable sort: score desc → location → taste → friends → date → id
        scored.sort(key=lambda x: (
            -round(x["match_score"] * 1000),
            -round(x["location_score"] * 1000),
            -round(x["taste_score"] * 1000),
            -round(x["friends_score"] * 1000),
            x["date"],
            x["id"],
        ))

        # Paginate
        offset = (page - 1) * limit
        page_events = scored[offset: offset + limit]
        total_pages = math.ceil(total / limit) if total > 0 else 1

        return {
            "events": page_events,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
            "location_source": "gps" if has_gps else ("city" if user_coords else "none"),
        }

    def get_event(self, event_id: str, user_id: str) -> Optional[dict]:
        row = self.repo.get_event(event_id, user_id)
        if not row:
            return None
        # Use friends_going as going_avatars, friends_interested as interested_avatars
        row["going_avatars"]      = (row.pop("friends_going", None) or [])[:8]
        row["interested_avatars"] = (row.pop("friends_interested", None) or [])[:8]
        # Clean up internal scoring/geo fields from detail view
        row.pop("taste_headliner_count", None)
        row.pop("taste_support_count", None)
        row.pop("lat", None)
        row.pop("lon", None)
        return row

    def create_event(self, data: dict) -> dict:
        return self.repo.create_event(data)

    def toggle_interest(self, user_id: str, event_id: str) -> bool:
        """Legacy alias."""
        return self.repo.toggle_interest(user_id, event_id)

    def set_rsvp(self, user_id: str, event_id: str, status: str) -> dict:
        """
        Toggle RSVP. Returns RsvpResponse-compatible dict with updated counts.
        """
        if status not in ("interested", "going"):
            raise ValueError(f"Invalid RSVP status: {status!r}")
        new_status = self.repo.set_rsvp(user_id, event_id, status)
        counts = self.repo.get_event_counts(event_id)
        return {
            "rsvp": new_status,
            "going_count": counts["going_count"],
            "interested_count": counts["interested_count"],
        }

    def get_attendees(self, event_id: str, status: str, requesting_user_id: str) -> List[Dict[str, Any]]:
        """Return attendees sorted: friends → shared bands → handle."""
        if status not in ("interested", "going"):
            raise ValueError(f"Invalid status: {status!r}")
        return self.repo.get_attendees(event_id, status, requesting_user_id)
