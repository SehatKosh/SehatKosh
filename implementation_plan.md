# SehatKosh — Complete Implementation Plan

> Generated: 2026-10-03 | Based on Plan.md + current repo state audit

---

## 📊 Current State Audit

| Area | Status | Notes |
|------|--------|-------|
| **Monorepo structure** | ✅ Done | Turborepo + pnpm workspaces, correct layout |
| **Doctor-web (Next.js)** | ⚠️ Partial | UI built with mock/static data — no API wiring |
| **Mobile app (Expo)** | ⚠️ Partial | Auth, intake, sessions screens exist, still mocked |
| **Backend (FastAPI)** | ❌ Not started | Only Dockerfile, requirements.txt, one s3.py file |
| **OCR / FHIR modules** | ❌ Missing | No interfaces, no mock adapters, no routes |
| **Plugin-based OCR** | ❌ Missing | Needs plugin registry architecture |
| **Docker Compose** | ⚠️ Partial | Compose file exists but no profiles, no .env.example |
| **CI/CD (GitHub Actions)** | ❌ Missing | No `.github/` directory at all |
| **Branch protection** | ⚠️ Partial | `main` has some protection, `dev` does not |
| **Makefile / setup scripts** | ❌ Missing | Only in node_modules (debug package), not project-level |
| **`.env.example`** | ❌ Missing | No env example file anywhere |
| **Git branching** | ⚠️ Messy | Active branches: `main`, `dev`, `ui`, `fixes` — needs cleanup |

---

## 🗺️ Implementation Phases

---

### Phase 0 — Git Hygiene & Governance
**Who does it:** You (GitHub web UI actions) + I create the files

#### 0.1 — Branch Protection (YOU do this on GitHub)
1. Go to **Settings → Branches → Add branch protection rule**
2. For **`main`**: Require PR + 1 review + passing CI status check
3. For **`dev`**: Same but 1 review is optional — require passing CI at minimum
4. Check **"Do not allow bypassing"** for both

