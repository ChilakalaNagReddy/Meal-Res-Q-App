# 🌿 Meal-ResQ — Enterprise Food Rescue Application

> **Rescuing Food, Enriching Lives**  
> A real-time cross-platform ecosystem connecting **Food Donors**, **NGOs & Shelters**, **Volunteers**, and **People in Need**.

---

## 📁 Repository Directory Architecture

```text
Meal-Res-Q-App/
├── 📁 meal-resq-backend/            # 🐍 Python FastAPI Server & Database Engine
│   ├── 📁 app/                      # FastAPI REST Routes, Schemas & Models
│   │   ├── 📁 routes/               # Modular Endpoints (auth, donor, ngo, volunteer, needer)
│   │   ├── 📄 database.py           # SQLAlchemy Database Engine & Sessions
│   │   ├── 📄 models.py             # Database Models (Users, Donations, Pickups, Notifications)
│   │   └── 📄 schemas.py            # Pydantic Request/Response Validation Schemas
│   ├── 📄 inspect_db.py             # Database Inspection Tool
│   ├── 📄 seed.py                   # Database Initialization & Seeding Script
│   ├── 📄 meal_resq.db              # SQLite Database Single Source of Truth
│   └── 📄 requirements.txt          # Python Backend Dependencies
│
├── 📁 meal-resq-frontend/           # 📱 Web & Mobile Cross-Platform Application
│   ├── 📁 src/
│   │   ├── 📁 components/           # Reusable UI Components & Modals
│   │   ├── 📁 screens/              # Role Dashboards (donor, ngo, volunteer, needer, auth, admin)
│   │   ├── 📁 services/             # Real-Time API & Auth Services with 3s Polling Loop
│   │   └── 📁 utils/                # Constants, Theme Tokens & Network Resolvers
│   ├── 📄 App.js                    # Mobile Application Entry Point (Expo / React Native)
│   ├── 📄 index.html                # Web Application Entry Point (Vite / React Web)
│   ├── 📄 app.json                  # Expo Mobile Config
│   └── 📄 package.json              # Frontend Node Dependencies
│
├── 📁 test-suites/                  # 🧪 Enterprise Automation & Quality Assurance Suites
│   ├── 📁 selenium-web-e2e/         # 💻 Selenium Web E2E Test Cases (400+ Test Scenarios)
│   ├── 📁 appium-mobile-e2e/        # 📱 Appium Mobile E2E Test Cases (400+ Test Scenarios)
│   ├── 📁 api-load-testing/         # ⚡ Baseline Load Testing (100 Virtual Users)
│   ├── 📁 security-assessment-reports/ # 🛡️ DevSecOps SAST & DAST Security Reports
│   └── 📁 report-generators/        # 📊 Automated Excel Report Generators
│
└── 📁 .github/workflows/            # ⚙️ GitHub Actions CI/CD Pipeline
    ├── 📄 load-testing.yml          # ⚡ 1. Baseline Load Testing Suite
    ├── 📄 security-assessment.yml   # 🛡️ 2. Security Assessment Suite
    ├── 📄 appium-mobile-e2e.yml     # 📱 3. Appium Mobile E2E Testing Suite
    └── 📄 selenium-web-e2e.yml      # 💻 4. Selenium Web E2E Testing Suite
```

---

## ⚡ Quick Start Guide

### 1. Launch Backend API Server
```bash
cd meal-resq-backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Launch Mobile App & Web App
```bash
cd meal-resq-frontend
npm install
npx expo start
```
- **Web App**: Press `w` in terminal (or visit `http://localhost:8081`)
- **Mobile App**: Scan QR code using Expo Go app on iOS or Android

---

## 🔄 Real-Time Synchronization Architecture

- **Unified Account Engine**: Single login across Web & Mobile App for all registered roles.
- **Profile Synchronization**: Edits to user profile (name, phone, address) sync automatically across platforms.
- **Surplus Food & Claim Synchronization**: Real-time 3-second auto-polling loop keeps available food and claim status 100% matched between Web & Mobile App.
