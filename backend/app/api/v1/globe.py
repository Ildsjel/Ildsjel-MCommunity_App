"""
Globe API — location data for the Metal Match Atlas
"""
from fastapi import APIRouter, Depends
from app.db.neo4j_driver import get_neo4j_session
from app.auth.jwt_handler import get_current_user
from app.utils.geo import resolve_coords

router = APIRouter(prefix="/globe", tags=["Globe"])


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
          AND u.onboarding_complete = true
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
