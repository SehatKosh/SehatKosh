"""
SehatKosh FastAPI Backend — Application Entrypoint

Start locally:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Or via Docker / make dev.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import router as v1_router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan (replaces deprecated @app.on_event)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("SehatKosh backend starting up...")
    logger.info("OCR Engine  : %s", settings.OCR_ENGINE)
    logger.info("FHIR Parser : %s", settings.FHIR_PARSER)
    logger.info("App Env     : %s", settings.APP_ENV)
    logger.info("CORS Origins: %s", settings.CORS_ORIGINS)
    yield
    # Shutdown
    logger.info("SehatKosh backend shutting down.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SehatKosh API",
    description=(
        "Backend API for the SehatKosh integrated healthcare platform. "
        "Provides OCR-based prescription extraction and HL7 FHIR R4 transformation."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

# Adjustment #3 (mandatory): CORS configured to allow the doctor-web portal
# on localhost:3000 and 127.0.0.1:3000 for local development.
# In production, CORS_ORIGINS should be set to the deployed Vercel URL via env.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(v1_router)
