import math
from typing import List, Optional
from app.db.repositories.event_repository import EventRepository

CITY_COORDS = {
    'berlin': (52.52, 13.405), 'hamburg': (53.55, 9.994), 'munich': (48.135, 11.582),
    'münchen': (48.135, 11.582), 'cologne': (50.933, 6.95), 'köln': (50.933, 6.95),
    'frankfurt': (50.111, 8.682), 'leipzig': (51.34, 12.373), 'dresden': (51.05, 13.737),
    'wacken': (54.078, 9.374), 'vienna': (48.208, 16.374), 'wien': (48.208, 16.374),
    'graz': (47.071, 15.44), 'salzburg': (47.81, 13.055), 'zurich': (47.377, 8.542),
    'zürich': (47.377, 8.542), 'bern': (46.948, 7.447), 'oslo': (59.914, 10.752),
    'stockholm': (59.329, 18.069), 'copenhagen': (55.676, 12.568), 'helsinki': (60.17, 24.938),
    'london': (51.507, -0.128), 'manchester': (53.481, -2.243), 'glasgow': (55.864, -4.252),
    'edinburgh': (55.953, -3.188), 'dublin': (53.35, -6.26), 'amsterdam': (52.368, 4.904),
    'rotterdam': (51.924, 4.478), 'brussels': (50.85, 4.352), 'paris': (48.857, 2.352),
    'madrid': (40.417, -3.704), 'barcelona': (41.385, 2.173), 'rome': (41.903, 12.496),
    'milan': (45.464, 9.19), 'warsaw': (52.23, 21.012), 'prague': (50.076, 14.438),
    'budapest': (47.498, 19.04), 'bucharest': (44.426, 26.103), 'athens': (37.984, 23.728),
    'new york': (40.713, -74.006), 'los angeles': (34.052, -118.244), 'chicago': (41.878, -87.63),
    'toronto': (43.653, -79.383), 'tokyo': (35.676, 139.65), 'sydney': (-33.869, 151.209),
}


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _distance_km(city1: str, city2: str) -> Optional[int]:
    c1 = CITY_COORDS.get(city1.lower().strip())
    c2 = CITY_COORDS.get(city2.lower().strip())
    if not c1 or not c2:
        return None
    return round(_haversine_km(c1[0], c1[1], c2[0], c2[1]))


class EventService:
    def __init__(self, session):
        self.repo = EventRepository(session)

    def list_events(self, user_id: str, user_city: Optional[str], today_str: str) -> List[dict]:
        events = self.repo.list_upcoming(user_id, today_str)
        for e in events:
            total_bands = 1 + len(e.get("supporting", []))  # headliner + supporting
            # Location score
            dist = None
            if user_city and e.get("city"):
                dist = _distance_km(user_city, e["city"])
            loc_score = max(0.0, 1.0 - dist / 500) if dist is not None else 0.0
            # Taste score
            taste_count = e.pop("taste_bands_count", 0) or 0
            taste_score = taste_count / max(1, total_bands)
            # Friends score
            friends_count = len(e.get("friends_interested", []))
            friends_score = min(1.0, friends_count / 5)
            # Composite
            e["match_score"] = 0.5 * loc_score + 0.35 * taste_score + 0.15 * friends_score
            e["distance_km"] = dist
        # Sort: by score desc, then by date asc as tiebreaker
        events.sort(key=lambda x: (-x["match_score"], x["date"]))
        return events

    def get_event(self, event_id: str, user_id: str) -> Optional[dict]:
        return self.repo.get_event(event_id, user_id)

    def create_event(self, data: dict) -> dict:
        return self.repo.create_event(data)

    def toggle_interest(self, user_id: str, event_id: str) -> bool:
        return self.repo.toggle_interest(user_id, event_id)
