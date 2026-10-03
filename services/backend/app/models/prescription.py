from pydantic import BaseModel, Field
from typing import List, Optional


class Medication(BaseModel):
    """A single medication entry extracted from a prescription."""

    name: str = Field(..., description="Generic or brand name of the medication")
    strength: str = Field(..., description="Dosage strength, e.g. '500mg'")
    frequency: str = Field(..., description="How often, e.g. '3 times daily'")
    duration: str = Field(..., description="How long, e.g. '7 days'")
    snomed_code: Optional[str] = Field(
        default=None, description="SNOMED CT concept code for the medication"
    )


class PrescriptionExtraction(BaseModel):
    """Structured output from the OCR extraction pipeline."""

    doctor_name: str = Field(..., description="Full name of the prescribing doctor")
    clinic: str = Field(..., description="Clinic or hospital name")
    date: str = Field(..., description="Prescription date in ISO 8601 format (YYYY-MM-DD)")
    medications: List[Medication] = Field(
        default_factory=list, description="List of medications prescribed"
    )
    raw_text: str = Field(
        default="", description="Raw OCR text before structured extraction"
    )


class PrescriptionExtractionResponse(BaseModel):
    """Full response from POST /api/v1/prescriptions/extract."""

    extraction: PrescriptionExtraction
    fhir_bundle: dict = Field(
        ..., description="HL7 FHIR R4 Bundle generated from the extraction"
    )
    ocr_engine_used: str = Field(
        ..., description="Name of the OCR adapter that processed this request"
    )


class OCREngineInfo(BaseModel):
    """Describes a registered OCR engine."""

    name: str
    type: str
    description: str


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    ocr_engine: str
    fhir_parser: str
