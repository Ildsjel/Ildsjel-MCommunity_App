from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
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
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    friends = FriendService(session).list_friends(current_user["id"])
    return friends


@router.get("/pending")
async def list_pending(
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    pending = FriendService(session).list_pending_received(current_user["id"])
    return pending
