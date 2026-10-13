"""
POST /api/v1/prescriptions/extract  — Prescription extraction endpoint.

Wires the full pipeline:
    image upload → OCR → ResilientFHIR normaliser + Bundle builder → response

The response envelope follows the ExtractionResponse schema:
{
    "status": "success",
    "data": {
        "raw_ocr": { ... },
        "fhir_bundle": { "resourceType": "Bundle", ... },
        "metadata": {
            "medications_detected": N,
            "unmapped_codes_count": N,
            "is_fallback": bool,
        }
    }
}

Legacy endpoints (GET /engines, GET /health) are preserved unchanged.
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status

from app.modules.ocr.interface import OCRProcessor
from app.modules.fhir.interface import FHIRTransformer
from app.core.dependencies import get_ocr_processor, get_fhir_transformer
from app.core.config import settings
from app.models.prescription import (
    PrescriptionExtraction,
    PrescriptionExtractionResponse,
    OCREngineInfo,
)
from app.schemas.extraction import ExtractionResponse, ExtractionData, ExtractionMetadata

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

# Maximum allowed upload size: 10 MB
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

# Accepted image MIME types
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/tiff"}


@router.post(
    "/extract",
    response_model=ExtractionResponse,
    summary="Extract prescription data from an uploaded image",
    description=(
        "Upload a prescription image (JPEG, PNG, WebP, or TIFF). "
        "The configured OCR engine extracts structured medication data, "
        "which is then transformed into a strictly validated HL7 FHIR R4 Bundle "
        "via the resilient normalisation pipeline. "
        "The response includes the raw OCR output, the FHIR bundle, "
        "and quality metadata (medications detected, unmapped codes, fallback flag)."
    ),
)
async def extract_prescription(
    file: UploadFile = File(..., description="Prescription image file"),
    ocr: OCRProcessor = Depends(get_ocr_processor),
    fhir: FHIRTransformer = Depends(get_fhir_transformer),
) -> ExtractionResponse:
    """
    Process a prescription image through the OCR → FHIR pipeline.

    - Validates file type and size.
    - Delegates OCR to the configured adapter (mock or plugin).
    - Passes raw OCR output through the resilient FHIR normaliser.
    - Returns a validated FHIR R4 Bundle with extraction metadata.
    """
    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type: {file.content_type}. "
                f"Accepted types: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
            ),
        )

    # Read and validate file size
    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    # OCR extraction — returns an arbitrary dict
    raw_ocr: dict = await ocr.extract_prescription(image_bytes)

    # FHIR transformation — resilient adapter handles any dict shape
    fhir_bundle: dict = await fhir.transform_to_fhir(raw_ocr)

    # Extract pipeline metadata from the bundle's _meta sidecar (if present)
    pipeline_meta = fhir_bundle.pop("_meta", {})
    metadata = ExtractionMetadata(
        medications_detected=pipeline_meta.get("medications_detected", 0),
        unmapped_codes_count=pipeline_meta.get("unmapped_codes_count", 0),
        is_fallback=pipeline_meta.get("is_fallback", False),
    )

    return ExtractionResponse(
        status="success",
        data=ExtractionData(
            raw_ocr=raw_ocr,
            fhir_bundle=fhir_bundle,
            metadata=metadata,
        ),
    )


# ---------------------------------------------------------------------------
# Legacy endpoint: GET /engines
# Preserved for backward-compatibility with existing clients / CI tests.
# ---------------------------------------------------------------------------

@router.get(
    "/engines",
    response_model=list[OCREngineInfo],
    summary="List available OCR engines",
    description="Returns the currently configured OCR engine and all available options.",
)
async def list_ocr_engines() -> list[OCREngineInfo]:
    """Return metadata about available OCR engine configurations."""
    engines = [
        OCREngineInfo(
            name="mock",
            type="built-in",
            description="Deterministic mock adapter. No external dependencies. "
                        "Always returns realistic sample data. Set OCR_ENGINE=mock.",
        ),
        OCREngineInfo(
            name="plugin:<dotpath>",
            type="plugin",
            description="Dynamically loads any Python class satisfying OCRProcessor protocol. "
                        "Example: OCR_ENGINE=plugin:plugins.gemini_vision.GeminiOCRAdapter",
        ),
    ]
    return engines
