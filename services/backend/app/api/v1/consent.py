import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import log_audit_event
from app.models.consent import ConsentGrant
from app.models.patient import PatientProfile
from app.schemas.consent import (
    BreakGlassRequest,
    ConsentCheckResponse,
    ConsentGrantCreate,
    ConsentGrantRead,
)

router = APIRouter(prefix="/consent", tags=["Consent Management"])


@router.post(
    "/grant",
    response_model=ConsentGrantRead,
    status_code=status.HTTP_201_CREATED,
    summary="Issue or extend a 24-hour consent grant",
)
async def create_consent_grant(
    payload: ConsentGrantCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ConsentGrantRead:
    """
    Grants a physician temporary access (default 24h) to patient clinical records.
    """
    # Verify or ensure patient exists
    p_stmt = select(PatientProfile).where(PatientProfile.id == payload.patient_id)
    p_res = await db.execute(p_stmt)
    patient = p_res.scalars().first()
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

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=payload.validity_hours)

    grant = ConsentGrant(
        patient_id=payload.patient_id,
        physician_id=payload.physician_id,
        status="active",
        granted_at=now,
        expires_at=expires_at,
        is_break_glass=False,
    )
    db.add(grant)
    await db.commit()
    await db.refresh(grant)

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=str(payload.physician_id),
        action_type="CONSENT_DISPATCH",
        patient_id=str(payload.patient_id),
        ip_address=client_ip,
        severity="INFO",
    )

    return grant


@router.post(
    "/break-glass",
    response_model=ConsentGrantRead,
    status_code=status.HTTP_201_CREATED,
    summary="Execute emergency break-glass consent override",
)
async def break_glass_override(
    payload: BreakGlassRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ConsentGrantRead:
    """
    Creates an emergency 2-hour access grant bypassing normal patient consent.
    Requires minimum 20 character clinical justification.
    Generates a CRITICAL severity AuditLog entry.
    """
    # Verify or ensure patient exists
    p_stmt = select(PatientProfile).where(PatientProfile.id == payload.patient_id)
    p_res = await db.execute(p_stmt)
    patient = p_res.scalars().first()
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

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=2)
    physician_id = payload.physician_id or uuid.uuid4()

    grant = ConsentGrant(
        patient_id=payload.patient_id,
        physician_id=physician_id,
        status="active",
        granted_at=now,
        expires_at=expires_at,
        is_break_glass=True,
        justification=(
            f"TREAT-DOC: {payload.treating_physician_name} | "
            f"WITNESS: {payload.witness_staff_id} | "
            f"REASON: {payload.justification}"
        ),
    )
    db.add(grant)
    await db.commit()
    await db.refresh(grant)

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=f"{payload.treating_physician_name} ({payload.witness_staff_id})",
        action_type="BREAK_GLASS_OVERRIDE",
        patient_id=str(payload.patient_id),
        ip_address=client_ip,
        severity="CRITICAL",
    )

    return grant


@router.get(
    "/check",
    response_model=ConsentCheckResponse,
    summary="Check active consent status for patient and physician",
)
async def check_consent(
    patient_id: UUID = Query(...),
    physician_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
) -> ConsentCheckResponse:
    stmt = (
        select(ConsentGrant)
        .where(
            ConsentGrant.patient_id == patient_id,
            ConsentGrant.physician_id == physician_id,
        )
        .order_by(ConsentGrant.granted_at.desc())
    )
    result = await db.execute(stmt)
    grant = result.scalars().first()

    if not grant or grant.status != "active":
        return ConsentCheckResponse(
            active=False,
            message="No active consent found",
        )

    now = datetime.now(timezone.utc)
    expires = grant.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if expires < now and not grant.is_break_glass:
        grant.status = "expired"
        await db.commit()
        return ConsentCheckResponse(
            active=False,
            grant_id=grant.id,
            expires_at=grant.expires_at,
            is_break_glass=grant.is_break_glass,
            message="Consent session expired",
        )

    return ConsentCheckResponse(
        active=True,
        grant_id=grant.id,
        expires_at=grant.expires_at,
        is_break_glass=grant.is_break_glass,
        message="Consent active",
    )
