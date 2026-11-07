import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.facility import Facility
    from app.models.department import Department
    from app.models.encounter import ClinicalEncounter
    from app.models.queue import TriageQueueEntry


class Practitioner(Base):
    __tablename__ = "practitioners"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    facility_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("facilities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    pmdc_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    designation: Mapped[str] = mapped_column(String(100), nullable=False)
    prescribing_authority: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="practitioner_profiles")
    facility: Mapped["Facility"] = relationship("Facility", back_populates="practitioners")
    department: Mapped[Optional["Department"]] = relationship("Department", back_populates="practitioners")
    encounters: Mapped[List["ClinicalEncounter"]] = relationship(
        "ClinicalEncounter",
        back_populates="practitioner",
    )
    queue_entries: Mapped[List["TriageQueueEntry"]] = relationship(
        "TriageQueueEntry",
        back_populates="practitioner",
    )

