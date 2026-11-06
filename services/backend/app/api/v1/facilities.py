import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.department import Department
from app.models.facility import Facility
from app.models.patient import PatientFacilityRecord, PatientProfile
from app.models.queue import TriageQueueEntry
from app.models.staff import Practitioner
from app.schemas.facility import (
    DepartmentResponse,
    FacilityResponse,
    PatientFacilityRecordResponse,
    PractitionerResponse,
    TriageEnqueueRequest,
    TriageQueueItemResponse,
)

router = APIRouter(prefix="/facilities", tags=["Facilities & Multi-Tenancy"])


@router.get(
    "",
    response_model=List[FacilityResponse],
    summary="List active healthcare institutions",
)
async def list_facilities(
    db: AsyncSession = Depends(get_db),
) -> List[FacilityResponse]:
    """Retrieves all registered, active hospital and clinic tenants."""
    stmt = select(Facility).where(Facility.is_active == True).order_by(Facility.name.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get(
    "/{facility_id}",
    response_model=FacilityResponse,
    summary="Get healthcare facility details",
)
async def get_facility(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> FacilityResponse:
    """Retrieves metadata and status of a specific facility."""
    stmt = select(Facility).where(Facility.id == facility_id)
    result = await db.execute(stmt)
    facility = result.scalars().first()
    if not facility:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facility not found",
        )
    return facility


@router.get(
    "/{facility_id}/departments",
    response_model=List[DepartmentResponse],
    summary="List facility departments and wards",
)
async def list_facility_departments(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> List[DepartmentResponse]:
    """Retrieves active wards and clinics (OPD, Emergency, Cardiology, etc.) for a facility."""
    # Verify facility exists
    facility_stmt = select(Facility).where(Facility.id == facility_id)
    facility_res = await db.execute(facility_stmt)
    if not facility_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facility not found",
        )

    stmt = (
        select(Department)
        .where(Department.facility_id == facility_id, Department.is_active == True)
        .order_by(Department.name.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get(
    "/{facility_id}/practitioners",
    response_model=List[PractitionerResponse],
    summary="List staff & practitioners affiliated with facility",
)
async def list_facility_practitioners(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> List[PractitionerResponse]:
    """Retrieves registered practitioners and clinical staff for a facility."""
    stmt = (
        select(Practitioner)
        .where(Practitioner.facility_id == facility_id, Practitioner.is_active == True)
        .order_by(Practitioner.designation.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get(
    "/{facility_id}/queue",
    response_model=List[TriageQueueItemResponse],
    summary="Fetch live departmental waiting queue for a facility",
)
async def get_facility_queue(
    facility_id: uuid.UUID,
    department_id: Optional[uuid.UUID] = Query(None, description="Optional filter by department"),
    status_filter: Optional[str] = Query("WAITING", alias="status", description="Queue status filter"),
    x_facility_id: Optional[str] = Header(None, alias="X-Facility-ID"),
    db: AsyncSession = Depends(get_db),
) -> List[TriageQueueItemResponse]:
    """
    Enforces institutional data isolation:
    A caller affiliated with Facility A cannot inspect the internal queue of Facility B.
    """
    if x_facility_id:
        try:
            req_fac_uuid = uuid.UUID(x_facility_id)
            if req_fac_uuid != facility_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-facility access denied: Active facility context does not match target facility",
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Facility-ID header format",
            )

    # Verify facility exists
    facility_stmt = select(Facility).where(Facility.id == facility_id)
    fac_res = await db.execute(facility_stmt)
    facility = fac_res.scalars().first()
    if not facility:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facility not found",
        )

    stmt = (
        select(TriageQueueEntry, PatientProfile)
        .join(PatientProfile, TriageQueueEntry.patient_id == PatientProfile.id)
        .where(TriageQueueEntry.facility_id == facility_id)
    )

    if department_id:
        stmt = stmt.where(TriageQueueEntry.department_id == department_id)
    if status_filter:
        stmt = stmt.where(TriageQueueEntry.status == status_filter)

    # Order priority: CRITICAL_RESUSCITATION > URGENT > ROUTINE, then admitted_at
    stmt = stmt.order_by(
        TriageQueueEntry.triage_priority.desc(),
        TriageQueueEntry.admitted_at.asc(),
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Pre-fetch local MRNs for this facility
    patient_ids = [p.id for _, p in rows]
    mrn_map = {}
    if patient_ids:
        pfr_stmt = select(PatientFacilityRecord).where(
            PatientFacilityRecord.facility_id == facility_id,
            PatientFacilityRecord.patient_id.in_(patient_ids),
        )
        pfr_res = await db.execute(pfr_stmt)
        for r in pfr_res.scalars().all():
            mrn_map[r.patient_id] = r.local_mrn

    items: List[TriageQueueItemResponse] = []
    for entry, patient in rows:
        items.append(
            TriageQueueItemResponse(
                id=entry.id,
                facility_id=entry.facility_id,
                department_id=entry.department_id,
                patient_id=entry.patient_id,
                token_number=entry.token_number,
                triage_priority=entry.triage_priority,
                status=entry.status,
                vitals_snapshot=entry.vitals_snapshot,
                chief_complaint=entry.chief_complaint,
                practitioner_id=entry.practitioner_id,
                admitted_at=entry.admitted_at,
                patient_name=patient.full_name or "Unknown Patient",
                patient_mrn=patient.mrn,
                local_mrn=mrn_map.get(patient.id, patient.mrn),
                cnic_masked=patient.cnic_masked,
            )
        )

    return items


@router.post(
    "/{facility_id}/queue",
    response_model=TriageQueueItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enqueue patient into triage queue with auto-MRN provisioning",
)
async def enqueue_patient(
    facility_id: uuid.UUID,
    payload: TriageEnqueueRequest,
    x_facility_id: Optional[str] = Header(None, alias="X-Facility-ID"),
    db: AsyncSession = Depends(get_db),
) -> TriageQueueItemResponse:
    """
    Intake desk triage intake:
    1. Verifies facility and department exist.
    2. Validates institutional boundary if X-Facility-ID is provided.
    3. Auto-provisions local facility MRN if first visit to this facility.
    4. Generates daily sequential token number.
    5. Persists TriageQueueEntry.
    """
    if x_facility_id:
        try:
            req_fac_uuid = uuid.UUID(x_facility_id)
            if req_fac_uuid != facility_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-facility access denied: Active facility context does not match target facility",
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Facility-ID header format",
            )

    # Verify facility
    fac_stmt = select(Facility).where(Facility.id == facility_id)
    fac_res = await db.execute(fac_stmt)
    facility = fac_res.scalars().first()
    if not facility:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facility not found",
        )

    # Verify department
    dept_stmt = select(Department).where(
        Department.id == payload.department_id,
        Department.facility_id == facility_id,
    )
    dept_res = await db.execute(dept_stmt)
    department = dept_res.scalars().first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found within this facility",
        )

    # Verify patient
    pat_stmt = select(PatientProfile).where(PatientProfile.id == payload.patient_id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalars().first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found",
        )

    # 1. Resolve or Auto-Provision Local MRN
    pfr_stmt = select(PatientFacilityRecord).where(
        PatientFacilityRecord.facility_id == facility_id,
        PatientFacilityRecord.patient_id == patient.id,
    )
    pfr_res = await db.execute(pfr_stmt)
    pfr = pfr_res.scalars().first()

    if not pfr:
        # Count existing facility records to determine sequential suffix
        count_stmt = select(func.count(PatientFacilityRecord.id)).where(
            PatientFacilityRecord.facility_id == facility_id
        )
        count_res = await db.execute(count_stmt)
        record_count = count_res.scalar() or 0
        local_mrn = f"{facility.code}-2026-{(record_count + 1):04d}"

        pfr = PatientFacilityRecord(
            id=uuid.uuid4(),
            patient_id=patient.id,
            facility_id=facility_id,
            local_mrn=local_mrn,
            registered_at=datetime.now(timezone.utc),
        )
        db.add(pfr)
        await db.flush()

    # 2. Generate Department Sequential Token Number
    token_count_stmt = select(func.count(TriageQueueEntry.id)).where(
        TriageQueueEntry.facility_id == facility_id,
        TriageQueueEntry.department_id == department.id,
    )
    token_count_res = await db.execute(token_count_stmt)
    token_count = token_count_res.scalar() or 0
    token_number = f"{department.code}-{(token_count + 1):03d}"

    # 3. Create Queue Entry
    queue_entry = TriageQueueEntry(
        id=uuid.uuid4(),
        facility_id=facility_id,
        department_id=department.id,
        patient_id=patient.id,
        token_number=token_number,
        triage_priority=payload.triage_priority or "ROUTINE",
        status="WAITING",
        vitals_snapshot=payload.vitals_snapshot,
        chief_complaint=payload.chief_complaint,
        practitioner_id=payload.practitioner_id,
        admitted_at=datetime.now(timezone.utc),
    )
    db.add(queue_entry)
    await db.commit()
    await db.refresh(queue_entry)

    return TriageQueueItemResponse(
        id=queue_entry.id,
        facility_id=queue_entry.facility_id,
        department_id=queue_entry.department_id,
        patient_id=queue_entry.patient_id,
        token_number=queue_entry.token_number,
        triage_priority=queue_entry.triage_priority,
        status=queue_entry.status,
        vitals_snapshot=queue_entry.vitals_snapshot,
        chief_complaint=queue_entry.chief_complaint,
        practitioner_id=queue_entry.practitioner_id,
        admitted_at=queue_entry.admitted_at,
        patient_name=patient.full_name or "Unknown Patient",
        patient_mrn=patient.mrn,
        local_mrn=pfr.local_mrn,
        cnic_masked=patient.cnic_masked,
    )

