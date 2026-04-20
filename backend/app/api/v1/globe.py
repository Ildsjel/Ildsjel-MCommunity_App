"""
Globe API — location data for the Metal Match Atlas
"""
from typing import Dict, Tuple
from fastapi import APIRouter, Depends
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user

router = APIRouter(prefix="/globe", tags=["Globe"])

# lat/lon for known metal-scene cities (mirrors search_repository coords)
_COORDS: Dict[str, Tuple[float, float]] = {
    'berlin': (52.5200, 13.4050), 'hamburg': (53.5511, 9.9937),
    'munich': (48.1351, 11.5820), 'münchen': (48.1351, 11.5820),
    'cologne': (50.9333, 6.9500), 'köln': (50.9333, 6.9500),
    'frankfurt': (50.1109, 8.6821), 'stuttgart': (48.7758, 9.1829),
    'düsseldorf': (51.2217, 6.7762), 'dusseldorf': (51.2217, 6.7762),
    'dortmund': (51.5136, 7.4653), 'leipzig': (51.3397, 12.3731),
    'dresden': (51.0504, 13.7373), 'hannover': (52.3759, 9.7320),
    'nuremberg': (49.4521, 11.0767), 'nürnberg': (49.4521, 11.0767),
    'wacken': (54.0783, 9.3740),
    'vienna': (48.2082, 16.3738), 'wien': (48.2082, 16.3738),
    'graz': (47.0707, 15.4395), 'salzburg': (47.8095, 13.0550),
    'zurich': (47.3769, 8.5417), 'zürich': (47.3769, 8.5417),
    'bern': (46.9481, 7.4474), 'geneva': (46.2044, 6.1432),
    'oslo': (59.9139, 10.7522), 'stockholm': (59.3293, 18.0686),
    'copenhagen': (55.6761, 12.5683), 'gothenburg': (57.7089, 11.9746),
    'göteborg': (57.7089, 11.9746), 'helsinki': (60.1699, 24.9384),
    'bergen': (60.3913, 5.3221), 'trondheim': (63.4305, 10.3951),
    'london': (51.5074, -0.1278), 'manchester': (53.4808, -2.2426),
    'birmingham': (52.4862, -1.8904), 'edinburgh': (55.9533, -3.1883),
    'glasgow': (55.8642, -4.2518), 'dublin': (53.3498, -6.2603),
    'amsterdam': (52.3676, 4.9041), 'rotterdam': (51.9244, 4.4777),
    'brussels': (50.8503, 4.3517), 'antwerp': (51.2194, 4.4025),
    'paris': (48.8566, 2.3522), 'lyon': (45.7640, 4.8357),
    'marseille': (43.2965, 5.3698), 'bordeaux': (44.8378, -0.5792),
    'warsaw': (52.2297, 21.0122), 'wroclaw': (51.1079, 17.0385),
    'wrocław': (51.1079, 17.0385), 'krakow': (50.0647, 19.9450),
    'kraków': (50.0647, 19.9450), 'gdansk': (54.3520, 18.6466),
    'prague': (50.0755, 14.4378), 'praha': (50.0755, 14.4378),
    'brno': (49.1951, 16.6068),
    'rome': (41.9028, 12.4964), 'milan': (45.4642, 9.1900),
    'milano': (45.4642, 9.1900), 'florence': (43.7696, 11.2558),
    'madrid': (40.4168, -3.7038), 'barcelona': (41.3851, 2.1734),
    'bilbao': (43.2630, -2.9340),
    'new york': (40.7128, -74.0060), 'los angeles': (34.0522, -118.2437),
    'chicago': (41.8781, -87.6298), 'portland': (45.5231, -122.6765),
    'seattle': (47.6062, -122.3321), 'san francisco': (37.7749, -122.4194),
    'atlanta': (33.7490, -84.3880), 'denver': (39.7392, -104.9903),
    'boston': (42.3601, -71.0589),
    'toronto': (43.6532, -79.3832), 'montreal': (45.5017, -73.5673),
    'vancouver': (49.2827, -123.1207),
    'tokyo': (35.6762, 139.6503), 'sydney': (-33.8688, 151.2093),
    'melbourne': (-37.8136, 144.9631),
    # Additional
    'cape town': (-33.9249, 18.4241), 'johannesburg': (-26.2041, 28.0473),
    'são paulo': (-23.5505, -46.6333), 'sao paulo': (-23.5505, -46.6333),
    'buenos aires': (-34.6037, -58.3816),
    'mexico city': (19.4326, -99.1332),
    'eitorf': (50.7834, 7.4544),
}


def _resolve_coords(city: str | None):
    if not city:
        return None
    coords = _COORDS.get(city.lower().strip())
    return {"lat": coords[0], "lon": coords[1]} if coords else None


@router.get("/data")
async def list_metalhead_locations(
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Return current user's location + discoverable metalheads with resolved coordinates.
    Only returns users whose city is in the known coordinate set.
    """
    uid = current_user["id"]

    user_rec = session.run(
        """
        MATCH (u:User {id: $uid})
        RETURN u.city AS city, u.country AS country, u.handle AS handle
        """,
        uid=uid,
    ).single()

    self_data = None
    if user_rec and user_rec["city"]:
        coords = _resolve_coords(user_rec["city"])
        if coords:
            self_data = {
                "lat": coords["lat"],
                "lon": coords["lon"],
                "handle": user_rec["handle"],
                "city": user_rec["city"],
                "country": user_rec["country"] or "",
            }

    others = session.run(
        """
        MATCH (u:User)
        WHERE u.is_active = true
          AND u.email_verified = true
          AND (u.discoverable_by_name = true OR u.discoverable_by_music = true)
          AND u.city IS NOT NULL
          AND u.city_visible <> 'hidden'
          AND u.id <> $uid
        RETURN u.handle AS handle, u.city AS city, u.country AS country
        LIMIT 150
        """,
        uid=uid,
    )

    metalheads = []
    for r in others:
        coords = _resolve_coords(r["city"])
        if coords:
            metalheads.append({
                "lat": coords["lat"],
                "lon": coords["lon"],
                "handle": r["handle"],
                "city": r["city"],
                "country": r["country"] or "",
            })

    return {"self": self_data, "metalheads": metalheads}
