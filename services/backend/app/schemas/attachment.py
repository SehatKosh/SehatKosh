from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AttachmentRead(BaseModel):
    id: UUID
    encounter_id: UUID
    patient_id: UUID
    facility_id: Optional[UUID] = None
    modality_category: str
    s3_bucket: str
    s3_key: str
    mime_type: str
    file_size_bytes: int
    sha256_hash: str
    uploaded_by_role: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PresignedUrlResponse(BaseModel):
    attachment_id: UUID
    presigned_url: str
    expires_in_seconds: int = Field(default=900, description="URL validity duration in seconds (15 minutes)")
    mime_type: str
