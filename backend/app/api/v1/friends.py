from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth.jwt_handler import get_current_user
from app.db.neo4j_driver import get_neo4j_session
from app.services.friend_service import FriendService

router = APIRouter(prefix="/friends", tags=["Friends"])


class RespondBody(BaseModel):
    action: str  # 'accept' | 'decline'


@router.get("/status/{other_id}")
async def friendship_status(
    other_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    status = FriendService(session).get_status(current_user["id"], other_id)
    return {"status": status}


@router.post("/request/{target_id}", status_code=201)
async def send_request(
    target_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    if target_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot send a request to yourself")
    ok = FriendService(session).send_request(current_user["id"], target_id)
    if not ok:
        raise HTTPException(status_code=409, detail="Friend request already exists")
    return {"message": "Friend request sent"}


@router.post("/respond/{requester_id}")
async def respond_to_request(
    requester_id: str,
    body: RespondBody,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    svc = FriendService(session)
    if body.action == "accept":
        ok = svc.accept_request(requester_id, current_user["id"])
        if not ok:
            raise HTTPException(status_code=404, detail="Pending request not found")
        return {"message": "Friend request accepted"}
    elif body.action == "decline":
        ok = svc.decline_request(requester_id, current_user["id"])
        if not ok:
            raise HTTPException(status_code=404, detail="Pending request not found")
        return {"message": "Friend request declined"}
    else:
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'decline'")


@router.delete("/request/{other_id}", status_code=204)
async def cancel_request(
    other_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    ok = FriendService(session).cancel_request(current_user["id"], other_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Pending request not found")


@router.delete("/{friend_id}", status_code=204)
async def unfriend(
    friend_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    ok = FriendService(session).unfriend(current_user["id"], friend_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Friendship not found")


@router.get("/")
async def list_friends(
    skip: int = 0,
    limit: int = 25,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    svc = FriendService(session)
    friends = svc.list_friends(current_user["id"], skip, limit)
    total = svc.count_friends(current_user["id"])
    return {"friends": friends, "total": total}


@router.get("/preview")
async def list_friends_preview(
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    """Top 3 friends for profile widget, ordered by most recently friended."""
    friends = FriendService(session).list_friends(current_user["id"], skip=0, limit=3)
    return friends


@router.get("/of/{user_id}")
async def list_user_friends_preview(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    """Top 3 friends of another user — for profile preview."""
    friends = FriendService(session).list_user_friends_preview(user_id, limit=3)
    return friends


@router.get("/globe")
async def friends_globe(
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    from app.api.v1.globe import _resolve_coords
    result = session.run(
        """
        MATCH (me:User {id: $my_id})-[:FRIEND_REQUEST {status: 'accepted'}]-(friend:User)
        WHERE friend.city IS NOT NULL AND friend.city_visible <> 'hidden'
        RETURN friend.id AS id, friend.handle AS handle,
               friend.city AS city, friend.country AS country
        """,
        my_id=current_user["id"],
    )
    markers = []
    for r in result:
        coords = _resolve_coords(r["city"])
        if coords:
            markers.append({
                "id": r["id"],
                "handle": r["handle"],
                "city": r["city"],
                "country": r["country"] or "",
                "lat": coords["lat"],
                "lon": coords["lon"],
            })
    return markers


@router.get("/pending")
async def list_pending(
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    pending = FriendService(session).list_pending_received(current_user["id"])
    return pending
