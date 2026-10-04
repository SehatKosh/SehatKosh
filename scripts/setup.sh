#!/usr/bin/env bash
# =============================================================================
# SehatKosh — One-command developer setup (Linux / macOS / WSL / CI)
# Usage: ./scripts/setup.sh
# =============================================================================
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}==================================================================${NC}"
echo -e "${CYAN}   SehatKosh — Developer Setup${NC}"
echo -e "${CYAN}==================================================================${NC}"

# ---------------------------------------------------------------------------
# 1. Prerequisite checks
# ---------------------------------------------------------------------------
echo -e "\n${CYAN}[1/5] Checking prerequisites...${NC}"

check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗ $1 is required but not installed.${NC}"
    echo -e "  Hint: $2"
    exit 1
  else
    echo -e "${GREEN}✓ $1 found: $(command -v "$1")${NC}"
  fi
}

check_node_version() {
  local version
  version=$(node -e "process.exit(Number(process.version.slice(1).split('.')[0]) < 20 ? 1 : 0)" 2>&1 && echo ok || echo fail)
  if [ "$version" = "fail" ]; then
    echo -e "${RED}✗ Node.js 20+ required. Current: $(node -v)${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Node.js $(node -v) (20+)${NC}"
}

check_command node    "Install from https://nodejs.org/"
check_node_version
check_command pnpm    "Run: corepack enable && corepack prepare pnpm@9.7.0 --activate"
check_command python3 "Install Python 3.11+ from https://python.org/"
check_command docker  "Install Docker Desktop from https://docker.com/"

# ---------------------------------------------------------------------------
# 2. Initialize environment files
# ---------------------------------------------------------------------------
echo -e "\n${CYAN}[2/5] Initializing environment files...${NC}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$REPO_ROOT/.env" ]; then
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
  echo -e "${GREEN}✓ Created root .env from .env.example${NC}"
  echo -e "${YELLOW}  → Review .env and fill in any secrets before running.${NC}"
else
  echo -e "${GREEN}✓ Root .env already exists — skipping.${NC}"
fi

if [ ! -f "$REPO_ROOT/services/backend/.env" ]; then
  if [ -f "$REPO_ROOT/services/backend/.env.example" ]; then
    cp "$REPO_ROOT/services/backend/.env.example" "$REPO_ROOT/services/backend/.env"
    echo -e "${GREEN}✓ Created services/backend/.env from .env.example${NC}"
  fi
else
  echo -e "${GREEN}✓ Backend .env already exists — skipping.${NC}"
fi

if [ ! -f "$REPO_ROOT/apps/doctor-web/.env.local" ]; then
  if [ -f "$REPO_ROOT/apps/doctor-web/.env.example" ]; then
    cp "$REPO_ROOT/apps/doctor-web/.env.example" "$REPO_ROOT/apps/doctor-web/.env.local"
  else
    cat << 'EOF' > "$REPO_ROOT/apps/doctor-web/.env.local"
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK=true
EOF
  fi
  echo -e "${GREEN}✓ Created apps/doctor-web/.env.local${NC}"
else
  echo -e "${GREEN}✓ Frontend .env.local already exists — skipping.${NC}"
fi

# ---------------------------------------------------------------------------
# 3. Install JS/TS workspace dependencies
# ---------------------------------------------------------------------------
echo -e "\n${CYAN}[3/5] Installing JS/TS workspace dependencies via pnpm...${NC}"
cd "$REPO_ROOT"
pnpm install
echo -e "${GREEN}✓ pnpm install complete.${NC}"

# ---------------------------------------------------------------------------
# 4. Set up Python virtual environment
# ---------------------------------------------------------------------------
echo -e "\n${CYAN}[4/5] Setting up Python virtual environment...${NC}"
cd "$REPO_ROOT/services/backend"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  echo -e "${GREEN}✓ Created .venv${NC}"
else
  echo -e "${GREEN}✓ .venv already exists — skipping creation.${NC}"
fi

# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo -e "${GREEN}✓ Python dependencies installed.${NC}"
deactivate

# ---------------------------------------------------------------------------
# 5. Done
# ---------------------------------------------------------------------------
cd "$REPO_ROOT"
echo -e "\n${GREEN}=================================================================="
echo -e "  ✓ SehatKosh setup complete!"
echo -e "=================================================================="
echo -e "${NC}"
echo -e "Next steps:"
echo -e "  ${CYAN}make dev${NC}          → Start database containers + all apps"
echo -e "  ${CYAN}make dev-core${NC}     → Start lightweight containers only (postgres + S3)"
echo -e "  ${CYAN}make test${NC}         → Run all tests"
echo -e "  ${CYAN}make lint${NC}         → Run linters across the monorepo"
