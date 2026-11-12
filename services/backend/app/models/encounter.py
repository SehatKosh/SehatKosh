import uuid
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, UUID

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.patient import PatientProfile
    from app.models.facility import Facility
    from app.models.staff import Practitioner


class ClinicalEncounter(Base):
    __tablename__ = "clinical_encounters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        primary_key=True,
        default=uuid.uuid4,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    facility_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("facilities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    practitioner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("practitioners.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    parent_encounter_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True).with_variant(PG_UUID(as_uuid=True), "postgresql"),
        ForeignKey("clinical_encounters.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        default="HOSPITAL_EMR_NATIVE",
        nullable=False,
    )  # HOSPITAL_EMR_NATIVE, HOSPITAL_PLUGIN_IMPORT, PATIENT_MOBILE_OCR, WEARABLE_BLE
    verification_status: Mapped[str] = mapped_column(
        String(50),
        default="CLINICIAN_VERIFIED",
        nullable=False,
    )  # CLINICIAN_VERIFIED, PATIENT_CONFIRMED, UNVERIFIED_OCR
    encounter_class: Mapped[str] = mapped_column(
        String(20),
        default="OPD",
        nullable=False,
    )  # OPD, EMERGENCY, INPATIENT
    triage_priority: Mapped[str] = mapped_column(
        String(30),
        default="ROUTINE",
        nullable=False,
    )  # CRITICAL_RESUSCITATION, URGENT, ROUTINE
    vitals_snapshot: Mapped[Optional[dict]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    soap_subjective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    soap_objective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    soap_assessment: Mapped[Optional[dict]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    soap_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        default="FINALIZED",
        nullable=False,
    )  # IN_PROGRESS, FINALIZED, AMENDED
    physician_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    facility_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    encounter_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    soap_notes: Mapped[Optional[dict]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    fhir_bundle: Mapped[dict] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
    )
    document_s3_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    finalized_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    patient: Mapped["PatientProfile"] = relationship(
        "PatientProfile",
        back_populates="encounters",
    )
    facility: Mapped[Optional["Facility"]] = relationship(
        "Facility",
        back_populates="encounters",
    )
    practitioner: Mapped[Optional["Practitioner"]] = relationship(
        "Practitioner",
        back_populates="encounters",
    )
    parent_encounter: Mapped[Optional["ClinicalEncounter"]] = relationship(
        "ClinicalEncounter",
        remote_side="ClinicalEncounter.id",
        back_populates="amendments",
    )
    amendments: Mapped[List["ClinicalEncounter"]] = relationship(
        "ClinicalEncounter",
        back_populates="parent_encounter",
    )
