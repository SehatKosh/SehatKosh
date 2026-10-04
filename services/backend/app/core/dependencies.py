from functools import lru_cache

from app.core.config import settings
from app.modules.ocr.interface import OCRProcessor
from app.modules.ocr.registry import get_ocr_adapter
from app.modules.fhir.interface import FHIRTransformer
from app.modules.fhir.adapters import MockFHIRAdapter
from app.modules.telemetry.interface import TelemetryProcessor
from app.modules.telemetry.registry import get_telemetry_adapter


@lru_cache(maxsize=1)
def get_ocr_processor() -> OCRProcessor:
    """
    FastAPI dependency: resolve the configured OCR adapter (cached for the
    lifetime of the process). Changing OCR_ENGINE requires a server restart.

    The resolution logic lives in ocr/registry.py which handles:
    - "mock" → MockOCRAdapter
    - "plugin:<dotpath>" → dynamically loaded adapter with safe fallback
    """
    return get_ocr_adapter(settings.OCR_ENGINE)


@lru_cache(maxsize=1)
def get_fhir_transformer() -> FHIRTransformer:
    """
    FastAPI dependency: resolve the configured FHIR transformer (cached).
    Currently only the mock adapter is implemented; a live LLM-based
    transformer will be added as a plugin in a future phase.
    """
    # Future: support "plugin:<dotpath>" same as OCR engine
    return MockFHIRAdapter()


@lru_cache(maxsize=1)
def get_telemetry_processor() -> TelemetryProcessor:
    """
    FastAPI dependency: resolve the configured Telemetry processor (cached).
    """
    return get_telemetry_adapter(settings.TELEMETRY_ENGINE)
