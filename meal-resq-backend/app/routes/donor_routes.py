from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List
from app.database import get_db
from app.models import User, Donation, Notification
from app.schemas import DonationCreate, DonationUpdate, DonationOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/donor", tags=["donor"])

from app.utils import cleanup_expired_donations
from datetime import datetime

@router.post("/donations", response_model=DonationOut)
def create_donation(
    donation_in: DonationCreate,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cleanup_expired_donations(db)

    effective_user = current_user
    if donation_in.donor_email:
        email_clean = donation_in.donor_email.strip().lower()
        matched_user = db.query(User).filter(User.email == email_clean).first()
        if matched_user:
            effective_user = matched_user

    donation = Donation(
        donor_id=effective_user.id,
        food_name=donation_in.food_name,
        quantity=donation_in.quantity,
        category=donation_in.category,
        expiry_time=donation_in.expiry_time,
        pickup_address=donation_in.pickup_address,
        description=donation_in.description,
        food_image=donation_in.food_image,
        status="available",
        created_at=datetime.now()
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    # Notify Donor of successful post
    donor_notif = Notification(
        user_id=effective_user.id,
        title="✅ Donation Posted Successfully",
        message=f"Your surplus food listing for '{donation.food_name}' ({donation.quantity}) was successfully posted and is now live for claim."
    )
    db.add(donor_notif)

    # Notify NGOs, Volunteers, and Needers about new food listing
    receivers = db.query(User).filter(User.role.in_(["ngo", "volunteer", "needer"])).all()
    for user in receivers:
        if user.id != effective_user.id:
            notif = Notification(
                user_id=user.id,
                title=f"🍲 New Surplus Food: {donation.food_name}",
                message=f"{effective_user.name} posted {donation.quantity} of {donation.food_name} at {donation.pickup_address}. Available now for claim!"
            )
            db.add(notif)
    db.commit()

    donation_dict = DonationOut.model_validate(donation)
    donation_dict.donor_name = effective_user.name
    donation_dict.donor_phone = effective_user.phone
    donation_dict.donor_email = effective_user.email
    return donation_dict

@router.get("/donations", response_model=List[DonationOut])
def get_donor_donations(
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cleanup_expired_donations(db)

    user_ids = [current_user.id]
    if current_user.email:
        same_email_users = db.query(User.id).filter(User.email == current_user.email.strip().lower()).all()
        user_ids = list(set([u[0] for u in same_email_users] + [current_user.id]))

    donations = db.query(Donation).filter(Donation.donor_id.in_(user_ids)).order_by(Donation.created_at.desc()).all()
    result = []
    for d in donations:
        item = DonationOut.model_validate(d)
        if d.donor:
            item.donor_name = d.donor.name
            item.donor_phone = d.donor.phone
            item.donor_email = d.donor.email
        else:
            item.donor_name = current_user.name
            item.donor_phone = current_user.phone
            item.donor_email = current_user.email

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



@router.put("/donations/{donation_id}", response_model=DonationOut)
def update_donation(
    donation_id: int,
    donation_in: DonationUpdate,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    donation = db.query(Donation).filter(Donation.id == donation_id, Donation.donor_id == current_user.id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found or unauthorized.")
    
    if donation_in.food_name is not None:
        donation.food_name = donation_in.food_name
    if donation_in.quantity is not None:
        donation.quantity = donation_in.quantity
    if donation_in.category is not None:
        donation.category = donation_in.category
    if donation_in.expiry_time is not None:
        donation.expiry_time = donation_in.expiry_time
    if donation_in.pickup_address is not None:
        donation.pickup_address = donation_in.pickup_address
    if donation_in.description is not None:
        donation.description = donation_in.description
    if donation_in.food_image is not None:
        donation.food_image = donation_in.food_image

    db.commit()
    db.refresh(donation)

    item = DonationOut.model_validate(donation)
    item.donor_name = current_user.name
    item.donor_phone = current_user.phone
    item.donor_email = current_user.email
    return item

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
