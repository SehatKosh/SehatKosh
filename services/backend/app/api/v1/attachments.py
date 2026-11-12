import os
import uuid
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import log_audit_event, require_active_consent
from app.models.attachment import ClinicalAttachment
from app.models.encounter import ClinicalEncounter
from app.schemas.attachment import AttachmentRead, PresignedUrlResponse
from app.services.vault import (
    MAX_FILE_SIZE,
    compute_sha256,
    generate_presigned_download_url,
    generate_vault_s3_key,
    upload_attachment_to_vault,
    validate_file_magic_bytes,
)

router = APIRouter(prefix="/attachments", tags=["Clinical Binary Vault"])


@router.post(
    "/upload",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload binary clinical document to S3 vault",
)
async def upload_attachment(
    request: Request,
    encounter_id: UUID = Form(...),
    modality_category: str = Form("PRESCRIPTION_IMAGE"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> AttachmentRead:
    """
    Validates magic bytes, computes SHA-256, and stores in S3 vault.
    Gated: RADIOLOGY_DICOM blocked if ENABLE_LARGE_MODALITY_UPLOADS is False.
    Limit: 10 MB maximum upload size.
    """
    category = modality_category.strip().upper()

    # DICOM Gate
    if category == "RADIOLOGY_DICOM" and not getattr(settings, "ENABLE_LARGE_MODALITY_UPLOADS", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Large modality uploads (RADIOLOGY_DICOM) are currently disabled. "
                "Contact infrastructure administrator."
            ),
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)

    # 10 MB limit check
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum permissible size of {MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    # Magic byte signature check
    mime_type = file.content_type or "application/octet-stream"
    if not validate_file_magic_bytes(file_bytes, mime_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File content fails binary signature validation for MIME type '{mime_type}'. "
                "Spoofed extension rejected."
            ),
        )

    # Lookup encounter to resolve patient & facility context
    enc_stmt = select(ClinicalEncounter).where(ClinicalEncounter.id == encounter_id)
    enc_res = await db.execute(enc_stmt)
    encounter = enc_res.scalars().first()
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target clinical encounter not found",
        )

    attachment_id = uuid.uuid4()
    sha256 = compute_sha256(file_bytes)
    _, ext = os.path.splitext(file.filename or "file.bin")
    if not ext:
        ext = ".pdf" if "pdf" in mime_type else ".jpg"

    s3_key = generate_vault_s3_key(
        patient_id=encounter.patient_id,
        encounter_id=encounter.id,
        attachment_id=attachment_id,
        extension=ext,
        facility_id=encounter.facility_id,
    )

    await upload_attachment_to_vault(
        s3_key=s3_key,
        file_bytes=file_bytes,
        mime_type=mime_type,
    )

    attachment = ClinicalAttachment(
        id=attachment_id,
        encounter_id=encounter.id,
        patient_id=encounter.patient_id,
        facility_id=encounter.facility_id,
        modality_category=category,
        s3_bucket=getattr(settings, "S3_VAULT_BUCKET", "sehatkosh-vault"),
        s3_key=s3_key,
        mime_type=mime_type,
        file_size_bytes=file_size,
        sha256_hash=sha256,
        uploaded_by_role="DOCTOR",
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id="CLINICAL_STAFF",
        action_type="ATTACHMENT_UPLOAD",
        patient_id=str(encounter.patient_id),
        ip_address=client_ip,
        severity="INFO",
    )

    return attachment


@router.get(
    "/encounter/{encounter_id}",
    response_model=list[AttachmentRead],
    summary="List all attachments for an encounter",
)
async def list_encounter_attachments(
    encounter_id: UUID,
    request: Request,
    physician_id: Optional[UUID] = Query(None),
    x_patient_id: Optional[UUID] = Header(None, alias="X-Patient-Id"),
    x_physician_id: Optional[UUID] = Header(None, alias="X-Physician-Id"),
    db: AsyncSession = Depends(get_db),
) -> list[AttachmentRead]:
    """
    Returns all ClinicalAttachment metadata rows linked to encounter_id.
    Guarded by active consent session or patient self-ownership.
    """
    enc_stmt = select(ClinicalEncounter).where(ClinicalEncounter.id == encounter_id)
    enc_res = await db.execute(enc_stmt)
    encounter = enc_res.scalars().first()

    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical encounter not found",
        )

    # Validate active consent or patient ownership
    await require_active_consent(
        patient_id=encounter.patient_id,
        physician_id=physician_id,
        x_patient_id=x_patient_id,
        db=db,
        x_physician_id=x_physician_id,
    )

    stmt = select(ClinicalAttachment).where(
        ClinicalAttachment.encounter_id == encounter_id
    ).order_by(ClinicalAttachment.created_at.desc())
    res = await db.execute(stmt)
    attachments = res.scalars().all()

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=str(x_physician_id or physician_id or x_patient_id or "ANONYMOUS"),
        action_type="ATTACHMENT_LIST",
        patient_id=str(encounter.patient_id),
        ip_address=client_ip,
        severity="INFO",
    )

    return list(attachments)


@router.get(
    "/{attachment_id}/presigned-url",
    response_model=PresignedUrlResponse,
    summary="Get temporary 15-minute presigned download URL",
)
async def get_attachment_presigned_url(
    attachment_id: UUID,
    request: Request,
    physician_id: Optional[UUID] = Query(None),
    x_patient_id: Optional[UUID] = Header(None, alias="X-Patient-Id"),
    x_physician_id: Optional[UUID] = Header(None, alias="X-Physician-Id"),
    db: AsyncSession = Depends(get_db),
) -> PresignedUrlResponse:
    """
    Generates a 15-minute time-scoped S3 download URL guarded by active consent.
    """
    stmt = select(ClinicalAttachment).where(ClinicalAttachment.id == attachment_id)
    res = await db.execute(stmt)
    attachment = res.scalars().first()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clinical attachment not found",
        )

    # Validate active consent or patient ownership
    await require_active_consent(
        patient_id=attachment.patient_id,
        physician_id=physician_id,
        x_patient_id=x_patient_id,
        db=db,
        x_physician_id=x_physician_id,
    )

    url = generate_presigned_download_url(attachment.s3_key, expires_in_seconds=900)

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=str(x_physician_id or physician_id or x_patient_id or "ANONYMOUS"),
        action_type="ATTACHMENT_VIEW",
        patient_id=str(attachment.patient_id),
        ip_address=client_ip,
        severity="INFO",
    )

    return PresignedUrlResponse(
        attachment_id=attachment.id,
        presigned_url=url,
        expires_in_seconds=900,
        mime_type=attachment.mime_type,
    )
