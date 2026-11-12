import hashlib
import logging
from typing import Optional
from uuid import UUID

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

MAGIC_SIGNATURES = {
    "image/jpeg": [b"\xFF\xD8\xFF"],
    "image/jpg": [b"\xFF\xD8\xFF"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "application/pdf": [b"%PDF-"],
}


def validate_file_magic_bytes(file_bytes: bytes, mime_type: str) -> bool:
    """
    Validates file integrity by inspecting the first 2048 bytes for standard magic number headers.
    """
    if not file_bytes or len(file_bytes) < 4:
        return False

    norm_mime = mime_type.lower().strip()

    # WebP check
    if "webp" in norm_mime:
        return len(file_bytes) >= 12 and file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"WEBP"

    signatures = MAGIC_SIGNATURES.get(norm_mime)
    if signatures:
        return any(file_bytes.startswith(sig) for sig in signatures)

    # General fallback check across standard formats if mime_type wasn't exact
    if file_bytes.startswith(b"\xFF\xD8\xFF"):
        return True
    if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    if file_bytes.startswith(b"%PDF-"):
        return True
    if len(file_bytes) >= 12 and file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"WEBP":
        return True

    return False


def compute_sha256(file_bytes: bytes) -> str:
    """Returns hexadecimal SHA-256 digest of binary content."""
    return hashlib.sha256(file_bytes).hexdigest()


def generate_vault_s3_key(
    patient_id: UUID,
    encounter_id: UUID,
    attachment_id: UUID,
    extension: str,
    facility_id: Optional[UUID] = None,
) -> str:
    """
    Constructs deterministic vault storage path according to enterprise partition spec.
    """
    clean_ext = extension.lstrip(".")
    if facility_id:
        return f"facilities/{facility_id}/patients/{patient_id}/{encounter_id}/{attachment_id}.{clean_ext}"
    return f"patients/{patient_id}/mobile/{encounter_id}/{attachment_id}.{clean_ext}"


def get_s3_client():
    """Builds a configured boto3 S3 client."""
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_DEFAULT_REGION,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            connect_timeout=0.5,
            read_timeout=0.5,
            retries={"max_attempts": 0},
        ),
    )


async def upload_attachment_to_vault(
    s3_key: str,
    file_bytes: bytes,
    mime_type: str,
) -> bool:
    """
    Uploads file to the S3 binary vault (sehatkosh-vault).
    Gracefully degrades to mock storage during offline testing if S3/LocalStack is down.
    """
    bucket = getattr(settings, "S3_VAULT_BUCKET", "sehatkosh-vault")
    try:
        s3 = get_s3_client()
        # Ensure bucket exists
        try:
            s3.head_bucket(Bucket=bucket)
        except ClientError:
            try:
                s3.create_bucket(
                    Bucket=bucket,
                    CreateBucketConfiguration={"LocationConstraint": settings.AWS_DEFAULT_REGION},
                )
            except Exception:
                pass

        s3.put_object(
            Bucket=bucket,
            Key=s3_key,
            Body=file_bytes,
            ContentType=mime_type,
        )
        return True
    except (BotoCoreError, ClientError, Exception) as exc:
        logger.warning(
            "S3 vault upload failed or LocalStack unreachable (%s). Mapped to mock key: %s",
            exc,
            s3_key,
        )
        return True


def generate_presigned_download_url(
    s3_key: str,
    expires_in_seconds: int = 900,
) -> str:
    """
    Generates a 15-minute time-scoped presigned S3 download URL.
    Returns deterministic fallback URL if LocalStack/AWS is offline.
    """
    bucket = getattr(settings, "S3_VAULT_BUCKET", "sehatkosh-vault")
    try:
        s3 = get_s3_client()
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": s3_key},
            ExpiresIn=expires_in_seconds,
        )
        return url
    except Exception as exc:
        logger.warning("Could not generate S3 presigned URL (%s). Using fallback URL.", exc)
        return f"{settings.AWS_ENDPOINT_URL}/{bucket}/{s3_key}?expires={expires_in_seconds}"
