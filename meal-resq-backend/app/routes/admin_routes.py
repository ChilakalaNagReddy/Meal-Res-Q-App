from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models import User, Donation, Pickup, NGO, Volunteer
from app.schemas import UserOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

@router.get("/stats")
def get_system_stats(
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_donations = db.query(Donation).count()
    completed = db.query(Donation).filter(Donation.status.in_(["completed", "delivered"])).count()
    total_users = db.query(User).count()
    total_ngos = db.query(NGO).count()
    total_volunteers = db.query(Volunteer).count()
    total_needers = db.query(User).filter(User.role == "needer").count()
    active_pickups = db.query(Pickup).filter(Pickup.status.in_(["claimed", "en_route"])).count()

    # Calculate rescued meals & waste metrics
    total_meals_saved = completed * 75  # ~75 meals per rescue batch
    waste_reduced_kg = round(completed * 25.0, 1)  # ~25 kg per rescue batch

    return {
        "total_donations": total_donations,
        "total_meals_saved": total_meals_saved,
        "food_waste_reduced_kg": waste_reduced_kg,
        "total_users": total_users,
        "total_ngos": total_ngos,
        "total_volunteers": total_volunteers,
        "total_needers": total_needers,
        "active_pickups": active_pickups,
    }

@router.get("/users", response_model=List[UserOut])
def get_all_users(
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users
