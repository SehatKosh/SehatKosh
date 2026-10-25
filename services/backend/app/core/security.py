from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.consent import ConsentGrant


async def require_active_consent(
    patient_id: UUID,
    physician_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    x_physician_id: Optional[UUID] = Header(None, alias="X-Physician-Id"),
) -> ConsentGrant:
    """
    Enforces active 24-hour consent or active emergency break-glass grant.
    Raises 403 Forbidden if consent is missing, inactive, or expired.
    """
    effective_physician_id = physician_id or x_physician_id
    if not effective_physician_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active consent session found",
        )

    stmt = (
        select(ConsentGrant)
        .where(
            ConsentGrant.patient_id == patient_id,
            ConsentGrant.physician_id == effective_physician_id,
        )
        .order_by(ConsentGrant.granted_at.desc())
    )
    result = await db.execute(stmt)
    grant = result.scalars().first()

    if not grant:
        await log_audit_event(
            db=db,
            actor_id=str(effective_physician_id),
            action_type="UNAUTHORIZED_ACCESS_ATTEMPT",
            patient_id=str(patient_id),
            severity="WARNING",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active consent session found",
        )

    now = datetime.now(timezone.utc)
    expires = grant.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if (expires < now or grant.status == "expired") and grant.is_break_glass is False:
        if grant.status != "expired":
            grant.status = "expired"
            await db.commit()
        await log_audit_event(
            db=db,
            actor_id=str(effective_physician_id),
            action_type="CONSENT_EXPIRED_ACCESS_ATTEMPT",
            patient_id=str(patient_id),
            severity="WARNING",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Consent session expired. Re-authorization required.",
        )

    if grant.status != "active":
        await log_audit_event(
            db=db,
            actor_id=str(effective_physician_id),
            action_type="UNAUTHORIZED_ACCESS_ATTEMPT",
            patient_id=str(patient_id),
            severity="WARNING",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active consent session found",
        )

    return grant


async def log_audit_event(
    db: AsyncSession,
    actor_id: str,
    action_type: str,
    patient_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    severity: str = "INFO",
) -> AuditLog:
    """
    Writes an immutable audit log entry into PostgreSQL.
    """
    entry = AuditLog(
        actor_id=str(actor_id),
        patient_id=str(patient_id) if patient_id else None,
        action_type=action_type,
        ip_address=ip_address,
        severity=severity,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
