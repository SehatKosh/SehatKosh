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

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

# Maximum allowed upload size: 10 MB
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

# Accepted image MIME types
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/tiff"}


@router.post(
    "/extract",
    response_model=PrescriptionExtractionResponse,
    summary="Extract prescription data from an uploaded image",
    description=(
        "Upload a prescription image (JPEG, PNG, WebP, or TIFF). "
        "The configured OCR engine extracts structured medication data, "
        "which is then transformed into an HL7 FHIR R4 Bundle."
    ),
)
async def extract_prescription(
    file: UploadFile = File(..., description="Prescription image file"),
    ocr: OCRProcessor = Depends(get_ocr_processor),
    fhir: FHIRTransformer = Depends(get_fhir_transformer),
) -> PrescriptionExtractionResponse:
    """
    Process a prescription image through the OCR → FHIR pipeline.

    - Validates file type and size.
    - Delegates OCR to the configured adapter (mock or plugin).
    - Transforms OCR output to an HL7 FHIR R4 Bundle.
    - Returns both the raw extraction and the FHIR bundle.
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

    # OCR extraction
    extracted_dict = await ocr.extract_prescription(image_bytes)

    # Validate extraction shape via Pydantic
    extraction = PrescriptionExtraction(**extracted_dict)

    # FHIR transformation
    fhir_bundle = await fhir.transform_to_fhir(extracted_dict)

    # Determine which engine was actually used
    engine_label = settings.OCR_ENGINE
    ocr_engine_used = (
        "MockOCRAdapter"
        if engine_label.lower() == "mock"
        else engine_label
    )

    return PrescriptionExtractionResponse(
        extraction=extraction,
        fhir_bundle=fhir_bundle,
        ocr_engine_used=ocr_engine_used,
    )


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
