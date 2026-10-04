# 🏥 SehatKosh (صحت کوش) — Integrated Healthcare Management Platform

SehatKosh is a modern, high-performance, modular healthcare platform built as a monorepo using **Turborepo** and **pnpm**. It integrates a **Doctor Web Portal**, a **Patient Mobile Application**, and a **Python FastAPI Backend** featuring pluggable OCR (prescription extraction), HL7 FHIR R4 transformation, and Wearable Telemetry processing.

---

## ⚡ Key Architecture Highlights

- **Monorepo Architecture**: Managed via **Turborepo** & **pnpm** workspaces for fast, cached builds and shared package linking (`@sehatkosh/types`, `@sehatkosh/mock-data`, `@sehatkosh/tailwind-config`).
- **Frontend Applications**:
  - **Doctor Web Portal**: Next.js 14 (App Router), Tailwind CSS, Radix UI, TanStack React Query.
  - **Patient Mobile App**: React Native (0.86), Expo SDK 57, Expo Router, NativeWind (Tailwind CSS).
- **Backend Service**:
  - **FastAPI Core**: Async Python 3.11+, Pydantic v2, PostgreSQL 16 (Relational DB), Neo4j 5 (Graph DB), LocalStack (S3 Object Storage).
- **Modular Plug-and-Play Engines**:
  - **OCR Engine**: Swappable prescription extraction engine with safety fallback protection (`mock` or `plugin:plugins.ocr...`).
  - **FHIR R4 Transformer**: Standardized HL7 FHIR R4 Bundle conversion for interoperability.
  - **Telemetry Parser**: Wearable & smartwatch health vitals normalization (`mock` or `plugin:plugins.telemetry...`).

---

## 📁 Repository Map

```text
SehatKosh/
├── apps/
│   ├── doctor-web/           # Doctor Web Portal (Next.js 14, Tailwind CSS, Radix UI)
│   └── mobile/               # Patient Mobile App (React Native, Expo SDK 57, NativeWind)
├── services/
│   └── backend/              # Core FastAPI backend (Python 3.11+, Pytest, AsyncPG, Pydantic)
│       ├── app/              # Application logic (API v1, Modules, Models, Core Dependencies)
│       ├── plugins/          # Teammate workspace for custom OCR & Telemetry plugins
│       └── tests/            # Automated Pytest suite (30/30 unit & integration tests)
├── packages/
│   ├── mock-data/            # Shared clinical mock datasets for dev & offline testing
│   ├── tailwind-config/      # Shared Tailwind CSS design tokens & theme settings
│   └── types/                # Shared TypeScript data models and API schemas
├── infra/
│   └── docker/               # Docker Compose stack (PostgreSQL, LocalStack S3, Neo4j, Backend)
├── scripts/
│   ├── setup.sh              # 1-Command setup script for Linux / macOS / WSL
│   └── setup.ps1             # 1-Command setup script for Windows PowerShell
├── Makefile                  # Cross-platform developer commands (make setup, make dev, etc.)
├── pnpm-workspace.yaml       # pnpm workspace definition
└── turbo.json                # Turborepo task pipeline & caching configuration
```

---

## 📋 Prerequisites

Before getting started, make sure you have the following installed on your machine:

