from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EncounterCreate(BaseModel):
    patient_id: UUID = Field(..., description="Target patient UUID")
    physician_name: str = Field(..., description="Prescribing/treating physician")
    facility_name: str = Field(..., description="Hospital or clinic name")
    encounter_date: date = Field(..., description="Date of clinical encounter")
    soap_notes: Optional[dict] = Field(default=None, description="SOAP structured notes if available")
    fhir_bundle: dict = Field(..., description="Validated HL7 FHIR R4 Bundle")
    document_s3_key: Optional[str] = Field(default=None, description="S3 storage key for prescription scan")


class EncounterRead(BaseModel):
    id: UUID
    patient_id: UUID
    physician_name: str
    facility_name: str
    encounter_date: date
    soap_notes: Optional[dict] = None
    fhir_bundle: dict
    document_s3_key: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
