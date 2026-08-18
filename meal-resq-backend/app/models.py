from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    role = Column(String(20), nullable=False, default="donor")  # donor, ngo, volunteer, needer, admin
    profile_image = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    donations = relationship("Donation", back_populates="donor")
    ngo_profile = relationship("NGO", back_populates="user", uselist=False)
    volunteer_profile = relationship("Volunteer", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")

class NGO(Base):
    __tablename__ = "ngos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ngo_name = Column(String(100), nullable=False)
    contact_email = Column(String(100), nullable=False)
    verified = Column(Boolean, default=True)

    user = relationship("User", back_populates="ngo_profile")
    requests = relationship("FoodRequest", back_populates="ngo")
    pickups = relationship("Pickup", back_populates="ngo")

class Volunteer(Base):
    __tablename__ = "volunteers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(100), nullable=False)
    is_available = Column(Boolean, default=True)

    user = relationship("User", back_populates="volunteer_profile")
    pickups = relationship("Pickup", back_populates="volunteer")

class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    donor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    food_name = Column(String(150), nullable=False)
    quantity = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False, default="Cooked Meals")
    expiry_time = Column(String(50), nullable=False, default="Within 4 Hours")
    pickup_address = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    food_image = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="available")  # available, claimed, en_route, completed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

    donor = relationship("User", back_populates="donations")
    pickups = relationship("Pickup", back_populates="donation")
    requests = relationship("FoodRequest", back_populates="donation")

class Pickup(Base):
    __tablename__ = "pickups"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey("donations.id"), nullable=False)
    ngo_id = Column(Integer, ForeignKey("ngos.id"), nullable=True)
    volunteer_id = Column(Integer, ForeignKey("volunteers.id"), nullable=True)
    needer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(30), nullable=False, default="claimed")  # claimed, en_route, completed, cancelled
    claimed_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    donation = relationship("Donation", back_populates="pickups")
    ngo = relationship("NGO", back_populates="pickups")
    volunteer = relationship("Volunteer", back_populates="pickups")

class FoodRequest(Base):
    __tablename__ = "food_requests"

    id = Column(Integer, primary_key=True, index=True)
    donation_id = Column(Integer, ForeignKey("donations.id"), nullable=False)
    ngo_id = Column(Integer, ForeignKey("ngos.id"), nullable=True)
    needer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(30), nullable=False, default="pending")  # pending, approved, rejected
    requested_at = Column(DateTime, default=datetime.utcnow)

    donation = relationship("Donation", back_populates="requests")
    ngo = relationship("NGO", back_populates="requests")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
