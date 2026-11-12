from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FacilityResponse(BaseModel):
    id: UUID
    name: str
    code: str
    facility_type: str
    license_number: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DepartmentResponse(BaseModel):
    id: UUID
    facility_id: UUID
    name: str
    code: str
    floor_or_location: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PractitionerResponse(BaseModel):
    id: UUID
    user_id: UUID
    facility_id: UUID
    department_id: Optional[UUID] = None
    pmdc_number: Optional[str] = None
    designation: str
    prescribing_authority: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class PatientFacilityRecordResponse(BaseModel):
    id: UUID
    patient_id: UUID
    facility_id: UUID
    local_mrn: str
    registered_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TriageQueueItemResponse(BaseModel):
    id: UUID
    facility_id: UUID
    department_id: UUID
    patient_id: UUID
    token_number: str
    triage_priority: str
    status: str
    vitals_snapshot: Optional[dict] = None
    chief_complaint: Optional[str] = None
    practitioner_id: Optional[UUID] = None
    admitted_at: datetime
    patient_name: Optional[str] = None
    patient_mrn: Optional[str] = None
    local_mrn: Optional[str] = None
    cnic_masked: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TriageEnqueueRequest(BaseModel):
    patient_id: UUID
    department_id: UUID
    triage_priority: str = Field(default="ROUTINE", description="CRITICAL_RESUSCITATION, URGENT, ROUTINE")
    chief_complaint: Optional[str] = None
    vitals_snapshot: Optional[dict] = None
    practitioner_id: Optional[UUID] = None
