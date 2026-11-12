import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.facility import Facility
    from app.models.staff import Practitioner
    from app.models.queue import TriageQueueEntry


class Department(Base):
    __tablename__ = "departments"

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
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)  # OPD, ER, CARD, PEDS
    floor_or_location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    facility: Mapped["Facility"] = relationship("Facility", back_populates="departments")
    practitioners: Mapped[List["Practitioner"]] = relationship(
        "Practitioner",
        back_populates="department",
    )
    queue_entries: Mapped[List["TriageQueueEntry"]] = relationship(
        "TriageQueueEntry",
        back_populates="department",
        cascade="all, delete-orphan",
    )
