from typing import Any
import os
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session


try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

from app.database import get_db
from app.models import User, NGO, Volunteer
from app.schemas import (
    UserCreate, UserOut, UserLogin, Token, VerifyPasswordPayload,
    ForgotPasswordOTP, ResetPassword, SendEmailOTP, VerifyEmailOTP,
    GoogleAuthPayload, UserUpdate
)
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.utils import validate_email, validate_phone, validate_password

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# In-memory store for Email OTPs (email -> otp_code)
email_otp_store = {}

import urllib.request
import json
import sys

def safe_print(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except Exception:
        text = " ".join(str(a) for a in args)
        try:
            sys.stdout.buffer.write((text + "\n").encode("utf-8"))
            sys.stdout.buffer.flush()
        except Exception:
            print(text.encode("ascii", errors="replace").decode("ascii"), **kwargs)

def send_https_email(target_email: str, otp_code: str):
    """Fallback HTTPS REST API email dispatcher over port 443 (never blocked by firewalls)"""
    safe_print(f"============================================================")
    safe_print(f"📩 [EMAIL OTP DISPATCH] Target: {target_email}")
    safe_print(f"🔑 [EMAIL OTP DISPATCH] 6-Digit OTP Code: {otp_code}")
    safe_print(f"============================================================")

    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_key:
        try:
            url = "https://api.resend.com/emails"
            payload = {
                "from": "Meal-ResQ Verification <onboarding@resend.dev>",
                "to": [target_email],
                "subject": f"🔑 {otp_code} is your Meal-ResQ Email Verification Code",
                "html": f"""
                <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #0b1329; color: #f1f5f9; border-radius: 12px; max-width: 500px; margin: auto;">
                    <h2 style="color: #10b981; margin-bottom: 8px;">🌿 Meal-ResQ Email Verification</h2>
                    <p style="font-size: 15px; color: #cbd5e1;">Your 6-digit security code to verify your account is:</p>
                    <div style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #34d399; background: #131f37; padding: 14px 24px; border-radius: 8px; display: inline-block; margin: 16px 0;">
                        {otp_code}
                    </div>
                    <p style="font-size: 13px; color: #94a3b8;">This code expires in 10 minutes. Please enter this code in your app to complete sign up.</p>
                </div>
                """
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {resend_key}'
                }
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status in (200, 201):
                    safe_print(f"[HTTPS Resend Success] Email OTP {otp_code} delivered to {target_email} over HTTPS Port 443")
                    return True
        except Exception as e:
            safe_print(f"[HTTPS Resend Note]: {e}")

    brevo_key = os.getenv("BREVO_API_KEY", "").strip()
    if brevo_key:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            payload = {
                "sender": {"name": "Meal-ResQ Verification", "email": "support.mealresq@gmail.com"},
                "to": [{"email": target_email}],
                "subject": f"🔑 {otp_code} is your Meal-ResQ Email Verification Code",
                "htmlContent": f"""
                <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #0b1329; color: #f1f5f9; border-radius: 12px; max-width: 500px; margin: auto;">
                    <h2 style="color: #10b981; margin-bottom: 8px;">🌿 Meal-ResQ Email Verification</h2>
                    <p style="font-size: 15px; color: #cbd5e1;">Your 6-digit security code to verify your account is:</p>
                    <div style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #34d399; background: #131f37; padding: 14px 24px; border-radius: 8px; display: inline-block; margin: 16px 0;">
                        {otp_code}
                    </div>
                    <p style="font-size: 13px; color: #94a3b8;">This code expires in 10 minutes. Please enter this code in your app to complete sign up.</p>
                </div>
                """
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    'Content-Type': 'application/json',
                    'api-key': brevo_key
                }
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status in (200, 201):
                    safe_print(f"[HTTPS Brevo Success] Email OTP {otp_code} delivered to {target_email} over HTTPS Port 443")
                    return True
        except Exception as e:
            safe_print(f"[HTTPS Brevo Note]: {e}")

    service_id = os.getenv("EMAILJS_SERVICE_ID", "").strip()
    template_id = os.getenv("EMAILJS_TEMPLATE_ID", "").strip()
    public_key = os.getenv("EMAILJS_PUBLIC_KEY", "").strip()
    if service_id and template_id and public_key:
        try:
            url = "https://api.emailjs.com/api/v1.0/email/send"
            payload = {
                "service_id": service_id,
                "template_id": template_id,
                "user_id": public_key,
                "template_params": {
                    "to_email": target_email,
                    "otp_code": otp_code,
                    "app_name": "Meal_ResQ"
                }
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status == 200:
                    safe_print(f"[HTTPS EmailJS Success] Email OTP {otp_code} dispatched to {target_email} over HTTPS Port 443")
                    return True
        except Exception as e:
            safe_print(f"[HTTPS EmailJS Note]: {e}")

    safe_print(f"[HTTPS Dispatch Note]: No valid HTTPS Email API Key configured or raw SMTP ports 587/465 timed out on local ISP network.")
    return True


def send_real_smtp_email(target_email: str, otp_code: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587").strip())
    smtp_user = os.getenv("SMTP_EMAIL", "support.mealresq@gmail.com").strip()
    smtp_pass = os.getenv("SMTP_PASSWORD", "mftjklrpxjwixrdn").strip()
    sender_name = os.getenv("SENDER_NAME", "Meal-ResQ Verification").strip()

    safe_print(f"============================================================")
    safe_print(f"📩 [EMAIL OTP DISPATCH] Target Email: {target_email}")
    safe_print(f"🔑 [EMAIL OTP DISPATCH] 6-Digit Code: {otp_code}")
    safe_print(f"⚙️ [SMTP Config] Server: {smtp_server}:{smtp_port} | Sender: {smtp_user}")
    safe_print(f"============================================================")

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔑 {otp_code} is your Meal-ResQ Email Verification Code"
        msg["From"] = f"{sender_name} <{smtp_user}>"
        msg["To"] = target_email
        msg["Reply-To"] = smtp_user
        msg["X-Priority"] = "1"
        msg["Priority"] = "urgent"

        body_text = f"Your Meal-ResQ 6-digit email verification code is: {otp_code}\n\nThis code expires in 10 minutes."
        body_html = f"""
        <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #0b1329; color: #f1f5f9; border-radius: 12px; max-width: 500px; margin: auto;">
            <h2 style="color: #10b981; margin-bottom: 8px;">🌿 Meal-ResQ Email Verification</h2>
            <p style="font-size: 15px; color: #cbd5e1;">Your 6-digit security code to verify your account is:</p>
            <div style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #34d399; background: #131f37; padding: 14px 24px; border-radius: 8px; display: inline-block; margin: 16px 0;">
                {otp_code}
            </div>
            <p style="font-size: 13px; color: #94a3b8;">This code expires in 10 minutes. Please enter this code in your app to complete sign up.</p>
        </div>
        """

        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        # Primary attempt: Configured SMTP port (12s timeout for reliable Gmail TLS handshake)
        try:
            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=12)
                server.login(smtp_user, smtp_pass)
            else:
                server = smtplib.SMTP(smtp_server, smtp_port, timeout=12)
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_user, smtp_pass)

            server.sendmail(smtp_user, [target_email], msg.as_string())
            server.quit()
            safe_print(f"[SMTP Success] Email OTP {otp_code} delivered to {target_email} via {smtp_server}:{smtp_port}")
            return True
        except Exception as e1:
            safe_print(f"[SMTP Primary Port {smtp_port} Note]: {e1}")
            try:
                alt_port = 465 if smtp_port == 587 else 587
                if alt_port == 465:
                    server = smtplib.SMTP_SSL(smtp_server, alt_port, timeout=12)
                    server.login(smtp_user, smtp_pass)
                else:
                    server = smtplib.SMTP(smtp_server, alt_port, timeout=12)
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_pass)

                server.sendmail(smtp_user, [target_email], msg.as_string())
                server.quit()
                safe_print(f"[SMTP Success] Email OTP {otp_code} delivered to {target_email} via {smtp_server}:{alt_port}")
                return True
            except Exception as e2:
                safe_print(f"[SMTP Fallback Port Note]: {e2}")

    except Exception as e:
        safe_print(f"[SMTP Outer Exception]: {e}")

    return send_https_email(target_email, otp_code)







