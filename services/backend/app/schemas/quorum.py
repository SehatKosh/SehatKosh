from datetime import datetime
from typing import List, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class QuorumCreate(BaseModel):
    action_type: str = Field(..., description="Action type: PURGE_FACILITY_RECORDS, REVOKE_LICENSE, MASS_DATA_EXPORT")
    target_id: str = Field(..., description="Target facility, user, or system identifier")
    justification: str = Field(..., min_length=10, description="Audit justification for initiating the critical action")


class QuorumVoteRequest(BaseModel):
    decision: Literal["APPROVE", "REJECT"] = Field(..., description="Admin vote decision")


class QuorumVoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_id: UUID
    admin_id: UUID
    decision: str
    signed_at: datetime


class QuorumResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    action_type: str
    target_id: str
    justification: str
    status: str
    created_by: UUID
    created_at: datetime
    approval_count: int = 0
    rejection_count: int = 0
    required_signatures: int = 2
    votes: List[QuorumVoteResponse] = Field(default_factory=list)
