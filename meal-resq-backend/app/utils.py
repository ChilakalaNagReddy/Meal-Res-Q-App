import re
import math

def validate_phone(phone: str) -> bool:
    """Phone must be exactly 10 digits prefixed with +91 or raw 10 digits."""
    clean = re.sub(r'[^0-9]', '', phone or '')
    if clean.startswith('91') and len(clean) == 12:
        clean = clean[2:]
    return len(clean) == 10

def validate_email(email: str) -> bool:
    """Email must end with .com and follow standard email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$'
    return bool(re.match(pattern, (email or '').strip()))

def validate_password(password: str) -> bool:
    """Password must be at least 6 characters with letters and numbers."""
    if not password or len(password) < 6:
        return False
    has_letter = bool(re.search(r'[a-zA-Z]', password))
    has_digit = bool(re.search(r'[0-9]', password))
    return has_letter and has_digit

def calculate_distance_km(lat1, lon1, lat2, lon2):
    """Haversine formula for distance calculation in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

from datetime import datetime, timedelta
from sqlalchemy.orm import Session

def cleanup_expired_donations(db: Session):
    try:
        from app.models import Donation, Pickup, FoodRequest
        cutoff = datetime.now() - timedelta(hours=24)
        expired_donations = db.query(Donation).filter(Donation.created_at < cutoff).all()
        if expired_donations:
            expired_ids = [d.id for d in expired_donations]
            db.query(Pickup).filter(Pickup.donation_id.in_(expired_ids)).delete(synchronize_session=False)
            db.query(FoodRequest).filter(FoodRequest.donation_id.in_(expired_ids)).delete(synchronize_session=False)
            db.query(Donation).filter(Donation.id.in_(expired_ids)).delete(synchronize_session=False)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Cleanup expired donations note: {e}")
