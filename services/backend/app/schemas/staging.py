from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StagingUploadResponse(BaseModel):
    id: UUID
    source_facility_id: Optional[UUID] = None
    adapter_name: str
    status: str
    validation_errors: List[str] = Field(default_factory=list)
    normalized_fhir_preview: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StagingPromoteRequest(BaseModel):
    patient_id: UUID = Field(..., description="Target patient UUID")
    practitioner_id: Optional[UUID] = Field(default=None, description="Verifying practitioner UUID")
    encounter_date: Optional[date] = Field(default=None, description="Clinical encounter date")


class StagingRejectRequest(BaseModel):
    reason: str = Field(..., min_length=1, description="Clinical or administrative justification for rejection")


class StagingRecordRead(BaseModel):
    id: UUID
    source_facility_id: Optional[UUID] = None
    adapter_name: str
    schema_version: str
    raw_payload: Dict[str, Any]
    normalized_fhir_preview: Optional[Dict[str, Any]] = None
    validation_errors: List[str] = Field(default_factory=list)
    status: str
    promoted_encounter_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
