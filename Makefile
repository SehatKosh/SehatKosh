.PHONY: setup dev dev-core backend test lint clean help

COMPOSE_FILE = infra/docker/docker-compose.yml
BACKEND_DIR  = services/backend

ifeq ($(OS),Windows_NT)
    VENV_BIN = $(BACKEND_DIR)/.venv/Scripts
    PYTHON   = $(VENV_BIN)/python.exe
    PYTEST   = $(PYTHON) -m pytest
    FLAKE8   = $(PYTHON) -m flake8
    UVICORN  = $(PYTHON) -m uvicorn
    SETUP_CMD = powershell -ExecutionPolicy RemoteSigned -File ./scripts/setup.ps1
else
    VENV_BIN = $(BACKEND_DIR)/.venv/bin
    PYTHON   = $(VENV_BIN)/python
    PYTEST   = $(VENV_BIN)/pytest
    FLAKE8   = $(VENV_BIN)/flake8
    UVICORN  = $(VENV_BIN)/uvicorn
    SETUP_CMD = chmod +x scripts/setup.sh && ./scripts/setup.sh
endif

# ---------------------------------------------------------------------------
# help — default target
# ---------------------------------------------------------------------------
help:
	@echo ""
	@echo "  SehatKosh Developer Commands"
	@echo "  ────────────────────────────────────────────────────────────"
	@echo "  make setup      Validate prerequisites, copy .env, install deps"
	@echo "  make dev        Start full stack (all containers + all apps)"
	@echo "  make dev-core   Start lightweight containers only (postgres + S3)"
	@echo "  make backend    Start FastAPI backend with hot-reload (no Docker)"
	@echo "  make test       Run backend pytest + frontend typecheck"
	@echo "  make lint       Run linters across entire monorepo"
	@echo "  make clean      Remove build caches and virtual environments"
	@echo "  ────────────────────────────────────────────────────────────"
	@echo ""

# ---------------------------------------------------------------------------
# setup — one-command environment initialization
# ---------------------------------------------------------------------------
setup:
	@$(SETUP_CMD)

# ---------------------------------------------------------------------------
# dev — full stack (all Docker profiles + all Turborepo apps)
# ---------------------------------------------------------------------------
dev:
	docker compose -f $(COMPOSE_FILE) --profile full up -d
	pnpm dev

# ---------------------------------------------------------------------------
# dev-core — lightweight stack (postgres + localstack only, mock everything)
# Recommended for low-spec laptops or quick frontend-only work.
# ---------------------------------------------------------------------------
dev-core:
	docker compose -f $(COMPOSE_FILE) --profile core up -d
	pnpm dev

# ---------------------------------------------------------------------------
# backend — run FastAPI with uvicorn hot-reload (outside Docker)
# Requires .venv to be set up via `make setup` first.
# ---------------------------------------------------------------------------
backend:
	cd $(BACKEND_DIR) && $(UVICORN) app.main:app --reload --host 0.0.0.0 --port 8000

# ---------------------------------------------------------------------------
# test
# ---------------------------------------------------------------------------
test:
	@echo "=== Running Backend Tests ==="
	cd $(BACKEND_DIR) && $(PYTEST) -v
	@echo "=== Running Frontend Type Check ==="
	pnpm --filter @sehatkosh/doctor-web exec tsc --noEmit || true

# ---------------------------------------------------------------------------
# lint
# ---------------------------------------------------------------------------
lint:
	@echo "=== Frontend Lint (Turborepo) ==="
	pnpm turbo run lint
	@echo "=== Backend Lint (flake8) ==="
	cd $(BACKEND_DIR) && $(FLAKE8) app/ --count --select=E9,F63,F7,F82 --show-source --statistics || true

# ---------------------------------------------------------------------------
# clean
# ---------------------------------------------------------------------------
clean:
	pnpm turbo run clean
	@echo "Clean complete."
