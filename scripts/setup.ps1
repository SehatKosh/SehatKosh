# =============================================================================
# SehatKosh — One-command developer setup (Windows PowerShell)
# Usage: .\scripts\setup.ps1
#
# If you see "cannot be loaded because running scripts is disabled", run:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# =============================================================================

$ErrorActionPreference = "Stop"

$Cyan   = "`e[36m"
$Green  = "`e[32m"
$Yellow = "`e[33m"
$Red    = "`e[31m"
$Reset  = "`e[0m"

Write-Host "${Cyan}=================================================================="
Write-Host "   SehatKosh — Developer Setup (Windows)"
Write-Host "==================================================================${Reset}"

# ---------------------------------------------------------------------------
# 1. Prerequisite checks
# ---------------------------------------------------------------------------
Write-Host "`n${Cyan}[1/5] Checking prerequisites...${Reset}"

function Check-Command {
    param([string]$Name, [string]$Hint)
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        Write-Host "${Red}✗ $Name is required but not found.${Reset}"
        Write-Host "  Hint: $Hint"
        exit 1
    }
    Write-Host "${Green}✓ $Name found: $($cmd.Source)${Reset}"
}

Check-Command "node"   "Install from https://nodejs.org/ (LTS 20+)"
Check-Command "pnpm"   "Run: npm install -g pnpm@9.7.0"
Check-Command "python" "Install Python 3.11+ from https://python.org/"
Check-Command "docker" "Install Docker Desktop from https://docker.com/"

# Check Node.js version >= 20
$nodeVersion = (node -e "process.stdout.write(process.version)") -replace 'v',''
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 20) {
    Write-Host "${Red}✗ Node.js 20+ required. Current: v$nodeVersion${Reset}"
    exit 1
}
Write-Host "${Green}✓ Node.js v$nodeVersion (20+)${Reset}"

# ---------------------------------------------------------------------------
# 2. Initialize environment files
# ---------------------------------------------------------------------------
Write-Host "`n${Cyan}[2/5] Initializing environment files...${Reset}"

$RepoRoot = Split-Path -Parent $PSScriptRoot

$rootEnv = Join-Path $RepoRoot ".env"
$rootEnvExample = Join-Path $RepoRoot ".env.example"
if (-not (Test-Path $rootEnv)) {
    Copy-Item $rootEnvExample $rootEnv
    Write-Host "${Green}✓ Created root .env from .env.example${Reset}"
    Write-Host "${Yellow}  → Review .env and fill in any secrets before running.${Reset}"
} else {
    Write-Host "${Green}✓ Root .env already exists — skipping.${Reset}"
}

$backendEnv = Join-Path $RepoRoot "services\backend\.env"
$backendEnvExample = Join-Path $RepoRoot "services\backend\.env.example"
if (-not (Test-Path $backendEnv)) {
    if (Test-Path $backendEnvExample) {
        Copy-Item $backendEnvExample $backendEnv
        Write-Host "${Green}✓ Created services/backend/.env from .env.example${Reset}"
    }
} else {
    Write-Host "${Green}✓ Backend .env already exists — skipping.${Reset}"
}

$frontendEnv = Join-Path $RepoRoot "apps\doctor-web\.env.local"
$frontendEnvExample = Join-Path $RepoRoot "apps\doctor-web\.env.example"
if (-not (Test-Path $frontendEnv)) {
    if (Test-Path $frontendEnvExample) {
        Copy-Item $frontendEnvExample $frontendEnv
    } else {
        @"
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK=true
"@ | Out-File -Encoding utf8 $frontendEnv
    }
    Write-Host "${Green}✓ Created apps/doctor-web/.env.local${Reset}"
} else {
    Write-Host "${Green}✓ Frontend .env.local already exists — skipping.${Reset}"
}

# ---------------------------------------------------------------------------
# 3. Install JS/TS workspace dependencies
# ---------------------------------------------------------------------------
Write-Host "`n${Cyan}[3/5] Installing JS/TS workspace dependencies via pnpm...${Reset}"
Set-Location $RepoRoot
pnpm install
Write-Host "${Green}✓ pnpm install complete.${Reset}"

# ---------------------------------------------------------------------------
# 4. Set up Python virtual environment
# ---------------------------------------------------------------------------
Write-Host "`n${Cyan}[4/5] Setting up Python virtual environment...${Reset}"
$BackendDir = Join-Path $RepoRoot "services\backend"
Set-Location $BackendDir

$VenvPath = Join-Path $BackendDir ".venv"
if (-not (Test-Path $VenvPath)) {
    python -m venv .venv
    Write-Host "${Green}✓ Created .venv${Reset}"
} else {
    Write-Host "${Green}✓ .venv already exists — skipping creation.${Reset}"
}

& "$VenvPath\Scripts\python.exe" -m pip install --upgrade pip --quiet
& "$VenvPath\Scripts\pip.exe" install -r requirements.txt --quiet
Write-Host "${Green}✓ Python dependencies installed.${Reset}"

# ---------------------------------------------------------------------------
# 5. Done
# ---------------------------------------------------------------------------
Set-Location $RepoRoot
Write-Host "`n${Green}=================================================================="
Write-Host "  ✓ SehatKosh setup complete!"
Write-Host "==================================================================${Reset}"
Write-Host ""
Write-Host "Next steps (run from repo root in Git Bash or PowerShell):"
Write-Host "  ${Cyan}make dev${Reset}          -> Start database containers + all apps"
Write-Host "  ${Cyan}make dev-core${Reset}     -> Start lightweight containers only"
Write-Host "  ${Cyan}make test${Reset}         -> Run all tests"
Write-Host "  ${Cyan}make lint${Reset}         -> Run linters across the monorepo"