| Tool | Recommended Version | Download / Install Command |
| :--- | :--- | :--- |
| **Node.js** | `v20.x` or `v22.x` (LTS) | [nodejs.org](https://nodejs.org/) |
| **pnpm** | `v9.7.0` | `npm install -g pnpm@9.7.0` or `corepack enable` |
| **Python** | `3.11+` | [python.org](https://python.org/) |
| **Docker & Docker Compose** | Latest | [docker.com](https://www.docker.com/) |
| **Expo Go** (Mobile testing) | SDK 57 Compatible | iOS App Store / Google Play Store |

---

## 🚀 Quick Start Guide (1-Command Setup)

Follow the setup steps tailored for your operating system:

### 1. Clone the Repository

```bash
git clone https://github.com/<your-org>/SehatKosh.git
cd SehatKosh
```

---

### 🪟 Windows Setup Guide

#### Step 1: Set PowerShell Execution Policy (One-time setup)
If running PowerShell scripts is disabled on your machine, open PowerShell and run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Step 2: Run Automated Setup Script
Run the automated Windows setup script from the root directory:

```powershell
.\scripts\setup.ps1
```
*(Or run `pnpm setup` / `make setup` in PowerShell).*

**What this script does automatically:**
- Validates prerequisites (`node` v20+, `pnpm`, `python`, `docker`).
- Copies `.env.example` → `.env` in the root directory.
- Copies `services/backend/.env.example` → `services/backend/.env`.
- Auto-generates `apps/doctor-web/.env.local`.
- Installs all JS/TS monorepo dependencies via `pnpm install`.
- Creates Python `.venv` in `services/backend` and installs backend dependencies.

---

### 🐧 🍎 Linux & macOS Setup Guide

#### Step 1: Run Automated Setup Script
Make the setup script executable and run it from the root directory:

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```
*(Or run `pnpm setup` / `make setup` in your terminal).*

**What this script does automatically:**
- Validates prerequisites (`node` v20+, `pnpm`, `python3`, `docker`).
- Copies `.env.example` → `.env` in the root directory.
- Copies `services/backend/.env.example` → `services/backend/.env`.
- Auto-generates `apps/doctor-web/.env.local`.
- Installs all JS/TS monorepo dependencies via `pnpm install`.
- Creates Python `.venv` in `services/backend` and installs backend dependencies.

---

## 🖥️ Running the Application Stack

Once setup is complete, you can launch the platform depending on your development workflow:

### Option 1: Full-Stack Development (Docker Infrastructure + Web + Mobile)

Start all database services (PostgreSQL, LocalStack S3, Neo4j) and launch all applications concurrently:

```bash
# Using Makefile
make dev

# OR using pnpm
pnpm dev
```

- **Doctor Web Portal**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Core Backend**: [http://localhost:8000](http://localhost:8000) (Interactive OpenAPI Docs: [http://localhost:8000/docs](http://localhost:8000/docs))
- **Mobile App Metro Bundler**: [http://localhost:8081](http://localhost:8081)

---

### Option 2: Lightweight Development (`dev-core`)

Recommended for lower-spec laptops or when working strictly on UI features without running Neo4j:

```bash
# Using Makefile
make dev-core
```
Starts PostgreSQL + LocalStack S3 containers only, while launching the web & mobile dev servers.

---

### Option 3: Running Applications Individually

#### A. Doctor Web Portal (Next.js 14)
```bash
pnpm dev:web
```
- Open [http://localhost:3000](http://localhost:3000) (routes automatically to `/doctor/queue`).

#### B. FastAPI Backend (Python Uvicorn)
```bash
# Using Makefile
make backend

# OR manually from services/backend:
cd services/backend
# Windows:
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Linux/macOS:
./.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### C. Patient Mobile App (Expo SDK 57)
```bash
pnpm dev:mobile
```
- Open **Expo Go** on your physical phone and scan the QR code displayed in the terminal.
- Press <kbd>a</kbd> for Android Emulator or <kbd>i</kbd> for iOS Simulator (macOS only).

---

## 🧪 Testing & Code Quality

### Running Backend Unit & Integration Tests
The backend features a comprehensive test suite (30 tests) powered by `pytest` and `httpx`:

```bash
# Using Makefile (Cross-platform)
make test

# OR using pnpm
pnpm test
```

### Running Linters Across Monorepo
```bash
# Using Makefile
make lint

# OR using pnpm
pnpm lint
```

---

## 🔌 Teammate Plugin Workspace

SehatKosh features a plug-and-play architecture for custom AI models and telemetry parsers. Teammates can drop custom adapters into `services/backend/plugins/` without modifying core backend code:

```text
services/backend/plugins/
├── README.md               # Detailed teammate plugin guide
├── ocr/
│   └── template.py         # Starter template for custom OCR / VLM models
└── telemetry/
    └── template.py         # Starter template for smartwatch & BLE data
```

### How to Activate a Custom Plugin:
1. Copy `services/backend/plugins/ocr/template.py` to `services/backend/plugins/ocr/my_model.py`.
2. Implement your model logic inside `CustomOCRAdapter`.
3. In `services/backend/.env`, set:
   ```env
   OCR_ENGINE=plugin:plugins.ocr.my_model.CustomOCRAdapter
   ```
4. Restart the backend server. If your plugin encounters an import error or throws an exception, **SehatKosh automatically falls back to `MockOCRAdapter` safely without crashing**.

---

## 📜 Complete Commands Reference

| Command | Action / Description |
| :--- | :--- |
| `pnpm setup` / `make setup` | Runs 1-command environment initialization & dependency setup |
| `pnpm dev` / `make dev` | Starts full stack (Docker containers + Web + Mobile apps) |
| `make dev-core` | Starts lightweight stack (Postgres + S3 only + Web & Mobile apps) |
| `pnpm dev:web` | Launches Doctor Web Portal only (`http://localhost:3000`) |
| `pnpm dev:mobile` | Launches Expo Metro Bundler for Mobile (`http://localhost:8081`) |
| `make backend` | Runs FastAPI backend with hot-reload via uvicorn (`http://localhost:8000`) |
| `pnpm test` / `make test` | Runs Pytest suite (30 tests) + TypeScript type check |
| `pnpm lint` / `make lint` | Runs ESLint / Turbo lint + Flake8 across codebase |
| `pnpm build` | Builds all packages and web application for production |
| `pnpm clean` / `make clean` | Cleans Turbo build caches and temporary build artifacts |

---

## 🔧 Troubleshooting & FAQ

### 1. Port 3000 / 8000 / 8081 is already in use
If another process is using required ports:
- **Windows PowerShell**:
  ```powershell
  Get-NetTCPConnection -LocalPort 3000, 8000, 8081 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
  Stop-Process -Id <PID> -Force
  ```
- **Linux / macOS**:
  ```bash
  lsof -ti:3000,8000,8081 | xargs kill -9
  ```

### 2. Clearing Expo / Metro Bundler Cache
If mobile styles or shared packages are not updating in Expo:
```bash
cd apps/mobile
npx expo start -c
```

### 3. Vercel Deployment Output Directory Error (`.next was not found at /vercel/path0/.next`)
In Vercel Dashboard → **Project Settings** → **General**, ensure **Root Directory** is set to:
```text
apps/doctor-web
```
*(Ensure "Include source files outside of the Root Directory in the Build Step" is checked, and leave "Output Directory" default/disabled).*
