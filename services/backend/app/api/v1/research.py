import csv
import io
import json
from typing import AsyncGenerator, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import log_audit_event
from app.models.patient import PatientProfile
from app.schemas.research import CohortFilterRequest
from app.services.anonymizer import sanitize_patient_record

router = APIRouter(prefix="/research", tags=["Research"])


async def json_streamer(records: list) -> AsyncGenerator[str, None]:
    yield "[\n"
    for i, r in enumerate(records):
        line = json.dumps(r, default=str)
        if i < len(records) - 1:
            line += ",\n"
        else:
            line += "\n"
        yield line
    yield "]"


async def csv_streamer(records: list) -> AsyncGenerator[str, None]:
    output = io.StringIO()
    writer = csv.writer(output)
    headers = [
        "research_id",
        "age_bracket",
        "gender",
        "blood_group",
        "allergies",
        "diagnoses",
        "medications",
        "encounter_count",
    ]
    writer.writerow(headers)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)

    for r in records:
        writer.writerow([
            r.get("research_id", ""),
            r.get("age_bracket", ""),
            r.get("gender", ""),
            r.get("blood_group", ""),
            "; ".join(r.get("allergies", [])),
            "; ".join(r.get("diagnoses", [])),
            "; ".join(r.get("medications", [])),
            r.get("encounter_count", 0),
        ])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)


@router.post(
    "/export",
    summary="Export de-identified research dataset (FR-SEC-03)",
)
async def export_research_data(
    payload: Optional[CohortFilterRequest] = None,
    db: AsyncSession = Depends(get_db),
    x_researcher_id: Optional[UUID] = Header(None, alias="X-Researcher-Id"),
    x_actor_id: Optional[str] = Header(None, alias="X-Actor-Id"),
):
    """
    Exports a de-identified cohort with:
    - 5-year age binning (FR-SEC-03)
    - Stripped PII direct identifiers
    - Ephemeral deterministic salted pseudo-IDs
    - Aggregated diagnoses and medications
    - Streams in JSON or CSV
    - Emits immutable audit log entry (RESEARCH_DATA_EXPORT)
    """
    if payload is None:
        payload = CohortFilterRequest()

    stmt = select(PatientProfile).options(selectinload(PatientProfile.encounters))

    # Apply database filters
    if payload.gender and payload.gender.strip().lower() != "all":
        stmt = stmt.where(func.lower(PatientProfile.gender) == payload.gender.strip().lower())

    if payload.blood_group and payload.blood_group.strip().lower() != "all":
        stmt = stmt.where(func.lower(PatientProfile.blood_group) == payload.blood_group.strip().lower())

    result = await db.execute(stmt)
    patients = result.scalars().all()

    # Sanitize each record and apply condition filter if specified
    deidentified_records = []
    condition_needle = (payload.condition or "").strip().lower()

    for p in patients:
        rec = sanitize_patient_record(p, p.encounters)
        if condition_needle and condition_needle != "all":
            # Match condition across diagnoses or medications
            matches_diag = any(condition_needle in d.lower() for d in rec.get("diagnoses", []))
            matches_med = any(condition_needle in m.lower() for m in rec.get("medications", []))
            if not (matches_diag or matches_med):
                continue
        deidentified_records.append(rec)

    # Emit audit log
    actor = str(x_researcher_id or x_actor_id or "researcher-system")
    await log_audit_event(
        db=db,
        actor_id=actor,
        action_type="RESEARCH_DATA_EXPORT",
        severity="INFO",
    )

    fmt = (payload.format or "json").lower()
    if fmt == "csv":
        return StreamingResponse(
            csv_streamer(deidentified_records),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=deidentified_research_cohort.csv"},
        )

    return StreamingResponse(
        json_streamer(deidentified_records),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=deidentified_research_cohort.json"},
    )
