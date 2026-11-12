from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EncounterCreate(BaseModel):
    patient_id: UUID = Field(..., description="Target patient UUID")
    physician_name: str = Field(..., description="Prescribing/treating physician")
    facility_name: str = Field(..., description="Hospital or clinic name")
    encounter_date: date = Field(..., description="Date of clinical encounter")
    facility_id: Optional[UUID] = Field(default=None, description="Facility UUID")
    practitioner_id: Optional[UUID] = Field(default=None, description="Practitioner UUID")
    source_type: str = Field(default="HOSPITAL_EMR_NATIVE", description="Provenance source category")
    verification_status: str = Field(default="CLINICIAN_VERIFIED", description="Clinical verification status")
    encounter_class: str = Field(default="OPD", description="OPD, EMERGENCY, INPATIENT, HOME_SCAN")
    triage_priority: str = Field(default="ROUTINE", description="Triage priority")
    vitals_snapshot: Optional[dict] = Field(default=None, description="Vital signs snapshot")
    soap_subjective: Optional[str] = Field(default=None, description="Subjective notes")
    soap_objective: Optional[str] = Field(default=None, description="Objective notes")
    soap_assessment: Optional[dict] = Field(default=None, description="Assessment and ICD-10 diagnoses")
    soap_plan: Optional[str] = Field(default=None, description="Treatment plan")
    soap_notes: Optional[dict] = Field(default=None, description="SOAP structured notes if available")
    fhir_bundle: dict = Field(..., description="Validated HL7 FHIR R4 Bundle")
    document_s3_key: Optional[str] = Field(default=None, description="S3 storage key for prescription scan")
    status: str = Field(default="FINALIZED", description="IN_PROGRESS, FINALIZED, AMENDED")


class EncounterUpdate(BaseModel):
    physician_name: Optional[str] = None
    facility_name: Optional[str] = None
    soap_subjective: Optional[str] = None
    soap_objective: Optional[str] = None
    soap_assessment: Optional[dict] = None
    soap_plan: Optional[str] = None
    soap_notes: Optional[dict] = None
    vitals_snapshot: Optional[dict] = None
    triage_priority: Optional[str] = None


class EncounterRead(BaseModel):
    id: UUID
    patient_id: UUID
    facility_id: Optional[UUID] = None
    practitioner_id: Optional[UUID] = None
    parent_encounter_id: Optional[UUID] = None
    physician_name: Optional[str] = None
    facility_name: Optional[str] = None
    encounter_date: date
    encounter_class: str = "OPD"
    triage_priority: str = "ROUTINE"
    source_type: str = "HOSPITAL_EMR_NATIVE"
    verification_status: str = "CLINICIAN_VERIFIED"
    status: str = "FINALIZED"
    soap_subjective: Optional[str] = None
    soap_objective: Optional[str] = None
    soap_assessment: Optional[dict] = None
    soap_plan: Optional[str] = None
    soap_notes: Optional[dict] = None
    vitals_snapshot: Optional[dict] = None
    fhir_bundle: dict
    document_s3_key: Optional[str] = None
    created_at: datetime
    finalized_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
