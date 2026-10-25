from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class CohortFilterRequest(BaseModel):
    gender: Optional[str] = Field(None, description="Filter cohort by gender: 'Male', 'Female', etc.")
    blood_group: Optional[str] = Field(None, description="Filter cohort by blood group, e.g. 'O+', 'B+'")
    condition: Optional[str] = Field(None, description="Filter cohort by condition / diagnosis keyword")
    format: Literal["json", "csv"] = Field("json", description="Export format: json or csv")


class DeidentifiedRecordResponse(BaseModel):
    research_id: str = Field(..., description="Deterministic salted SHA-256 ephemeral pseudo-ID (12 chars)")
    age_bracket: str = Field(..., description="5-year deterministic age bracket (e.g. '25-29')")
    gender: str = Field(..., description="Patient gender")
    blood_group: str = Field(..., description="ABO/Rh blood group")
    allergies: List[str] = Field(default_factory=list, description="Allergies list")
    diagnoses: List[str] = Field(
        default_factory=list,
        description="Aggregated diagnoses without identifying details",
    )
    medications: List[str] = Field(
        default_factory=list,
        description="Prescribed medication names without clinician metadata",
    )
    encounter_count: int = Field(..., description="Total number of historical encounters")
