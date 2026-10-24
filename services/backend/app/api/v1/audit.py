from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.audit import AuditLog

router = APIRouter(prefix="/audit", tags=["Security & Audit Logs"])


class AuditLogResponse(BaseModel):
    id: UUID
    actor_id: str
    patient_id: Optional[str] = None
    action_type: str
    ip_address: Optional[str] = None
    severity: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get(
    "/logs",
    response_model=List[AuditLogResponse],
    summary="List immutable security and compliance audit logs",
)
async def list_audit_logs(
    limit: int = Query(default=100, le=500),
    severity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> List[AuditLogResponse]:
    stmt = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    if severity:
        stmt = stmt.where(AuditLog.severity == severity.upper())

    result = await db.execute(stmt)
    return list(result.scalars().all())