#### 0.2 — Clean up stale branches (I can do this)
- Delete remote `fixes` and `ui` branches (they've been merged)
- Keep `main` and `dev` as the two permanent branches

#### 0.3 — PR + Issue Templates (I create these)
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`

---

### Phase 1 — Backend Foundation (Build from Scratch)
**All files created by me**

#### 1.1 — Backend App Structure
```
services/backend/
├── app/
│   ├── main.py                  ← FastAPI app entrypoint
│   ├── core/
│   │   ├── config.py            ← Pydantic settings (reads .env)
│   │   ├── dependencies.py      ← FastAPI DI factories
│   │   └── s3.py                ← (already exists)
│   ├── modules/
│   │   ├── ocr/
│   │   │   ├── interface.py     ← OCRProcessor Protocol
│   │   │   ├── adapters.py      ← MockOCRAdapter + PluginOCRAdapter
│   │   │   └── registry.py      ← Plugin registry (load by name from env)
│   │   └── fhir/
│   │       ├── interface.py     ← FHIRTransformer Protocol
│   │       └── adapters.py      ← MockFHIRAdapter + PluginFHIRAdapter
│   ├── api/
│   │   └── v1/
│   │       ├── router.py        ← Aggregates all routers
│   │       └── prescriptions.py ← POST /prescriptions/extract
│   └── models/
│       └── prescription.py      ← Pydantic response models
├── tests/
│   ├── conftest.py
│   ├── test_ocr.py
│   └── test_fhir.py
├── .env.example
├── requirements.txt             ← Add pytest, pytest-asyncio, httpx, flake8
└── Dockerfile
```

#### 1.2 — Plugin-Based OCR Architecture
The OCR adapter uses a **plugin registry**:
- `OCR_ENGINE=mock` → returns deterministic fake data (default, works with zero dependencies)
- `OCR_ENGINE=plugin:<module_path>` → dynamically imports a Python module by dotted path
- Any new model = new Python file dropped in `services/backend/plugins/` folder

This means future models are added by:
1. Dropping a Python file in `plugins/`
2. Changing one `.env` variable: `OCR_ENGINE=plugin:plugins.my_model.MyOCRAdapter`

#### 1.3 — Key API Endpoints (MVP)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/prescriptions/extract` | Upload image → OCR → FHIR |
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/ocr/engines` | List available OCR plugins |

---

### Phase 2 — One-Command Setup (Portability)
**All files created by me**

#### 2.1 — `.env.example` (root + backend)
```env
# Root .env.example
POSTGRES_USER=sehatkosh_admin
POSTGRES_PASSWORD=secure_password123
POSTGRES_DB=sehatkosh_db
NEO4J_USER=neo4j
NEO4J_PASSWORD=secure_neo4j_password

# Backend
OCR_ENGINE=mock
FHIR_PARSER=mock
VLM_API_ENDPOINT=
VLM_API_KEY=
AWS_ACCESS_KEY_ID=mock_key
AWS_SECRET_ACCESS_KEY=mock_secret
AWS_DEFAULT_REGION=ap-southeast-1
AWS_ENDPOINT_URL=http://localhost:4566
```

#### 2.2 — Docker Compose Profiles
Add profiles to `docker-compose.yml`:
- `--profile core` → only postgres + localstack (lightweight, for devs without heavy RAM)
- `--profile full` → everything including neo4j + backend container
- Default (no profile) → postgres + localstack only

#### 2.3 — Cross-Platform Setup Scripts
- `scripts/setup.sh` → for Linux/macOS CI and teammates on Mac
- `scripts/setup.ps1` → for Windows teammates (PowerShell)
- `Makefile` → at repo root (usable via Git Bash on Windows)

---

### Phase 3 — GitHub Actions CI/CD
**All files created by me**

#### 3.1 — CI Pipeline (`.github/workflows/ci.yml`)
Triggers on every PR to `dev` or `main`:
1. Frontend: `pnpm install` → `turbo run lint` → `pnpm --filter @sehatkosh/doctor-web build`
2. Backend: `pip install` → `flake8` → `pytest -v`

#### 3.2 — CD Pipeline (`.github/workflows/cd.yml`)
Triggers on merge to `main`:
- Deploy `apps/doctor-web` to Vercel via `vercel` CLI

#### Secrets YOU must add to GitHub (Settings → Secrets → Actions):
| Secret Name | How to get it |
|------------|---------------|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Run `vercel link` locally, then check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same `.vercel/project.json` file |

---

### Phase 4 — Frontend API Integration
**All files created/modified by me**

#### 4.1 — API Client Layer
Create `apps/doctor-web/lib/api-client.ts`:
- Typed fetch wrapper pointing to `NEXT_PUBLIC_API_URL`
- Falls back gracefully to mock data if `NEXT_PUBLIC_USE_MOCK=true`

#### 4.2 — Wire Up Key Components
Priority order based on FYP evaluation value:
1. `PatientTable.tsx` → `GET /api/v1/patients` (or mock data from `packages/mock-data`)
2. Prescription upload → `POST /api/v1/prescriptions/extract`
3. `VitalsAnalytics.tsx` → vitals endpoint
4. `SoapViewer.tsx` → SOAP notes endpoint

#### 4.3 — Environment Variables for Frontend
Add to `apps/doctor-web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK=true   # flip to false when backend is running
```

---

### Phase 5 — Test Suites
**All files created by me**

#### 5.1 — Backend Tests (pytest)
- `test_ocr.py` → test MockOCRAdapter returns correct shape
- `test_fhir.py` → test MockFHIRAdapter produces valid FHIR Bundle structure
- `test_prescriptions.py` → integration test of the full extract endpoint using `httpx.AsyncClient`

#### 5.2 — Frontend Tests
- TypeScript typecheck via `tsc --noEmit` (already has tsconfig)
- ESLint already configured

---

## 📋 Task Division

### 🤖 I CAN Do (Coding Agent)
- [ ] Create all backend Python files (`main.py`, `config.py`, `dependencies.py`, OCR/FHIR interfaces, adapters, plugin registry, API router, Pydantic models)
- [ ] Create `tests/` directory with all pytest tests
- [ ] Create `.env.example` files (root + backend)
- [ ] Update `docker-compose.yml` with Docker profiles
- [ ] Create `scripts/setup.sh` and `scripts/setup.ps1`
- [ ] Create root `Makefile`
- [ ] Create `.github/workflows/ci.yml` (CI pipeline)
- [ ] Create `.github/workflows/cd.yml` (CD to Vercel)
- [ ] Create `.github/PULL_REQUEST_TEMPLATE.md` and issue templates
- [ ] Update `requirements.txt` with test/lint dependencies
- [ ] Create `apps/doctor-web/lib/api-client.ts` typed API client
- [ ] Wire frontend components to real API (with mock fallback)
- [ ] Delete stale branches (`fixes`, `ui`) via git commands

### 🙋 YOU Must Do (Requires External Access / Accounts)
1. **GitHub Branch Protection** → Go to repo Settings → Branches and add protection rules for `main` and `dev`
2. **Vercel Setup** → Run `vercel link` locally in `apps/doctor-web/`, then copy `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` to GitHub Secrets
3. **GitHub Secrets** → Add the 3 Vercel secrets to Settings → Secrets → Actions in your GitHub repo
4. **Review PR Templates** → After I create them, merge them via a proper PR as the first usage
5. **Future OCR Models** → Writing the actual ML model code / API integration for live OCR (you or your team, as a plugin file)

---

## ⚡ Recommended Execution Order

```
Phase 0.3 (PR/Issue templates)      ← Day 1 (me)
Phase 1.1 + 1.2 + 1.3 (Backend)    ← Day 1-2 (me)
Phase 2 (Setup scripts + .env)      ← Day 2 (me)
Phase 3.1 (CI pipeline)             ← Day 2 (me)
YOU: Add branch protection + Vercel secrets ← Day 2-3
Phase 3.2 (CD pipeline)             ← Day 3 (me, after you add secrets)
Phase 4 (Frontend wiring)           ← Day 3-4 (me)
Phase 5 (Tests)                     ← Day 4 (me)
```

---

## 🔑 Key Evaluator Checkpoints (from Plan.md)

| Evaluator Question | Answer After Implementation |
|-------------------|----------------------------|
| "Does it work without internet/AI?" | ✅ Yes — flip `OCR_ENGINE=mock` |
| "Can I clone and run it?" | ✅ Yes — `.\scripts\setup.ps1` + `make dev` |
| "Did the team use proper PRs?" | ✅ Yes — CI enforces it |
| "Is there a live demo link?" | ✅ Yes — Vercel auto-deploy on merge to `main` |
| "Can you add new AI models?" | ✅ Yes — drop a plugin file, change one `.env` line |
