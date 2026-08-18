from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, List
from datetime import datetime
from app.database import get_db
from app.models import User, Donation, Pickup, FoodRequest, Notification
from app.schemas import DonationOut, PickupOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/needer", tags=["needer"])

@router.get("/available-food", response_model=List[DonationOut])
def get_available_food_for_needer(db: Any = Depends(get_db)):
    donations = db.query(Donation).filter(Donation.status == "available").order_by(Donation.created_at.desc()).all()
    result = []
    for d in donations:
        item = DonationOut.from_orm(d)
        if d.donor:
            item.donor_name = d.donor.name
            item.donor_phone = d.donor.phone
        result.append(item)
    return result

@router.post("/reserve/{donation_id}", response_model=PickupOut)
def reserve_food(
    donation_id: int,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation or donation.status != "available":
        raise HTTPException(status_code=400, detail="Food item is no longer available.")

    donation.status = "claimed"
    
    pickup = Pickup(
        donation_id=donation.id,
        needer_id=current_user.id,
        status="claimed"
    )
    db.add(pickup)

    # Notify donor
    notif = Notification(
        user_id=donation.donor_id,
        title="🤝 Meal Reserved!",
        message=f"{current_user.name} reserved your meal '{donation.food_name}'."
    )
    db.add(notif)
    db.commit()
    db.refresh(pickup)
    return pickup

@router.get("/reservations", response_model=List[PickupOut])
def get_my_reservations(
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pickups = db.query(Pickup).filter(Pickup.needer_id == current_user.id).order_by(Pickup.claimed_at.desc()).all()
    return pickups
