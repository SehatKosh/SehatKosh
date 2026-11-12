import json
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import log_audit_event
from app.models.encounter import ClinicalEncounter
from app.models.patient import PatientProfile
from app.models.staging import IngestionStagingRecord
from app.modules.ingestion.registry import get_ingest_adapter
from app.schemas.encounter import EncounterRead
from app.schemas.staging import (
    StagingPromoteRequest,
    StagingRecordRead,
    StagingUploadResponse,
)

router = APIRouter(prefix="/ingestion", tags=["Quarantine Ingestion Pipeline"])


@router.post(
    "/upload",
    response_model=StagingUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload external hospital data into quarantine staging",
)
async def upload_for_ingestion(
    request: Request,
    adapter_name: Optional[str] = Form(None),
    facility_id: Optional[UUID] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
) -> StagingUploadResponse:
    """
    Quarantines raw hospital documents (FHIR JSON, CSV, PDF) in ingestion_staging_records.
    Never persists unvalidated external data directly into clinical_encounters.
    """
    raw_content: bytes | dict = b""
    resolved_adapter = adapter_name or "external_fhir"
    resolved_facility = facility_id

    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            body = await request.json()
            resolved_adapter = body.get("adapter_name", resolved_adapter)
            if body.get("facility_id"):
                resolved_facility = UUID(str(body.get("facility_id")))
            raw_content = body.get("payload") or body.get("raw_payload") or body
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Malformed JSON body: {str(e)}",
            )
    elif file is not None:
        raw_content = await file.read()
    else:
        # Check if form data or empty
        body_bytes = await request.body()
        if body_bytes:
            try:
                raw_content = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                raw_content = body_bytes
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file or JSON payload provided for ingestion",
            )

    adapter = get_ingest_adapter(resolved_adapter)
    fhir_bundle, errors = await adapter.parse_to_fhir(raw_content)

    staging_status = "VALIDATION_FAILED" if errors else "QUARANTINED"
    payload_to_store = raw_content if isinstance(raw_content, dict) else {"raw_bytes_len": len(raw_content)}

    staging_rec = IngestionStagingRecord(
        source_facility_id=resolved_facility,
        adapter_name=resolved_adapter,
        schema_version="1.0",
        raw_payload=payload_to_store,
        normalized_fhir_preview=fhir_bundle if not errors else None,
        validation_errors=errors,
        status=staging_status,
    )
    db.add(staging_rec)
    await db.commit()
    await db.refresh(staging_rec)

    return StagingUploadResponse(
        id=staging_rec.id,
        source_facility_id=staging_rec.source_facility_id,
        adapter_name=staging_rec.adapter_name,
        status=staging_rec.status,
        validation_errors=staging_rec.validation_errors or [],
        normalized_fhir_preview=staging_rec.normalized_fhir_preview,
        created_at=staging_rec.created_at,
    )


@router.post(
    "/{staging_id}/promote",
    response_model=EncounterRead,
    status_code=status.HTTP_201_CREATED,
    summary="Promote validated quarantined record to clinical encounter",
)
async def promote_staging_record(
    staging_id: UUID,
    payload: StagingPromoteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> EncounterRead:
    """
    Promotes a quarantined staging record to a finalized ClinicalEncounter.
    Enforces that staging record status == "QUARANTINED".
    """
    stmt = select(IngestionStagingRecord).where(IngestionStagingRecord.id == staging_id)
    res = await db.execute(stmt)
    staging_rec = res.scalars().first()

    if not staging_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quarantine staging record not found",
        )

    if staging_rec.status != "QUARANTINED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only records in 'QUARANTINED' status can be promoted. Current status is '{staging_rec.status}'.",
        )

    if not staging_rec.normalized_fhir_preview:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Staging record contains no normalized FHIR bundle to promote.",
        )

    # Ensure patient exists
    pat_stmt = select(PatientProfile).where(PatientProfile.id == payload.patient_id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalars().first()
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

    enc_date = payload.encounter_date or date.today()

    encounter = ClinicalEncounter(
        patient_id=payload.patient_id,
        facility_id=staging_rec.source_facility_id,
        practitioner_id=payload.practitioner_id,
        source_type="HOSPITAL_PLUGIN_IMPORT",
        verification_status="CLINICIAN_VERIFIED",
        encounter_class="OPD",
        status="FINALIZED",
        encounter_date=enc_date,
        physician_name="Importing Clinician",
        facility_name="Imported Facility",
        fhir_bundle=staging_rec.normalized_fhir_preview,
        finalized_at=datetime.now(timezone.utc),
    )
    db.add(encounter)
    await db.flush()

    staging_rec.status = "PROMOTED"
    staging_rec.promoted_encounter_id = encounter.id

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id="INGESTION_PIPELINE",
        action_type="STAGING_PROMOTE",
        patient_id=str(payload.patient_id),
        ip_address=client_ip,
        severity="INFO",
    )

    await db.commit()
    await db.refresh(encounter)

    return encounter


@router.get(
    "/{staging_id}",
    response_model=StagingRecordRead,
    summary="Get staging record details",
)
async def get_staging_record(
    staging_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> StagingRecordRead:
    """Fetch staging record by ID."""
    stmt = select(IngestionStagingRecord).where(IngestionStagingRecord.id == staging_id)
    res = await db.execute(stmt)
    staging_rec = res.scalars().first()
    if not staging_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staging record not found",
        )
    return staging_rec
