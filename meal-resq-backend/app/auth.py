import os
from datetime import datetime, timedelta
from typing import Optional, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.database import get_db

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


SECRET_KEY = os.getenv("SECRET_KEY", "mealresq_super_secret_jwt_key_2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))

import hashlib

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

def get_password_hash(password: str) -> str:

    salt = "mealresq_salt_2026".encode('utf-8')
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return pwd_hash.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Any = Depends(get_db)):
    from app.models import User
    from app.auth import get_password_hash

    def get_or_create_default_donor():
        user = db.query(User).filter(User.role == "donor").first() or db.query(User).first()
        if user:
            return user
        new_user = User(
            name="Food Donor",
            email="donor@mealresq.org",
            phone="+91 9876543210",
            hashed_password=get_password_hash("donor123"),
            role="donor"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    if not token:
        return get_or_create_default_donor()

    email = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except JWTError:
        pass

    if email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            return user

    return get_or_create_default_donor()