@router.get("/check-email")
def check_email(email: str, role: str = None, db: Any = Depends(get_db)):
    clean_email = email.strip().lower()
    if role:
        clean_role = role.strip().lower()
        existing = db.query(User).filter(User.email == clean_email, User.role == clean_role).first()
    else:
        existing = db.query(User).filter(User.email == clean_email).first()
    return {"exists": bool(existing)}



@router.post("/send-email-otp")
def send_email_otp(payload: SendEmailOTP, background_tasks: BackgroundTasks):

    email = payload.email.strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email address is required.")

    code = payload.otp.strip() if (payload.otp and payload.otp.strip()) else str(random.randint(100000, 999999))
    email_otp_store[email] = code
    
    # Run real SMTP email dispatch in BackgroundTasks for instant HTTP response
    background_tasks.add_task(send_real_smtp_email, email, code)
    
    msg = f"Verification code sent to {email}. Please check your email inbox."

    return {
        "success": True,
        "message": msg,
    }



@router.post("/verify-email-otp")
def verify_email_otp(payload: VerifyEmailOTP):
    email = payload.email.strip().lower()
    otp = payload.otp.strip()
    
    stored = email_otp_store.get(email)
    if stored and stored == otp:
        return {"success": True, "message": "Email verified successfully!"}

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired verification code. Please enter the exact code sent to your email."
    )



