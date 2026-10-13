"""
HL7 FHIR R4 Pydantic v2 models — SehatKosh

Mirrors the FHIR R4 JSON structure for:
  - Coding / CodeableConcept
  - Timing / Repeat / DosageInstruction
  - Reference
  - MedicationRequest
  - FHIRBundleEntry / FHIRBundle

Designed to be lightweight (no external fhir.resources dependency).
All fields are strictly typed and use Pydantic v2 syntax exclusively.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Primitive helpers
# ---------------------------------------------------------------------------

def _new_uuid() -> str:
    return str(uuid.uuid4())


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Terminology / Coding
# ---------------------------------------------------------------------------

class Coding(BaseModel):
    """A reference to a code defined by a terminology system."""

    system: Optional[str] = Field(
        default=None,
        description="Identity of the terminology system (e.g. http://snomed.info/sct)",
    )
    code: Optional[str] = Field(
        default=None,
        description="Symbol in the terminology system",
    )
    display: Optional[str] = Field(
        default=None,
        description="Human-readable representation of the code",
    )


class CodeableConcept(BaseModel):
    """A concept that may be defined by a formal reference to a terminology."""

    coding: List[Coding] = Field(
        default_factory=list,
        description="Code defined by a terminology system",
    )
    text: str = Field(
        ...,
        description="Plain-text representation of the concept",
    )


# ---------------------------------------------------------------------------
# Timing / Dosage
# ---------------------------------------------------------------------------

class Repeat(BaseModel):
    """FHIR R4 Timing.repeat component."""

    frequency: Optional[int] = Field(
        default=None,
        description="Event occurs this many times per period",
        ge=1,
    )
    period: Optional[float] = Field(
        default=None,
        description="Event occurs frequency times per period",
        gt=0,
    )
    periodUnit: Optional[str] = Field(
        default=None,
        description="UCUM unit for the period (e.g. 'd', 'h', 'wk')",
    )


class Timing(BaseModel):
    """FHIR R4 Timing data type."""

    repeat: Optional[Repeat] = Field(
        default=None,
        description="When the event is to occur (repeat parameters)",
    )
    code: Optional[CodeableConcept] = Field(
        default=None,
        description="BID | TID | QID | AM | PM | QD | QOD | …",
    )


class DosageInstruction(BaseModel):
    """Instructions for how the medication is to be used by the patient."""

    text: str = Field(
        ...,
        description="Free text dosage instructions",
    )
    timing: Optional[Timing] = Field(
        default=None,
        description="When medication should be administered",
    )


# ---------------------------------------------------------------------------
# Reference
# ---------------------------------------------------------------------------

class Reference(BaseModel):
    """A reference from one FHIR resource to another."""

    reference: str = Field(
        ...,
        description="Literal reference (e.g. 'Patient/example')",
    )
    display: Optional[str] = Field(
        default=None,
        description="Text alternative for the resource",
    )


# ---------------------------------------------------------------------------
# MedicationRequest
# ---------------------------------------------------------------------------

class MedicationRequest(BaseModel):
    """HL7 FHIR R4 MedicationRequest resource."""

    resourceType: Literal["MedicationRequest"] = "MedicationRequest"
    id: str = Field(
        default_factory=_new_uuid,
        description="Logical identifier for this resource",
    )
    status: Literal["active", "completed", "cancelled", "draft", "unknown"] = Field(
        default="unknown",
        description="active | completed | cancelled | draft | unknown",
    )
    intent: Literal["order", "proposal", "plan"] = Field(
        default="order",
        description="order | proposal | plan",
    )
    medicationCodeableConcept: CodeableConcept = Field(
        ...,
        description="Medication to be taken",
    )
    subject: Reference = Field(
        ...,
        description="Who the medication is for",
    )
    authoredOn: Optional[str] = Field(
        default=None,
        description="ISO-8601 YYYY-MM-DD date when prescription was written",
    )
    dosageInstruction: List[DosageInstruction] = Field(
        default_factory=list,
        description="How the medication should be taken",
    )


# ---------------------------------------------------------------------------
# Patient (lightweight inline representation)
# ---------------------------------------------------------------------------

class PatientName(BaseModel):
    """FHIR R4 HumanName (simplified)."""

    text: str = Field(..., description="Full text of the name")
    use: str = Field(default="official")


class Patient(BaseModel):
    """HL7 FHIR R4 Patient resource (minimal, SehatKosh usage)."""

    resourceType: Literal["Patient"] = "Patient"
    id: str = Field(default_factory=_new_uuid)
    name: List[PatientName] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Practitioner (lightweight inline representation)
# ---------------------------------------------------------------------------

class PractitionerName(BaseModel):
    """FHIR R4 HumanName for Practitioner (simplified)."""

    text: str = Field(..., description="Full text of the practitioner name")
    use: str = Field(default="official")


class Practitioner(BaseModel):
    """HL7 FHIR R4 Practitioner resource (minimal, SehatKosh usage)."""

    resourceType: Literal["Practitioner"] = "Practitioner"
    id: str = Field(default_factory=_new_uuid)
    name: List[PractitionerName] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Bundle
# ---------------------------------------------------------------------------

# Bundle entry resource is a union of supported resource dicts; we keep it
# as dict for maximum forward compatibility (avoids discriminated union issues
# with arbitrary Pydantic versions).
class FHIRBundleEntry(BaseModel):
    """An entry in a FHIR Bundle."""

    fullUrl: str = Field(..., description="Full URL for the entry")
    resource: dict = Field(..., description="The FHIR resource")


class FHIRBundle(BaseModel):
    """HL7 FHIR R4 Bundle resource."""

    resourceType: Literal["Bundle"] = "Bundle"
    id: str = Field(
        default_factory=_new_uuid,
        description="Logical identifier for this Bundle",
    )
    type: Literal["collection", "transaction", "document"] = Field(
        default="collection",
        description="collection | transaction | document",
    )
    timestamp: str = Field(
        default_factory=_utc_now,
        description="ISO-8601 UTC timestamp when the bundle was assembled",
    )
    entry: List[FHIRBundleEntry] = Field(
        default_factory=list,
        description="Entries in the bundle — each contains a FHIR resource",
    )
