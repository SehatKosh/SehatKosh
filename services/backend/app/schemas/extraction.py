"""
API-level response schemas for the prescription extraction endpoint.

Separates the wire format (what clients see) from internal FHIR models.
Uses Pydantic v2 syntax throughout.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Extraction metadata
# ---------------------------------------------------------------------------

class ExtractionMetadata(BaseModel):
    """Statistics and quality signals attached to every extraction response."""

    medications_detected: int = Field(
        default=0,
        description="Number of MedicationRequest entries in the FHIR bundle",
        ge=0,
    )
    unmapped_codes_count: int = Field(
        default=0,
        description="Medications without a known SNOMED-CT / LOINC code",
        ge=0,
    )
    is_fallback: bool = Field(
        default=False,
        description=(
            "True when the normalizer had to use raw-text or heuristic fallbacks "
            "because the OCR payload was unstructured"
        ),
    )


# ---------------------------------------------------------------------------
# Top-level extraction response envelope
# ---------------------------------------------------------------------------

class ExtractionData(BaseModel):
    """Inner data payload returned by POST /api/v1/prescriptions/extract."""

    raw_ocr: Dict[str, Any] = Field(
        ...,
        description="Verbatim dict returned by the OCR processor",
    )
    fhir_bundle: Dict[str, Any] = Field(
        ...,
        description="HL7 FHIR R4 Bundle (resourceType: 'Bundle')",
    )
    metadata: ExtractionMetadata = Field(
        default_factory=ExtractionMetadata,
        description="Extraction quality metrics",
    )


class ExtractionResponse(BaseModel):
    """Envelope returned by POST /api/v1/prescriptions/extract."""

    status: str = Field(
        default="success",
        description="'success' or 'error'",
    )
    data: ExtractionData = Field(
        ...,
        description="Extraction result payload",
    )
