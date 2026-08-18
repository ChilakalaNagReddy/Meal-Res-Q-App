from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, List
from app.database import get_db
from app.models import User, ChatMessage
from app.schemas import ChatMessageCreate, ChatMessageOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

@router.post("/messages", response_model=ChatMessageOut)
def send_chat_message(
    msg_in: ChatMessageCreate,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = ChatMessage(
        sender_id=current_user.id,
        receiver_id=msg_in.receiver_id,
        message=msg_in.message
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

@router.get("/messages/{other_user_id}", response_model=List[ChatMessageOut])
def get_chat_history(
    other_user_id: int,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    messages = db.query(ChatMessage).filter(
        ((ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == other_user_id)) |
        ((ChatMessage.sender_id == other_user_id) & (ChatMessage.receiver_id == current_user.id))
    ).order_by(ChatMessage.timestamp.asc()).all()
    return messages
