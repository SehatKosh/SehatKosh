.PHONY: setup dev dev-core test lint clean help

COMPOSE_FILE = infra/docker/docker-compose.yml
BACKEND_DIR  = services/backend
VENV         = $(BACKEND_DIR)/.venv
PYTHON       = $(VENV)/bin/python
PIP          = $(VENV)/bin/pip

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
	@echo "  make clean      Remove build caches and node_modules"
	@echo "  ────────────────────────────────────────────────────────────"
	@echo ""

# ---------------------------------------------------------------------------
# setup — one-command environment initialization
# ---------------------------------------------------------------------------
setup:
	@chmod +x scripts/setup.sh
	@./scripts/setup.sh

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
	cd $(BACKEND_DIR) && \
	  .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ---------------------------------------------------------------------------
# test
# ---------------------------------------------------------------------------
test:
	@echo "=== Running Backend Tests ==="
	cd $(BACKEND_DIR) && .venv/bin/pytest -v
	@echo "=== Running Frontend Type Check ==="
	pnpm --filter @sehatkosh/doctor-web exec tsc --noEmit || true

# ---------------------------------------------------------------------------
# lint
# ---------------------------------------------------------------------------
lint:
	@echo "=== Frontend Lint (Turborepo) ==="
	pnpm turbo run lint
	@echo "=== Backend Lint (flake8) ==="
	cd $(BACKEND_DIR) && .venv/bin/flake8 app/ --count --select=E9,F63,F7,F82 --show-source --statistics || true

# ---------------------------------------------------------------------------
# clean
# ---------------------------------------------------------------------------
clean:
	pnpm turbo run clean
	find . -type d -name node_modules -not -path "*/\.*" -prune -exec rm -rf {} + 2>/dev/null || true
	rm -rf $(BACKEND_DIR)/.venv $(BACKEND_DIR)/__pycache__ $(BACKEND_DIR)/app/**/__pycache__
	@echo "Clean complete."
