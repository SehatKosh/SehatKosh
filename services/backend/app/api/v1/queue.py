from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.consent import ConsentGrant
from app.models.patient import PatientProfile
from app.schemas.queue import QueueItemResponse

router = APIRouter(prefix="/queue", tags=["Doctor Queue"])


@router.get(
    "/active",
    response_model=List[QueueItemResponse],
    summary="Fetch active consultation queue for a physician",
    description=(
        "Retrieves active, unexpired patient consultation sessions "
        "linked via active consent grants for the specified physician."
    ),
)
async def get_active_queue(
    physician_id: UUID = Query(..., description="Physician UUID to query queue for"),
    db: AsyncSession = Depends(get_db),
) -> List[QueueItemResponse]:
    now = datetime.now(timezone.utc)

    stmt = (
        select(ConsentGrant, PatientProfile)
        .join(PatientProfile, ConsentGrant.patient_id == PatientProfile.id)
        .where(
            ConsentGrant.physician_id == physician_id,
            ConsentGrant.status == "active",
            ConsentGrant.expires_at > now,
        )
        .order_by(ConsentGrant.granted_at.desc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    queue_items: List[QueueItemResponse] = []
    for grant, patient in rows:
        queue_items.append(
            QueueItemResponse(
                id=patient.id,
                mrn=patient.mrn,
                patient_name=patient.full_name or "Unknown Patient",
                cnic_masked=patient.cnic_masked,
                blood_group=patient.blood_group,
                consent_id=grant.id,
                consent_granted_at=grant.granted_at,
                consent_expires_at=grant.expires_at,
                is_break_glass=grant.is_break_glass,
                status="waiting",
            )
        )

    return queue_items
