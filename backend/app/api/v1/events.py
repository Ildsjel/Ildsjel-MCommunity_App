from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.auth.jwt_handler import get_current_user
from app.db.neo4j_driver import get_neo4j_session
from app.models.event_models import EventCreate, ToggleInterestResponse
from app.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/")
async def list_events(
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    today_str = date.today().isoformat()
    user_city = current_user.get("city")
    svc = EventService(session)
    events = svc.list_events(current_user["id"], user_city, today_str)
    return {"events": events}


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


@router.post("/{event_id}/interest")
async def toggle_interest(
    event_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    svc = EventService(session)
    interested = svc.toggle_interest(current_user["id"], event_id)
    return ToggleInterestResponse(interested=interested)


@router.post("/", status_code=201)
async def create_event(
    body: EventCreate,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    # Only admin/superadmin can create events
    if current_user.get("role") not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin only")
    svc = EventService(session)
    event = svc.create_event(body.model_dump())
    return event
