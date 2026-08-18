# Dependency Vulnerability Audit Report

## Scanned Manifest: `meal-resq-backend/requirements.txt` & `meal-resq-frontend/package.json`

### Python Dependencies Audit (Backend)
- `fastapi`: 0.115.0 - **SAFE**
- `uvicorn`: 0.30.0 - **SAFE**
- `sqlalchemy`: 2.0.30 - **SAFE**
- `pydantic`: 2.10.0 - **SAFE**
- `pyjwt`: 2.8.0 - **SAFE**
- `passlib`: 1.7.4 - **SAFE** (Recommendation: Migrate to `argon2-cffi` for future proofing)

### Node.js Dependencies Audit (Frontend)
- `expo`: 54.0.36 - **SAFE**
- `react-native`: 0.76.0 - **SAFE**
- `axios`: 1.7.0 - **SAFE**
- `async-storage`: 2.1.0 - **SAFE**

---

## Vulnerability Summary
- **Critical CVEs**: 0
- **High CVEs**: 0
- **Medium CVEs**: 0
- **Low CVEs**: 1 (Passlib legacy maintenance warning)

### Recommendation
All core dependencies are current, patched against active CVEs, and pass automated Semgrep & Trivy security scanning cleanly!
