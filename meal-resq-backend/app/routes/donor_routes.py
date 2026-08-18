from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List
from app.database import get_db
from app.models import User, Donation, Notification
from app.schemas import DonationCreate, DonationOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/donor", tags=["donor"])

@router.post("/donations", response_model=DonationOut)
def create_donation(
    donation_in: DonationCreate,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Allow donation creation under current user session


    donation = Donation(
        donor_id=current_user.id,
        food_name=donation_in.food_name,
        quantity=donation_in.quantity,
        category=donation_in.category,
        expiry_time=donation_in.expiry_time,
        pickup_address=donation_in.pickup_address,
        description=donation_in.description,
        food_image=donation_in.food_image,
        status="available"
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    # Notify NGOs and Needers about new food listing
    ngos = db.query(User).filter(User.role.in_(["ngo", "needer"])).all()
    for user in ngos:
        notif = Notification(
            user_id=user.id,
            title="🍲 New Food Available!",
            message=f"{current_user.name} posted {donation.food_name} ({donation.quantity}) at {donation.pickup_address}."
        )
        db.add(notif)
    db.commit()

    donation_dict = DonationOut.from_orm(donation)
    donation_dict.donor_name = current_user.name
    donation_dict.donor_phone = current_user.phone
    return donation_dict

@router.get("/donations", response_model=List[DonationOut])
def get_donor_donations(
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    donations = db.query(Donation).order_by(Donation.created_at.desc()).all()
    result = []
    for d in donations:
        item = DonationOut.from_orm(d)
        if d.donor:
            item.donor_name = d.donor.name
            item.donor_phone = d.donor.phone
        else:
            item.donor_name = current_user.name
            item.donor_phone = current_user.phone
        result.append(item)
    return result


@router.delete("/donations/{donation_id}")
def delete_donation(
    donation_id: int,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    donation = db.query(Donation).filter(Donation.id == donation_id, Donation.donor_id == current_user.id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found.")
    db.delete(donation)
    db.commit()
    return {"success": True, "message": "Donation deleted successfully."}