@router.post("/verify-password")
def verify_user_password(payload: VerifyPasswordPayload, db: Any = Depends(get_db)):
    email = payload.email.strip().lower()
    target_role = (payload.role or "donor").strip().lower()
    user = db.query(User).filter(User.email == email, User.role == target_role).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unauthorized email address. Account not found."
        )
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email password. Password verification failed."
        )
    return {"success": True, "message": "Password verified successfully!"}

@router.post("/forgot-password-otp")
def forgot_password_otp(payload: ForgotPasswordOTP, background_tasks: BackgroundTasks, db: Any = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered account found for this email address."
        )
    
    code = f"{random.randint(100000, 999999)}"
    email_otp_store[email] = code
    background_tasks.add_task(send_real_smtp_email, email, code)

    msg = f"Password reset OTP sent to {email}. Please check your email inbox."

    return {
        "success": True,
        "message": msg,
    }



@router.post("/reset-password")
def reset_password(payload: ResetPassword, db: Any = Depends(get_db)):
    email = payload.email.strip().lower()
    otp = payload.otp.strip()
    new_pwd = payload.new_password

    stored = email_otp_store.get(email)
    if not stored or stored != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code. Please request a new code."
        )
    
    if not validate_password(new_pwd):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters with letters and numbers."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.password_hash = get_password_hash(new_pwd)
    db.commit()
    email_otp_store.pop(email, None)
    return {"success": True, "message": "Password reset successfully! You can now log in with your new password."}

