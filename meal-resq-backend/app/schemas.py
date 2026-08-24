from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None

class UserCreate(UserBase):
    username: Optional[str] = None
    password: str
    role: str = "donor"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_image: Optional[str] = None

class UserLogin(BaseModel):
    login_id: str
    password: str
    role: Optional[str] = None

class VerifyPasswordPayload(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None

class ForgotPasswordOTP(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class SendEmailOTP(BaseModel):
    email: EmailStr
    otp: Optional[str] = None


class VerifyEmailOTP(BaseModel):
    email: EmailStr
    otp: str

class GoogleAuthPayload(BaseModel):
    id_token: Optional[str] = None
    access_token: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = "donor"
    is_signup: Optional[bool] = False

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    name: str
    username: Optional[str] = None
    email: str
    role: str
    phone: Optional[str] = None
    address: Optional[str] = None
    is_first_time: Optional[bool] = False

class UserOut(UserBase):
    id: int
    username: str
    role: str
    profile_image: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class DonationCreate(BaseModel):
    food_name: str
    quantity: str
    category: str = "Cooked Meals"
    expiry_time: str = "Within 4 Hours"
    pickup_address: str
    description: Optional[str] = None
    food_image: Optional[str] = None
    donor_email: Optional[str] = None

class DonationUpdate(BaseModel):
    food_name: Optional[str] = None
    quantity: Optional[str] = None
    category: Optional[str] = None
    expiry_time: Optional[str] = None
    pickup_address: Optional[str] = None
    description: Optional[str] = None
    food_image: Optional[str] = None

class DonationOut(BaseModel):
    id: int
    donor_id: int
    food_name: str
    quantity: str
    category: str
    expiry_time: str
    pickup_address: str
    description: Optional[str] = None
    food_image: Optional[str] = None
    status: str
    created_at: datetime
    donor_name: Optional[str] = None
    donor_phone: Optional[str] = None
    donor_email: Optional[str] = None
    claimed_by_name: Optional[str] = None
    claimed_by_phone: Optional[str] = None
    claimed_by_role: Optional[str] = None

    class Config:
        from_attributes = True


class FoodRequestCreate(BaseModel):
    donation_id: int

class PickupOut(BaseModel):
    id: int
    donation_id: int
    status: str
    claimed_at: datetime
    completed_at: Optional[datetime] = None
    donation: Optional[DonationOut] = None

    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    receiver_id: int
    message: str

class ChatMessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True
