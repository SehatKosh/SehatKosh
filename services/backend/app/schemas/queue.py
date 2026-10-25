from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QueueItemResponse(BaseModel):
    """
    Schema for an active patient consultation queue item.
    Represents an unexpired active consent grant coupled with patient demographics.
    """

    id: UUID = Field(..., description="Patient UUID")
    mrn: str = Field(..., description="Medical Record Number")
    patient_name: str = Field(..., description="Patient full display name")
    cnic_masked: str = Field(..., description="Masked CNIC format")
    blood_group: str = Field(..., description="Patient blood group")
    consent_id: UUID = Field(..., description="Active ConsentGrant UUID")
    consent_granted_at: datetime = Field(..., description="Consent grant start timestamp")
    consent_expires_at: datetime = Field(..., description="Consent grant expiration timestamp")
    is_break_glass: bool = Field(
        default=False, description="Whether this is an emergency break-glass grant"
    )
    status: str = Field(
        default="waiting", description="Consultation queue status"
    )

    model_config = ConfigDict(from_attributes=True)
