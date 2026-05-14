"""Shared geo utilities: city-to-coordinate lookup and Haversine distance."""
import math
from typing import Dict, Optional, Tuple

CITY_COORDS: Dict[str, Tuple[float, float]] = {
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


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def resolve_coords(city: Optional[str]) -> Optional[Dict[str, float]]:
    """Return {'lat': ..., 'lon': ...} for a known city name, or None."""
    if not city:
        return None
    coords = CITY_COORDS.get(city.lower().strip())
    if coords is None:
        return None
    return {"lat": coords[0], "lon": coords[1]}


def distance_between_cities_km(
    city1: Optional[str], city2: Optional[str]
) -> Optional[float]:
    """Haversine distance in km between two named cities, or None if unknown."""
    c1 = resolve_coords(city1)
    c2 = resolve_coords(city2)
    if c1 is None or c2 is None:
        return None
    return _haversine_km(c1["lat"], c1["lon"], c2["lat"], c2["lon"])
