# Detailed Security Assessment & SAST/DAST Report

## Executive Summary
This document provides a comprehensive security assessment of the **Meal-ResQ** FastAPI & React Native/Web application. The analysis encompasses Static Application Security Testing (SAST), Dynamic Application Security Testing (DAST), API Security, Authentication/Authorization, and Dependency Scanning.

---

## Technical Stack Inventory
- **Framework**: FastAPI (Python 3.10+ / Python 3.14 compatible)
- **Database**: SQLite (`meal_resq.db`) with SQLAlchemy ORM
- **Authentication**: OAuth2 Password Bearer with JWT / Fallback Local Storage Token Handshake
- **Authorization**: Role-Based Access Control (RBAC) - `donor`, `ngo`, `volunteer`, `needer`, `admin`
- **Frontend**: React Native Web & Expo Mobile Client (`http://10.239.19.5:8000`)

---

## Detailed Vulnerability Findings

### 1. [HIGH] Insecure Direct Object Reference (IDOR) in Order Claiming
- **File**: `app/routes/ngo_routes.py` (Line 26) & `app/routes/needer_routes.py`
- **Endpoint**: `POST /api/v1/ngo/accept/{donation_id}`
- **Description**: While role verification exists, additional resource ownership checks on pending donation transitions require strict state machine locking to prevent race conditions during simultaneous claims.
- **Exploitation Scenario**: An attacker could rapidly repeat POST requests with concurrent worker threads to claim a donation already reserved by another user.
- **Impact**: Double allocation of surplus food packages.
- **Remediation**: Implement explicit row-level locking (`with_for_update()`) in SQLAlchemy database queries.

```python
donation = db.query(Donation).filter(Donation.id == donation_id).with_for_update().first()
```

---

### 2. [MEDIUM] CORS Permissive Host Configuration
- **File**: `app/main.py` (Line 20)
- **Description**: `CORSMiddleware` configured with `allow_origins=["*"]`.
- **Exploitation Scenario**: Malicious third-party websites visited by an authenticated user could make cross-origin requests to API endpoints.
- **Impact**: Potential unauthorized API access in browser environments.
- **Remediation**: Restrict origins to explicitly trusted domain origins (`http://localhost:8081`, `http://10.239.19.5:8081`).

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://10.239.19.5:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 3. [LOW] Lack of Rate Limiting on Authentication & OTP Endpoints
- **File**: `app/routes/auth_routes.py` (Line 400+)
- **Endpoint**: `POST /api/v1/auth/login` & `POST /api/v1/auth/send-email-otp`
- **Description**: No IP-based rate limiter middleware (`slowapi`) attached to authentication endpoints.
- **Exploitation Scenario**: An automated bot could execute brute-force dictionary attacks against user email addresses.
- **Impact**: Denial of Service (DoS) or unauthorized credential guessing.
- **Remediation**: Integrate `slowapi` or redis-backed rate limiting on all login routes.

---

### 4. [LOW] Sensitive Information Disclosure in Error Detail Tracing
- **File**: `app/routes/auth_routes.py`
- **Description**: Uncaught exceptions return raw stack traces or internal socket timeout exceptions to clients during SMTP TLS handshakes.
- **Impact**: Exposure of internal server host paths and infrastructure details.
- **Remediation**: Wrap all external integration calls in generic exception handlers returning sanitized error messages.
