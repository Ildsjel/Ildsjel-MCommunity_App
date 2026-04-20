from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.jwt_handler import get_current_user
from app.db.neo4j_driver import get_neo4j_session
from app.services.message_service import MessageService
from app.services.friend_service import FriendService

router = APIRouter(prefix="/messages", tags=["Messages"])


class SendMessageBody(BaseModel):
    text: str


@router.post("/conversations/start/{friend_id}", status_code=201)
async def start_conversation(
    friend_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    if friend_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    status = FriendService(session).get_status(current_user["id"], friend_id)
    if status != "accepted":
        raise HTTPException(status_code=403, detail="Must be friends to message")
    conv = MessageService(session).get_or_create_conversation(current_user["id"], friend_id)
    return conv


@router.get("/conversations")
async def list_conversations(
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    convs = MessageService(session).list_conversations(current_user["id"])
    return convs


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    svc = MessageService(session)
    conv = svc.get_conversation(conversation_id, current_user["id"])
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    svc = MessageService(session)
    if not svc.get_conversation(conversation_id, current_user["id"]):
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = svc.get_messages(conversation_id, skip, limit)
    total = svc.count_messages(conversation_id)
    return {"messages": messages, "total": total}


@router.post("/conversations/{conversation_id}/send", status_code=201)
async def send_message(
    conversation_id: str,
    body: SendMessageBody,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Message too long")
    svc = MessageService(session)
    if not svc.get_conversation(conversation_id, current_user["id"]):
        raise HTTPException(status_code=404, detail="Conversation not found")
    msg = svc.send_message(conversation_id, current_user["id"], text)
    return msg


@router.post("/conversations/{conversation_id}/read", status_code=204)
async def mark_read(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    session=Depends(get_neo4j_session),
):
    svc = MessageService(session)
    if not svc.get_conversation(conversation_id, current_user["id"]):
        raise HTTPException(status_code=404, detail="Conversation not found")
    svc.mark_read(conversation_id, current_user["id"])