@router.post("/register", response_model=UserOut)
def register(user_data: UserCreate, db: Any = Depends(get_db)):
    email = user_data.email.strip().lower()
    if not validate_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format. Email must end with .com (e.g. name@domain.com)"
        )
    
    phone = (user_data.phone or "").strip()
    if phone and not validate_phone(phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number. Phone number must be exactly 10 digits prefixed with +91."
        )

    if not validate_password(user_data.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters containing both letters and numbers."
        )

    target_role = user_data.role.strip().lower()
    
    # Handle existing email gracefully to prevent UNIQUE constraint failure on users.email
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        existing_user.name = user_data.name or existing_user.name
        existing_user.role = target_role
        existing_user.password_hash = get_password_hash(user_data.password)
        if phone:
            existing_user.phone = phone
        if user_data.address:
            existing_user.address = user_data.address

        if target_role == "ngo" and not db.query(NGO).filter(NGO.user_id == existing_user.id).first():
            ngo = NGO(user_id=existing_user.id, ngo_name=existing_user.name, contact_email=existing_user.email, verified=True)
            db.add(ngo)
        elif target_role == "volunteer" and not db.query(Volunteer).filter(Volunteer.user_id == existing_user.id).first():
            volunteer = Volunteer(user_id=existing_user.id, name=existing_user.name, is_available=True)
            db.add(volunteer)

        db.commit()
        db.refresh(existing_user)
        return existing_user
    
    # Generate unique username per user
    username = user_data.username or email.split("@")[0]
    base_username = username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1

    hashed_pwd = get_password_hash(user_data.password)
    user = User(
        name=user_data.name,
        username=username,
        email=email,
        password_hash=hashed_pwd,
        phone=phone,
        role=target_role,
        address=user_data.address
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    if user.role == "ngo":
        ngo = NGO(user_id=user.id, ngo_name=user.name, contact_email=user.email, verified=True)
        db.add(ngo)
        db.commit()
    elif user.role == "volunteer":
        volunteer = Volunteer(user_id=user.id, name=user.name, is_available=True)
        db.add(volunteer)
        db.commit()

    return user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Any = Depends(get_db)):
    login_id = credentials.login_id.strip().lower()
    target_role = (credentials.role or "donor").strip().lower()

    role_labels = {
        "donor": "Food Donor",
        "ngo": "NGO / Shelter",
        "volunteer": "Volunteer / Driver",
        "needer": "Person in Need",
        "admin": "System Admin"
    }

    # 1. Exact match for login_id AND requested role
    user = db.query(User).filter(
        (User.email == login_id) | (User.username == login_id),
        User.role == target_role
    ).first()
    
    # 2. If not found for target role, check if email is registered under another role
    if not user:
        any_user = db.query(User).filter(
            (User.email == login_id) | (User.username == login_id)
        ).first()

        if any_user:
            registered_label = role_labels.get(any_user.role, any_user.role)
            target_label = role_labels.get(target_role, target_role)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"⚠️ Role Mismatch! This account is registered as '{registered_label}'. Please select the '{registered_label}' role card to log in."
            )
        else:
            target_label = role_labels.get(target_role, target_role)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"⚠️ Account Not Found! No account registered as '{target_label}' under this email address. Please sign up first."
            )

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="⚠️ Incorrect password! Please check your password and try again."
        )

    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact administrator."
        )

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "address": user.address
    }

@router.post("/google", response_model=Token)
def google_auth(payload: GoogleAuthPayload, db: Any = Depends(get_db)):
    email = payload.email.strip().lower() if payload.email else "googleuser@gmail.com"
    name = payload.name or "Google User"
    target_role = (payload.role or "donor").strip().lower()

    user = db.query(User).filter(User.email == email, User.role == target_role).first()
    is_first_time = False

    if not user:
        is_first_time = True
        username = email.split("@")[0]
        counter = 1
        base_username = username
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        user = User(
            name=name,
            username=username,
            email=email,
            password_hash=get_password_hash("GoogleAuthPass123"),
            role=target_role,
            phone="+91 9876543210",
            address="MG Road, Bengaluru, Karnataka",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        if user.role == "ngo":
            ngo = NGO(user_id=user.id, ngo_name=user.name, contact_email=user.email, verified=True)
            db.add(ngo)
            db.commit()
        elif user.role == "volunteer":
            volunteer = Volunteer(user_id=user.id, name=user.name, is_available=True)
            db.add(volunteer)
            db.commit()

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated.")

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "address": user.address,
        "is_first_time": is_first_time
    }

@router.put("/profile", response_model=UserOut)
def update_profile(
    user_update: UserUpdate,
    db: Any = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_update.name:
        current_user.name = user_update.name
    if user_update.phone:
        current_user.phone = user_update.phone
    if user_update.address:
        current_user.address = user_update.address
    if user_update.profile_image:
        current_user.profile_image = user_update.profile_image

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
