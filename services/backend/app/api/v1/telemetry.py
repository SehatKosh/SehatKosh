from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.modules.telemetry.interface import TelemetryProcessor
from app.core.dependencies import get_telemetry_processor
from app.core.config import settings

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


class TelemetryParseResponse(BaseModel):
    vitals: dict
    telemetry_engine_used: str


@router.post(
    "/parse",
    response_model=TelemetryParseResponse,
    summary="Parse and normalize wearable telemetry data",
    description="Normalizes raw smartwatch/wearable payload into standardized health vitals.",
)
async def parse_telemetry(
    payload: dict,
    telemetry: TelemetryProcessor = Depends(get_telemetry_processor),
) -> TelemetryParseResponse:
    vitals = await telemetry.parse_wearable_payload(payload)
    return TelemetryParseResponse(
        vitals=vitals,
        telemetry_engine_used=settings.TELEMETRY_ENGINE,
    )
