from app.database import SessionLocal, engine, Base
from app.models import User, NGO, Volunteer, Donation, Notification
from app.auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if users exist
        if db.query(User).first():
            print("Database already seeded!")
            return

        # 1. Create Donor
        donor = User(
            name="Green Valley Restaurant",
            username="donor123",
            email="donor123@gmail.com",
            password_hash=get_password_hash("password123"),
            phone="+91 9876543210",
            address="MG Road, Bengaluru, Karnataka",
            role="donor",
            is_active=True
        )
        db.add(donor)

        # 2. Create NGO
        ngo_user = User(
            name="Hope Shelter Foundation",
            username="ngo123",
            email="ngo123@gmail.com",
            password_hash=get_password_hash("password123"),
            phone="+91 9876543211",
            address="Indiranagar, Bengaluru, Karnataka",
            role="ngo",
            is_active=True
        )
        db.add(ngo_user)
        db.commit()
        db.refresh(ngo_user)

        ngo = NGO(user_id=ngo_user.id, ngo_name=ngo_user.name, contact_email=ngo_user.email, verified=True)
        db.add(ngo)

        # 3. Create Volunteer
        vol_user = User(
            name="Rahul Sharma",
            username="vol123",
            email="vol123@gmail.com",
            password_hash=get_password_hash("password123"),
            phone="+91 9876543212",
            address="Koramangala, Bengaluru, Karnataka",
            role="volunteer",
            is_active=True
        )
        db.add(vol_user)
        db.commit()
        db.refresh(vol_user)

        vol = Volunteer(user_id=vol_user.id, name=vol_user.name, is_available=True)
        db.add(vol)

        # 4. Create Person in Need
        needer_user = User(
            name="Community Care Center",
            username="needer123",
            email="needer123@gmail.com",
            password_hash=get_password_hash("password123"),
            phone="+91 9876543213",
            address="Whitefield, Bengaluru, Karnataka",
            role="needer",
            is_active=True
        )
        db.add(needer_user)

        # 5. Create System Admin
        admin_user = User(
            name="System Administrator",
            username="admin123",
            email="admin123@gmail.com",
            password_hash=get_password_hash("password123"),
            phone="+91 9876543214",
            address="CBD Central, Bengaluru, Karnataka",
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()

        print("Database seeded successfully with default roles!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
