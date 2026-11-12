from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class InteractionAlert(BaseModel):
    severity: str = Field(..., description="Alert severity: CRITICAL, WARNING, INFO")
    type: str = Field(..., description="Alert type: ALLERGY_COLLISION, DDI_CONTRAINDICATION")
    trigger: str = Field(..., description="Causative drug or allergen pair")
    detail: str = Field(..., description="Clinical explanation and safety advice")


class InteractionCheckRequest(BaseModel):
    patient_id: Optional[UUID] = Field(
        default=None, description="Patient UUID to query recorded allergies and active meds"
    )
    proposed_medications: List[str] = Field(..., description="List of medications being prescribed")
    allergies: Optional[List[str]] = Field(default=None, description="Direct list of allergies to check against")


class InteractionCheckResponse(BaseModel):
    safe: bool = Field(..., description="True if no CRITICAL alerts found")
    alerts: List[InteractionAlert] = Field(default_factory=list)


class ICD10Item(BaseModel):
    code: str = Field(..., description="ICD-10 clinical diagnosis code")
    description: str = Field(..., description="Disease/condition description")


class AmendmentCreate(BaseModel):
    reason: str = Field(..., description="Clinical justification for encounter amendment")
    soap_subjective: Optional[str] = Field(default=None, description="Updated subjective complaints")
    soap_objective: Optional[str] = Field(default=None, description="Updated objective examination")
    soap_assessment: Optional[Dict[str, Any]] = Field(default=None, description="Updated assessment/ICD-10")
    soap_plan: Optional[str] = Field(default=None, description="Updated treatment plan")
    physician_name: Optional[str] = Field(default=None, description="Amending physician name")


class TriageCalculateRequest(BaseModel):
    spo2: Optional[float] = Field(default=None, description="Oxygen saturation percentage (0-100)")
    heart_rate: Optional[int] = Field(default=None, description="Heart rate in beats per minute")
    pulse: Optional[int] = Field(default=None, description="Pulse rate alias")
    systolic_bp: Optional[int] = Field(default=None, description="Systolic blood pressure mmHg")
    bp_systolic: Optional[int] = Field(default=None, description="Systolic blood pressure alias")
    diastolic_bp: Optional[int] = Field(default=None, description="Diastolic blood pressure mmHg")
    bp_diastolic: Optional[int] = Field(default=None, description="Diastolic blood pressure alias")
    temperature_f: Optional[float] = Field(default=None, description="Temperature in Fahrenheit")
    temperature: Optional[float] = Field(default=None, description="Temperature alias")
    respiratory_rate: Optional[int] = Field(default=None, description="Breaths per minute")
    gcs: Optional[int] = Field(default=None, description="Glasgow Coma Scale score (3-15)")


class TriageCalculateResponse(BaseModel):
    priority: str = Field(..., description="Assigned priority: CRITICAL_RESUSCITATION, URGENT, ROUTINE")
    reasoning: str = Field(..., description="Rule-based clinical explanation")
