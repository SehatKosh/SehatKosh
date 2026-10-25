from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import log_audit_event, require_active_consent
from app.models.consent import ConsentGrant
from app.models.encounter import ClinicalEncounter
from app.models.patient import PatientProfile
from app.schemas.encounter import EncounterCreate, EncounterRead

router = APIRouter(prefix="/encounters", tags=["Clinical Encounters"])


@router.post(
    "",
    response_model=EncounterRead,
    status_code=status.HTTP_201_CREATED,
    summary="Save a verified clinical encounter and FHIR bundle",
)
async def create_encounter(
    payload: EncounterCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> EncounterRead:
    """
    Persists a verified clinical encounter with its FHIR bundle.
    Automatically generates an immutable AuditLog entry (action_type="ENCOUNTER_CREATE").
    """
    # Verify patient exists or auto-register if missing in dev/test
    patient_res = await db.execute(
        select(PatientProfile).where(PatientProfile.id == payload.patient_id)
    )
    patient = patient_res.scalars().first()
    if not patient:
        # Create minimal patient profile to prevent orphan encounters in initial ingestion
        patient = PatientProfile(
            id=payload.patient_id,
            mrn=f"MRN-{str(payload.patient_id)[:8].upper()}",
            cnic_masked="XXXXX-XXXXXXX-X",
            phone_masked="+92 XXX XXXXXXX",
            blood_group="Unknown",
            allergies=[],
        )
        db.add(patient)
        await db.flush()

    encounter = ClinicalEncounter(
        patient_id=payload.patient_id,
        physician_name=payload.physician_name,
        facility_name=payload.facility_name,
        encounter_date=payload.encounter_date,
        soap_notes=payload.soap_notes,
        fhir_bundle=payload.fhir_bundle,
        document_s3_key=payload.document_s3_key,
    )
    db.add(encounter)
    await db.commit()
    await db.refresh(encounter)

    # Log immutable audit event
    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=payload.physician_name,
        action_type="ENCOUNTER_CREATE",
        patient_id=str(payload.patient_id),
        ip_address=client_ip,
        severity="INFO",
    )

    return encounter


@router.get(
    "/{encounter_id}",
    response_model=EncounterRead,
    summary="Fetch an encounter by UUID",
)
async def get_encounter(
    encounter_id: UUID,
    physician_id: Optional[UUID] = Query(None),
    x_patient_id: Optional[UUID] = Header(None, alias="X-Patient-Id"),
    x_physician_id: Optional[UUID] = Header(None, alias="X-Physician-Id"),
    db: AsyncSession = Depends(get_db),
) -> EncounterRead:
    """
    Retrieves clinical encounter by UUID.
    Guards access with active consent validation or record ownership (BOLA / IDOR protection).
    """
    stmt = select(ClinicalEncounter).where(ClinicalEncounter.id == encounter_id)
    result = await db.execute(stmt)
    encounter = result.scalars().first()
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical encounter not found",
        )

    # Validate active consent session or patient ownership
    await require_active_consent(
        patient_id=encounter.patient_id,
        physician_id=physician_id,
        x_patient_id=x_patient_id,
        db=db,
        x_physician_id=x_physician_id,
    )

    return encounter


@router.get(
    "/patient/{patient_id}",
    response_model=List[EncounterRead],
    summary="List all encounters for a given patient",
)
async def list_patient_encounters(
    patient_id: UUID,
    consent: Optional[ConsentGrant] = Depends(require_active_consent),
    db: AsyncSession = Depends(get_db),
) -> List[EncounterRead]:
    """
    Lists clinical encounters for a patient.
    Requires active consent grant for physician or patient record ownership (BOLA / IDOR protection).
    """
    stmt = (
        select(ClinicalEncounter)
        .where(ClinicalEncounter.patient_id == patient_id)
        .order_by(ClinicalEncounter.encounter_date.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
