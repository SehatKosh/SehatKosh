from fastapi import APIRouter

from app.api.v1.prescriptions import router as prescriptions_router
from app.api.v1.telemetry import router as telemetry_router
from app.core.config import settings
from app.models.prescription import HealthResponse

router = APIRouter(prefix="/api/v1")

# Mount sub-routers
router.include_router(prescriptions_router)
router.include_router(telemetry_router)


@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Backend health check",
)
async def health_check() -> HealthResponse:
    """
    Returns service status and current configuration summary.
    Used by CI/CD probes and evaluator demonstrations.
    """
    return HealthResponse(
        status="ok",
        version="0.1.0",
        ocr_engine=settings.OCR_ENGINE,
        fhir_parser=settings.FHIR_PARSER,
    )
