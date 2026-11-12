import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UUID

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.staff import Practitioner
    from app.models.patient import PatientFacilityRecord
    from app.models.encounter import ClinicalEncounter
    from app.models.queue import TriageQueueEntry


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    facility_type: Mapped[str] = mapped_column(
        String(50),
        default="PUBLIC_TERTIARY",
        nullable=False,
    )  # PUBLIC_TERTIARY, PRIVATE_HOSPITAL, RURAL_HEALTH_CENTER, DIAGNOSTIC_LAB
    license_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    encryption_key_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    departments: Mapped[List["Department"]] = relationship(
        "Department",
        back_populates="facility",
        cascade="all, delete-orphan",
    )
    practitioners: Mapped[List["Practitioner"]] = relationship(
        "Practitioner",
        back_populates="facility",
        cascade="all, delete-orphan",
    )
    patient_records: Mapped[List["PatientFacilityRecord"]] = relationship(
        "PatientFacilityRecord",
        back_populates="facility",
        cascade="all, delete-orphan",
    )
    encounters: Mapped[List["ClinicalEncounter"]] = relationship(
        "ClinicalEncounter",
        back_populates="facility",
    )
    queue_entries: Mapped[List["TriageQueueEntry"]] = relationship(
        "TriageQueueEntry",
        back_populates="facility",
        cascade="all, delete-orphan",
    )
