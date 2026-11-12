import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON, UUID

from app.models.base import Base


class IngestionStagingRecord(Base):
    __tablename__ = "ingestion_staging_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        primary_key=True,
        default=uuid.uuid4,
    )
    source_facility_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("facilities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    adapter_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    schema_version: Mapped[str] = mapped_column(
        String(20),
        default="1.0",
        nullable=False,
    )
    raw_payload: Mapped[dict] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
    )
    normalized_fhir_preview: Mapped[Optional[dict]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    validation_errors: Mapped[list] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="QUARANTINED",
        nullable=False,
    )  # QUARANTINED, VALIDATION_FAILED, PROMOTED, REJECTED
    promoted_encounter_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("clinical_encounters.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
