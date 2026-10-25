import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, UUID

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.encounter import ClinicalEncounter
    from app.models.consent import ConsentGrant


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    mrn: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    cnic: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    cnic_masked: Mapped[str] = mapped_column(String(30), nullable=False)
    phone_masked: Mapped[str] = mapped_column(String(30), nullable=False)
    blood_group: Mapped[str] = mapped_column(String(10), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default="Unknown Patient")
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=0)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="Unknown")
    allergies: Mapped[list] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        default=list,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped[Optional["User"]] = relationship("User", back_populates="patient_profile")
    encounters: Mapped[List["ClinicalEncounter"]] = relationship(
        "ClinicalEncounter",
        back_populates="patient",
        cascade="all, delete-orphan",
        order_by="ClinicalEncounter.encounter_date.desc()",
    )
    consent_grants: Mapped[List["ConsentGrant"]] = relationship(
        "ConsentGrant",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
