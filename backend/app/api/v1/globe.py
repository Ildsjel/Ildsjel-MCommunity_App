"""
Globe API — location data for the Metal Match Atlas
"""
import math
from fastapi import APIRouter, Depends, Query
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user
from app.utils.geo import resolve_coords

router = APIRouter(prefix="/globe", tags=["Globe"])


@router.get("/data")
async def get_globe_data(
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
        coords = resolve_coords(user_rec["city"])
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
          AND coalesce(u.onboarding_complete, true) = true
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
        coords = resolve_coords(r["city"])
        if coords:
            metalheads.append({
                "lat": coords["lat"],
                "lon": coords["lon"],
                "handle": r["handle"],
                "city": r["city"],
                "country": r["country"] or "",
            })

    return {"self": self_data, "metalheads": metalheads}


@router.get("/nearby")
async def get_nearby_users(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius_km: float = Query(50.0, description="Search radius in kilometres"),
    session=Depends(get_neo4j_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Return the count (and handles) of active, discoverable metalheads within
    radius_km of the given coordinates.  Uses an approximate bounding-box
    pre-filter followed by the exact Haversine formula.
    """
    # Approximate degree deltas for the bounding box
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / (111.0 * max(math.cos(math.radians(lat)), 0.01))

    records = session.run(
        """
        MATCH (u:User)
        WHERE u.is_active = true
          AND u.email_verified = true
          AND coalesce(u.onboarding_complete, true) = true
          AND (u.discoverable_by_name = true OR u.discoverable_by_music = true)
          AND u.latitude  IS NOT NULL
          AND u.longitude IS NOT NULL
          AND u.city_visible <> 'hidden'
          AND u.id <> $uid
          AND u.latitude  >= $lat_min AND u.latitude  <= $lat_max
          AND u.longitude >= $lng_min AND u.longitude <= $lng_max
        RETURN u.handle AS handle, u.latitude AS lat, u.longitude AS lng
        LIMIT 500
        """,
        uid=current_user["id"],
        lat_min=lat - lat_delta,
        lat_max=lat + lat_delta,
        lng_min=lng - lng_delta,
        lng_max=lng + lng_delta,
    )

    R = 6371.0  # Earth radius km
    nearby = []
    for r in records:
        u_lat, u_lng = r["lat"], r["lng"]
        dlat = math.radians(u_lat - lat)
        dlng = math.radians(u_lng - lng)
        a = (math.sin(dlat / 2) ** 2
             + math.cos(math.radians(lat))
             * math.cos(math.radians(u_lat))
             * math.sin(dlng / 2) ** 2)
        dist_km = 2 * R * math.asin(math.sqrt(a))
        if dist_km <= radius_km:
            nearby.append({"handle": r["handle"], "distance_km": round(dist_km, 1)})

    return {"count": len(nearby), "users": nearby}
