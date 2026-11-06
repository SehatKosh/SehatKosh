import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, UUID

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.facility import Facility
    from app.models.department import Department
    from app.models.patient import PatientProfile
    from app.models.staff import Practitioner


class TriageQueueEntry(Base):
    __tablename__ = "triage_queue_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        primary_key=True,
        default=uuid.uuid4,
    )
    facility_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("facilities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("departments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_number: Mapped[str] = mapped_column(String(50), nullable=False)
    triage_priority: Mapped[str] = mapped_column(
        String(30),
        default="ROUTINE",
        nullable=False,
    )  # CRITICAL_RESUSCITATION, URGENT, ROUTINE
    status: Mapped[str] = mapped_column(
        String(20),
        default="WAITING",
        nullable=False,
    )  # WAITING, IN_CONSULTATION, COMPLETED, CANCELLED
    vitals_snapshot: Mapped[Optional[dict]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    chief_complaint: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    practitioner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("practitioners.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    admitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    called_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    facility: Mapped["Facility"] = relationship("Facility", back_populates="queue_entries")
    department: Mapped["Department"] = relationship("Department", back_populates="queue_entries")
    patient: Mapped["PatientProfile"] = relationship("PatientProfile")
    practitioner: Mapped[Optional["Practitioner"]] = relationship("Practitioner", back_populates="queue_entries")

