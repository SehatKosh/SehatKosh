from datetime import date, datetime, timezone
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
from app.schemas.clinical import AmendmentCreate
from app.schemas.encounter import EncounterCreate, EncounterRead, EncounterUpdate

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

    finalized_time = (
        datetime.now(timezone.utc) if payload.status == "FINALIZED" else None
    )

    encounter = ClinicalEncounter(
        patient_id=payload.patient_id,
        facility_id=payload.facility_id,
        practitioner_id=payload.practitioner_id,
        physician_name=payload.physician_name,
        facility_name=payload.facility_name,
        encounter_date=payload.encounter_date,
        encounter_class=payload.encounter_class,
        triage_priority=payload.triage_priority,
        source_type=payload.source_type,
        verification_status=payload.verification_status,
        status=payload.status,
        vitals_snapshot=payload.vitals_snapshot,
        soap_subjective=payload.soap_subjective,
        soap_objective=payload.soap_objective,
        soap_assessment=payload.soap_assessment,
        soap_plan=payload.soap_plan,
        soap_notes=payload.soap_notes,
        fhir_bundle=payload.fhir_bundle,
        document_s3_key=payload.document_s3_key,
        finalized_at=finalized_time,
    )
    db.add(encounter)
    await db.commit()
    await db.refresh(encounter)

    # Log immutable audit event
    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=payload.physician_name or "SYSTEM",
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


@router.put(
    "/{encounter_id}",
    response_model=EncounterRead,
    summary="Update clinical encounter (draft only)",
)
@router.patch(
    "/{encounter_id}",
    response_model=EncounterRead,
    summary="Patch clinical encounter (draft only)",
)
async def update_encounter(
    encounter_id: UUID,
    payload: EncounterUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> EncounterRead:
    """
    Enforces encounter immutability:
    If encounter is FINALIZED, raises HTTP 409 Conflict.
    Amendments must be submitted via POST /encounters/{id}/amend instead.
    """
    stmt = select(ClinicalEncounter).where(ClinicalEncounter.id == encounter_id)
    result = await db.execute(stmt)
    encounter = result.scalars().first()
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical encounter not found",
        )

    if encounter.status == "FINALIZED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Finalized clinical encounters are immutable. Submit an amendment instead.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(encounter, field, value)

    await db.commit()
    await db.refresh(encounter)

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=encounter.physician_name or "SYSTEM",
        action_type="ENCOUNTER_UPDATE",
        patient_id=str(encounter.patient_id),
        ip_address=client_ip,
        severity="INFO",
    )

    return encounter


@router.post(
    "/{encounter_id}/amend",
    response_model=EncounterRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an append-only amendment to a finalized encounter",
)
async def amend_encounter(
    encounter_id: UUID,
    payload: AmendmentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> EncounterRead:
    """
    Creates an append-only child encounter linking back to parent_encounter_id.
    Marks the child encounter as status='AMENDED'.
    """
    stmt = select(ClinicalEncounter).where(ClinicalEncounter.id == encounter_id)
    result = await db.execute(stmt)
    parent = result.scalars().first()
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent clinical encounter not found",
        )

    child_encounter = ClinicalEncounter(
        patient_id=parent.patient_id,
        facility_id=parent.facility_id,
        practitioner_id=parent.practitioner_id,
        parent_encounter_id=parent.id,
        source_type=parent.source_type,
        verification_status="CLINICIAN_VERIFIED",
        encounter_class=parent.encounter_class,
        triage_priority=parent.triage_priority,
        status="AMENDED",
        encounter_date=date.today(),
        physician_name=payload.physician_name or parent.physician_name,
        facility_name=parent.facility_name,
        soap_subjective=payload.soap_subjective or parent.soap_subjective,
        soap_objective=payload.soap_objective or parent.soap_objective,
        soap_assessment=payload.soap_assessment or parent.soap_assessment,
        soap_plan=payload.soap_plan or parent.soap_plan,
        soap_notes=parent.soap_notes,
        fhir_bundle=parent.fhir_bundle,
        vitals_snapshot=parent.vitals_snapshot,
        finalized_at=datetime.now(timezone.utc),
    )
    db.add(child_encounter)
    await db.commit()
    await db.refresh(child_encounter)

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=child_encounter.physician_name or "CLINICIAN",
        action_type="ENCOUNTER_AMEND",
        patient_id=str(parent.patient_id),
        ip_address=client_ip,
        severity="INFO",
    )

    return child_encounter


@router.post(
    "/{encounter_id}/finalize",
    response_model=EncounterRead,
    summary="Lock and finalize encounter record",
)
async def finalize_encounter(
    encounter_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> EncounterRead:
    """
    Transitions encounter status to FINALIZED and sets finalized_at timestamp.
    """
    stmt = select(ClinicalEncounter).where(ClinicalEncounter.id == encounter_id)
    result = await db.execute(stmt)
    encounter = result.scalars().first()
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical encounter not found",
        )

    encounter.status = "FINALIZED"
    encounter.finalized_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(encounter)

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=encounter.physician_name or "SYSTEM",
        action_type="ENCOUNTER_FINALIZE",
        patient_id=str(encounter.patient_id),
        ip_address=client_ip,
        severity="INFO",
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
