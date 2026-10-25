from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import log_audit_event, require_active_consent
from app.models.consent import ConsentGrant
from app.models.patient import PatientProfile
from app.schemas.encounter import EncounterRead

router = APIRouter(prefix="/patients", tags=["Patients"])


# ─── Pydantic Schemas for Patients & Dossier ─────────────────────────────────

class PatientDemographics(BaseModel):
    id: UUID
    mrn: str
    name: str = Field(..., description="Patient display name")
    age: int
    gender: str
    blood_group: str
    cnic_masked: str
    phone_masked: str

    model_config = ConfigDict(from_attributes=True)


class PatientCreate(BaseModel):
    mrn: str
    cnic: Optional[str] = None
    cnic_masked: str
    phone_masked: str
    blood_group: str
    full_name: str
    age: int
    gender: str
    allergies: List[str] = Field(default_factory=list)


class PatientDossierResponse(BaseModel):
    patient: PatientDemographics
    allergies: List[Any]
    encounters: List[EncounterRead]
    consent: Dict[str, Any]


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get(
    "/search",
    response_model=PatientDemographics,
    summary="Search patient by CNIC (Demographic Sandbox Isolation)",
)
async def search_patient_by_cnic(
    cnic: str = Query(..., description="Patient CNIC to search"),
    db: AsyncSession = Depends(get_db),
) -> PatientDemographics:
    """
    Registrar search desk endpoint.
    Strictly enforces demographic sandbox isolation: returns only demographic identity.
    NO clinical diagnoses, prescriptions, or encounters are returned.
    """
    clean_cnic = cnic.strip().replace("-", "")
    stmt = select(PatientProfile).where(
        (PatientProfile.cnic == cnic) |
        (PatientProfile.cnic == clean_cnic) |
        (PatientProfile.cnic_masked == cnic)
    )
    result = await db.execute(stmt)
    patient = result.scalars().first()

    if not patient:
        # Check if query matches MRN as fallback
        mrn_stmt = select(PatientProfile).where(PatientProfile.mrn == cnic)
        mrn_res = await db.execute(mrn_stmt)
        patient = mrn_res.scalars().first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No patient found matching the provided CNIC",
        )

    return PatientDemographics(
        id=patient.id,
        mrn=patient.mrn,
        name=patient.full_name or "Unknown Patient",
        age=patient.age or 0,
        gender=patient.gender or "Unknown",
        blood_group=patient.blood_group,
        cnic_masked=patient.cnic_masked,
        phone_masked=patient.phone_masked,
    )


@router.post(
    "",
    response_model=PatientDemographics,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new patient profile",
)
async def create_patient(
    payload: PatientCreate,
    db: AsyncSession = Depends(get_db),
) -> PatientDemographics:
    patient = PatientProfile(
        mrn=payload.mrn,
        cnic=payload.cnic,
        cnic_masked=payload.cnic_masked,
        phone_masked=payload.phone_masked,
        blood_group=payload.blood_group,
        full_name=payload.full_name,
        age=payload.age,
        gender=payload.gender,
        allergies=payload.allergies,
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)

    return PatientDemographics(
        id=patient.id,
        mrn=patient.mrn,
        name=patient.full_name or "Unknown Patient",
        age=patient.age or 0,
        gender=patient.gender or "Unknown",
        blood_group=patient.blood_group,
        cnic_masked=patient.cnic_masked,
        phone_masked=patient.phone_masked,
    )


@router.get(
    "/{patient_id}/dossier",
    response_model=PatientDossierResponse,
    summary="Clinical dossier guarded by 24-hour consent",
)
async def get_patient_dossier(
    patient_id: UUID,
    request: Request,
    consent: ConsentGrant = Depends(require_active_consent),
    db: AsyncSession = Depends(get_db),
) -> PatientDossierResponse:
    """
    Clinical Dossier Endpoint.
    Guarded by automated 24-hour consent / break-glass dependency.
    Fetches patient profile and all linked encounters.
    Records an immutable AuditLog entry (action_type="DOSSIER_VIEW").
    """
    stmt = (
        select(PatientProfile)
        .options(selectinload(PatientProfile.encounters))
        .where(PatientProfile.id == patient_id)
    )
    result = await db.execute(stmt)
    patient = result.scalars().first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found",
        )

    # Immutable audit trail
    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=str(consent.physician_id),
        action_type="DOSSIER_VIEW",
        patient_id=str(patient_id),
        ip_address=client_ip,
        severity="INFO",
    )

    encounters_read = [EncounterRead.model_validate(e) for e in patient.encounters]

    return PatientDossierResponse(
        patient=PatientDemographics(
            id=patient.id,
            mrn=patient.mrn,
            name=patient.full_name or "Unknown Patient",
            age=patient.age or 0,
            gender=patient.gender or "Unknown",
            blood_group=patient.blood_group,
            cnic_masked=patient.cnic_masked,
            phone_masked=patient.phone_masked,
        ),
        allergies=patient.allergies or [],
        encounters=encounters_read,
        consent={
            "grant_id": consent.id,
            "status": consent.status,
            "expires_at": consent.expires_at.isoformat() if consent.expires_at else None,
            "is_break_glass": consent.is_break_glass,
        },
    )
