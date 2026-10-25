from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConsentGrantCreate(BaseModel):
    patient_id: UUID = Field(..., description="Target patient UUID")
    physician_id: UUID = Field(..., description="Authorized physician UUID")
    validity_hours: int = Field(default=24, ge=1, le=720, description="Consent duration in hours (default 24)")


class ConsentCheckResponse(BaseModel):
    active: bool
    grant_id: Optional[UUID] = None
    expires_at: Optional[datetime] = None
    is_break_glass: bool = False
    message: Optional[str] = None


class BreakGlassRequest(BaseModel):
    patient_id: UUID = Field(..., description="Target patient UUID")
    physician_id: Optional[UUID] = Field(default=None, description="Optional physician UUID (generated if omitted)")
    treating_physician_name: str = Field(..., min_length=2, description="Treating physician full name")
    witness_staff_id: str = Field(..., min_length=2, description="Hospital witness ID")
    justification: str = Field(
        ...,
        min_length=20,
        description="Clinical emergency justification (minimum 20 characters required)",
    )


class ConsentGrantRead(BaseModel):
    id: UUID
    patient_id: UUID
    physician_id: UUID
    status: str
    granted_at: datetime
    expires_at: datetime
    is_break_glass: bool
    justification: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
