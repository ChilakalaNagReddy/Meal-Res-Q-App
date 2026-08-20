from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List
from datetime import datetime
from app.database import get_db
from app.models import User, NGO, Donation, Pickup, Notification, Volunteer
from app.schemas import DonationOut, PickupOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/ngo", tags=["ngo"])

@router.get("/available", response_model=List[DonationOut])
@router.get("/available-donations", response_model=List[DonationOut])
def get_available_donations(db: Any = Depends(get_db)):
    donations = db.query(Donation).filter(Donation.status == 'available').order_by(Donation.created_at.desc()).all()

    result = []
    for d in donations:
        item = DonationOut.from_orm(d)
        if d.donor:
            item.donor_name = d.donor.name
            item.donor_phone = d.donor.phone
        if d.pickups and len(d.pickups) > 0:
            p = d.pickups[-1]
            if p.ngo and p.ngo.user:
                item.claimed_by_name = p.ngo.user.name
                item.claimed_by_phone = p.ngo.user.phone
                item.claimed_by_role = "NGO Partner"
            elif p.volunteer and p.volunteer.user:
                item.claimed_by_name = p.volunteer.user.name
                item.claimed_by_phone = p.volunteer.user.phone
                item.claimed_by_role = "Volunteer Driver"
            elif p.needer_id:
                needer_user = db.query(User).filter(User.id == p.needer_id).first()
                if needer_user:
                    item.claimed_by_name = needer_user.name
                    item.claimed_by_phone = needer_user.phone
                    item.claimed_by_role = "Community Member"
        result.append(item)
    return result



@router.post("/accept/{donation_id}", response_model=PickupOut)
def accept_donation(
    donation_id: int,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["ngo", "volunteer"]:
        raise HTTPException(status_code=403, detail="Only NGOs or Volunteers can claim food donations.")

    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation or donation.status != "available":
        raise HTTPException(status_code=400, detail="Donation is no longer available.")

    donation.status = "claimed"
    
    ngo_profile = db.query(NGO).filter(NGO.user_id == current_user.id).first() if current_user.role == "ngo" else None
    volunteer_profile = db.query(Volunteer).filter(Volunteer.user_id == current_user.id).first() if current_user.role == "volunteer" else None

    pickup = Pickup(
        donation_id=donation.id,
        ngo_id=ngo_profile.id if ngo_profile else None,
        volunteer_id=volunteer_profile.id if volunteer_profile else None,
        status="claimed"
    )
    db.add(pickup)
    db.commit()
    db.refresh(pickup)

    # Notify Donor
    notif = Notification(
        user_id=donation.donor_id,
        title="🎉 Food Claimed!",
        message=f"{current_user.name} claimed your donation '{donation.food_name}'."
    )
    db.add(notif)
    db.commit()

    return pickup

@router.get("/claimed", response_model=List[PickupOut])
def get_claimed_pickups(
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ngo_profile = db.query(NGO).filter(NGO.user_id == current_user.id).first()
    if not ngo_profile:
        return []

    pickups = db.query(Pickup).filter(Pickup.ngo_id == ngo_profile.id).order_by(Pickup.claimed_at.desc()).all()
    return pickups
