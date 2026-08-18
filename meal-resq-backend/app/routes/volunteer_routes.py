from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, List
from datetime import datetime
from app.database import get_db
from app.models import User, Volunteer, Pickup, Donation, Notification
from app.schemas import PickupOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/volunteer", tags=["volunteer"])

@router.get("/pickups", response_model=List[PickupOut])
def get_volunteer_pickups(
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vol_profile = db.query(Volunteer).filter(Volunteer.user_id == current_user.id).first()
    if not vol_profile:
        # Return all active claimed pickups available for volunteers to deliver
        pickups = db.query(Pickup).filter(Pickup.status.in_(["claimed", "en_route"])).order_by(Pickup.claimed_at.desc()).all()
        return pickups

    pickups = db.query(Pickup).filter(
        (Pickup.volunteer_id == vol_profile.id) | (Pickup.status.in_(["claimed", "en_route"]))
    ).order_by(Pickup.claimed_at.desc()).all()
    return pickups

@router.put("/pickups/{pickup_id}/status", response_model=PickupOut)
def update_pickup_status(
    pickup_id: int,
    status_str: str,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pickup = db.query(Pickup).filter(Pickup.id == pickup_id).first()
    if not pickup:
        raise HTTPException(status_code=404, detail="Pickup record not found.")

    valid_statuses = ["claimed", "en_route", "completed", "delivered", "cancelled"]
    if status_str not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid pickup status.")

    pickup.status = status_str
    if donation := db.query(Donation).filter(Donation.id == pickup.donation_id).first():
        donation.status = status_str

    if status_str in ["completed", "delivered"]:
        pickup.completed_at = datetime.utcnow()
        # Send delivery notification to donor
        if donation and donation.donor_id:
            notif = Notification(
                user_id=donation.donor_id,
                title="🚚 Food Delivered!",
                message=f"Your donation '{donation.food_name}' was successfully rescued and delivered!"
            )
            db.add(notif)

    db.commit()
    db.refresh(pickup)
    return pickup
