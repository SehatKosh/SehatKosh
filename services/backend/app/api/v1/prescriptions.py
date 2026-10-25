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
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.dependencies import get_fhir_transformer, get_ocr_processor
from app.models.prescription import OCREngineInfo
from app.modules.fhir.interface import FHIRTransformer
from app.modules.ocr.interface import OCRProcessor
from app.schemas.extraction import (
    ExtractionData,
    ExtractionMetadata,
    ExtractionResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

# Maximum allowed upload size: 10 MB (FR-SEC hardening)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

# Accepted image MIME types
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/tiff"}


def is_valid_image_signature(data: bytes) -> bool:
    """
    Validates image magic bytes against supported clinical imaging formats:
    - JPEG: FF D8 FF
    - PNG: 89 50 4E 47 0D 0A 1A 0A
    - WebP: RIFF....WEBP
    - TIFF: Little-endian (II*\\0) or Big-endian (MM\\0*)
    """
    if len(data) < 4:
        return False
    # JPEG
    if data.startswith(b"\xff\xd8\xff"):
        return True
    # PNG
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    # WebP
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return True
    # TIFF
    if data[:4] in (b"II*\x00", b"MM\x00*"):
        return True
    return False


@router.post(
    "/extract",
    response_model=ExtractionResponse,
    summary="Extract prescription data from an uploaded image",
    description=(
        "Upload a prescription image (JPEG, PNG, WebP, or TIFF). "
        "Strictly validates file size (<=10MB) and binary magic bytes. "
        "Transforms OCR output into a valid HL7 FHIR R4 Bundle with zero unhandled 500 guarantee."
    ),
)
async def extract_prescription(
    file: UploadFile = File(..., description="Prescription image file"),
    ocr: OCRProcessor = Depends(get_ocr_processor),
    fhir: FHIRTransformer = Depends(get_fhir_transformer),
):
    """
    Process a prescription image through the OCR → FHIR pipeline.
    - Validates MIME header and payload size <= 10MB.
    - Enforces binary magic bytes check (blocks disguised executables/scripts).
    - Guarantees 0% unhandled HTTP 500 errors via defensive exception containment.
    """
    # 1. Validate MIME content type header
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type: {file.content_type}. "
                f"Accepted types: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
            ),
        )

    # 2. Read file bytes and validate size
    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or unsupported image file format: zero bytes uploaded.",
        )

    # 3. Inspect binary magic bytes (initial 2048 bytes)
    header_sample = image_bytes[:2048]
    if not is_valid_image_signature(header_sample):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or unsupported image file format",
        )

    # 4. Defensive OCR & FHIR pipeline (Zero-500 Guarantee)
    try:
        raw_ocr: dict = await ocr.extract_prescription(image_bytes)
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
    except Exception as exc:
        logger.warning("Defensive catch in prescription extraction pipeline: %s", exc)
        fallback_resp = ExtractionResponse(
            status="fallback",
            data=ExtractionData(
                raw_ocr={"error": "Corrupted image payload could not be parsed", "raw_text": ""},
                fhir_bundle={"resourceType": "Bundle", "type": "collection", "entry": []},
                metadata=ExtractionMetadata(
                    medications_detected=0,
                    unmapped_codes_count=0,
                    is_fallback=True,
                ),
            ),
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=fallback_resp.model_dump(),
        )


@router.get(
    "/engines",
    response_model=List[OCREngineInfo],
    summary="List available OCR engines",
    description="Returns the currently configured OCR engine and all available options.",
)
async def list_ocr_engines() -> List[OCREngineInfo]:
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
