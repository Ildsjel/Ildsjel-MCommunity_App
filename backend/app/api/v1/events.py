from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from app.auth.jwt_handler import get_current_user
from app.db.neo4j_driver import get_neo4j_session
from app.models.event_models import (
    EventCreate, RsvpRequest, RsvpResponse,
    ToggleInterestResponse, AttendeeRef,
)
from app.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/")
async def list_events(
    lat: Optional[float] = Query(None, description="User latitude (GPS)"),
    lon: Optional[float] = Query(None, description="User longitude (GPS)"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(25, ge=1, le=100, description="Events per page"),
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    """
    Ranked, paginated upcoming events feed.

    Pass ?lat=<latitude>&lon=<longitude> for GPS-based proximity ranking.
    Falls back to the user's profile city, then a neutral location score.
    """
    today_str = date.today().isoformat()

    user_city: Optional[str] = None
    try:
        r = session.run(
            "MATCH (u:User {id: $id}) RETURN u.city AS city",
            id=current_user["id"],
        )
        rec = r.single()
        if rec:
            user_city = rec["city"]
    except Exception:
        pass

    svc = EventService(session)
    result = svc.list_events(
        user_id=current_user["id"],
        user_city=user_city,
        today_str=today_str,
        user_lat=lat,
        user_lon=lon,
        page=page,
        limit=limit,
    )
    return result


@router.get("/{event_id}")
async def get_event(
    event_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    svc = EventService(session)
    event = svc.get_event(event_id, current_user["id"])
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


# ── RSVP ─────────────────────────────────────────────────────────────────────

@router.post("/{event_id}/rsvp", response_model=RsvpResponse)
async def rsvp_event(
    event_id: str,
    body: RsvpRequest,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    """
    Toggle-style RSVP.

    Send ``{"status": "interested"}`` or ``{"status": "going"}``.
    If the user already has that exact status, it is removed (toggle off).
    If they have a different status, it is updated.

    Returns the new status (null = removed) and updated counts.
    """
    if body.status not in ("interested", "going"):
        raise HTTPException(status_code=422, detail="status must be 'interested' or 'going'")

    # Verify event exists
    exists = session.run(
        "MATCH (e:Event {id: $eid}) RETURN e.id LIMIT 1", eid=event_id
    ).single()
    if not exists:
        raise HTTPException(status_code=404, detail="Event not found")

    svc = EventService(session)
    result = svc.set_rsvp(current_user["id"], event_id, body.status)
    return RsvpResponse(**result)


@router.get("/{event_id}/attendees", response_model=List[AttendeeRef])
async def get_attendees(
    event_id: str,
    status: str = Query("going", description="Filter by RSVP status: 'going' or 'interested'"),
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    """
    Full attendee list for a given RSVP status, sorted:
      friends first → most shared bands → alphabetical.
    Used by the AttendeesModal on the event detail page.
    """
    if status not in ("interested", "going"):
        raise HTTPException(status_code=422, detail="status must be 'interested' or 'going'")

    svc = EventService(session)
    try:
        attendees = svc.get_attendees(event_id, status, current_user["id"])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return [AttendeeRef(**a) for a in attendees]


# ── Legacy interest toggle (backwards compat) ─────────────────────────────────

@router.post("/{event_id}/interest", response_model=ToggleInterestResponse)
async def toggle_interest(
    event_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    """Deprecated — use POST /{event_id}/rsvp instead."""
    svc = EventService(session)
    interested = svc.toggle_interest(current_user["id"], event_id)
    return ToggleInterestResponse(interested=interested)


# ── Admin create ──────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_event(
    body: EventCreate,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    if current_user.get("role") not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin only")
    svc = EventService(session)
    event = svc.create_event(body.model_dump())
    return event
