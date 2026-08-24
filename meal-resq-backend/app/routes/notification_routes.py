from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any, List
from app.database import get_db
from app.models import User, Notification
from app.schemas import NotificationOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

@router.get("", response_model=List[NotificationOut])
def get_user_notifications(
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        return []
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    return notifications

@router.put("/read-all")
def mark_all_read(
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False
    ).update({"read": True})
    db.commit()
    return {"success": True, "message": "All notifications marked as read."}

@router.delete("/clear-all")
def clear_all_notifications(
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete()
    db.commit()
    return {"success": True, "message": "All notifications cleared."}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        db.delete(notif)
        db.commit()
    return {"success": True, "message": "Notification deleted."}
