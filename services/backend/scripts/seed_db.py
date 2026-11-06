"""
SehatKosh Deterministic Database Seeder
Seeds PostgreSQL with fixed UUID fixtures for:
- Two complete hospital tenants: PIMS (Public Tertiary) & Razi Hospital (Private)
- Hospital Departments (OPD, Emergency, Cardiology)
- Facility Staff & Practitioners (Doctors, Triage Nurses, Registrars)
- Patient Global Profiles & Local Facility MRN Records
- 24-hr Active, Expired, and Break-Glass Consent Grants
- Enterprise Clinical Encounters (SOAP notes, Vitals, FHIR Bundles)
- Departmental Triage Waiting Queue Entries

Callable via:
    python scripts/seed_db.py
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from uuid import UUID

# Ensure services/backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import delete
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.patient import PatientProfile, PatientFacilityRecord
from app.models.facility import Facility
from app.models.department import Department
from app.models.staff import Practitioner
from app.models.queue import TriageQueueEntry
from app.models.consent import ConsentGrant
from app.models.encounter import ClinicalEncounter

# ─── Fixed Deterministic UUIDs ───────────────────────────────────────────────

# Tenants
FACILITY_PIMS_ID = UUID("aaaaaaaa-1111-1111-1111-111111111111")
FACILITY_RAZI_ID = UUID("aaaaaaaa-2222-2222-2222-222222222222")

# Departments
PIMS_OPD_ID = UUID("bbbbbbbb-1111-1111-1111-111111111111")
PIMS_ER_ID = UUID("bbbbbbbb-1111-1111-1111-111111111112")
PIMS_CARD_ID = UUID("bbbbbbbb-1111-1111-1111-111111111113")

RAZI_OPD_ID = UUID("bbbbbbbb-2222-2222-2222-222222222221")
RAZI_ER_ID = UUID("bbbbbbbb-2222-2222-2222-222222222222")

# Users
DOCTOR_1_ID = UUID("11111111-1111-1111-1111-111111111111")
DOCTOR_2_ID = UUID("11111111-1111-1111-1111-111111111112")
REGISTRAR_1_ID = UUID("22222222-2222-2222-2222-222222222222")
ADMIN_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

# Practitioners
PRACTITIONER_PIMS_DOC1_ID = UUID("cccccccc-1111-1111-1111-111111111111")
PRACTITIONER_PIMS_REG1_ID = UUID("cccccccc-1111-1111-1111-111111111112")
PRACTITIONER_RAZI_DOC2_ID = UUID("cccccccc-2222-2222-2222-222222222221")

# Patients
PATIENT_1_ID = UUID("33333333-3333-3333-3333-333333333331")
PATIENT_2_ID = UUID("33333333-3333-3333-3333-333333333332")
PATIENT_3_ID = UUID("33333333-3333-3333-3333-333333333333")

# Local MRN Records
PFR_PIMS_P1_ID = UUID("dddddddd-1111-1111-1111-111111111111")
PFR_RAZI_P1_ID = UUID("dddddddd-2222-2222-2222-222222222221")
PFR_PIMS_P2_ID = UUID("dddddddd-1111-1111-1111-111111111112")
PFR_RAZI_P3_ID = UUID("dddddddd-2222-2222-2222-222222222222")

# Consent Grants
CONSENT_1_ID = UUID("44444444-4444-4444-4444-444444444441")
CONSENT_2_ID = UUID("44444444-4444-4444-4444-444444444442")
CONSENT_3_ID = UUID("44444444-4444-4444-4444-444444444443")

# Encounters & Queues
ENCOUNTER_1_ID = UUID("55555555-5555-5555-5555-555555555551")
QUEUE_PIMS_P1_ID = UUID("eeeeeeee-1111-1111-1111-111111111111")
QUEUE_RAZI_P3_ID = UUID("eeeeeeee-2222-2222-2222-222222222222")


async def seed_database() -> None:
    now = datetime.now(timezone.utc)
    print("🌱 [SehatKosh Seeder] Starting database seeding...")

    async with AsyncSessionLocal() as session:
        # ── 1. Clean existing seeded records (Idempotency) ────────────────────
        print("🧹 Cleaning previous deterministic fixtures if present...")
        await session.execute(
            delete(TriageQueueEntry).where(
                TriageQueueEntry.id.in_([QUEUE_PIMS_P1_ID, QUEUE_RAZI_P3_ID])
                | TriageQueueEntry.facility_id.in_([FACILITY_PIMS_ID, FACILITY_RAZI_ID])
            )
        )
        await session.execute(
            delete(ClinicalEncounter).where(
                (ClinicalEncounter.id == ENCOUNTER_1_ID)
                | (ClinicalEncounter.patient_id.in_([PATIENT_1_ID, PATIENT_2_ID, PATIENT_3_ID]))
            )
        )
        await session.execute(
            delete(ConsentGrant).where(
                ConsentGrant.id.in_([CONSENT_1_ID, CONSENT_2_ID, CONSENT_3_ID])
                | ConsentGrant.patient_id.in_([PATIENT_1_ID, PATIENT_2_ID, PATIENT_3_ID])
            )
        )
        await session.execute(
            delete(PatientFacilityRecord).where(
                PatientFacilityRecord.id.in_([PFR_PIMS_P1_ID, PFR_RAZI_P1_ID, PFR_PIMS_P2_ID, PFR_RAZI_P3_ID])
                | PatientFacilityRecord.facility_id.in_([FACILITY_PIMS_ID, FACILITY_RAZI_ID])
            )
        )
        await session.execute(
            delete(Practitioner).where(
                Practitioner.id.in_([PRACTITIONER_PIMS_DOC1_ID, PRACTITIONER_PIMS_REG1_ID, PRACTITIONER_RAZI_DOC2_ID])
                | Practitioner.facility_id.in_([FACILITY_PIMS_ID, FACILITY_RAZI_ID])
            )
        )
        await session.execute(
            delete(Department).where(
                Department.id.in_([PIMS_OPD_ID, PIMS_ER_ID, PIMS_CARD_ID, RAZI_OPD_ID, RAZI_ER_ID])
                | Department.facility_id.in_([FACILITY_PIMS_ID, FACILITY_RAZI_ID])
            )
        )
        await session.execute(
            delete(Facility).where(
                Facility.id.in_([FACILITY_PIMS_ID, FACILITY_RAZI_ID])
            )
        )
        await session.execute(
            delete(PatientProfile).where(
                PatientProfile.id.in_([PATIENT_1_ID, PATIENT_2_ID, PATIENT_3_ID])
            )
        )
        await session.execute(
            delete(User).where(
                User.id.in_([DOCTOR_1_ID, DOCTOR_2_ID, REGISTRAR_1_ID, ADMIN_ID])
            )
        )
        await session.commit()

        # ── 2. Seed Facilities ───────────────────────────────────────────────
        print("🏥 Seeding hospital tenants...")
        facilities = [
            Facility(
                id=FACILITY_PIMS_ID,
                name="Pakistan Institute of Medical Sciences (PIMS)",
                code="PIMS",
                facility_type="PUBLIC_TERTIARY",
                license_number="PHC-2024-PIMS-001",
                encryption_key_id="kms-key-pims-vault-01",
                is_active=True,
                created_at=now,
            ),
            Facility(
                id=FACILITY_RAZI_ID,
                name="Razi Hospital Islamabad",
                code="RAZI",
                facility_type="PRIVATE_HOSPITAL",
                license_number="IHRA-2024-RAZI-042",
                encryption_key_id="kms-key-razi-vault-02",
                is_active=True,
                created_at=now,
            ),
        ]
        session.add_all(facilities)
        await session.commit()
        print(f"   ✓ Seeded {len(facilities)} healthcare institutions.")

        # ── 3. Seed Departments ──────────────────────────────────────────────
        print("🏢 Seeding clinical departments...")
        departments = [
            Department(
                id=PIMS_OPD_ID,
                facility_id=FACILITY_PIMS_ID,
                name="Outpatient Department (OPD)",
                code="OPD",
                floor_or_location="Ground Floor Block A",
                is_active=True,
                created_at=now,
            ),
            Department(
                id=PIMS_ER_ID,
                facility_id=FACILITY_PIMS_ID,
                name="Emergency & Trauma Center",
                code="ER",
                floor_or_location="Ground Floor Trauma Wing",
                is_active=True,
                created_at=now,
            ),
            Department(
                id=PIMS_CARD_ID,
                facility_id=FACILITY_PIMS_ID,
                name="Department of Cardiology",
                code="CARD",
                floor_or_location="2nd Floor Heart Center",
                is_active=True,
                created_at=now,
            ),
            Department(
                id=RAZI_OPD_ID,
                facility_id=FACILITY_RAZI_ID,
                name="Consultant Clinics (OPD)",
                code="OPD",
                floor_or_location="1st Floor North Wing",
                is_active=True,
                created_at=now,
            ),
            Department(
                id=RAZI_ER_ID,
                facility_id=FACILITY_RAZI_ID,
                name="24/7 Emergency Care",
                code="ER",
                floor_or_location="Ground Floor Main Gate",
                is_active=True,
                created_at=now,
            ),
        ]
        session.add_all(departments)
        await session.commit()
        print(f"   ✓ Seeded {len(departments)} hospital departments.")

        # ── 4. Seed Users ────────────────────────────────────────────────────
        print("👤 Seeding system users...")
        users = [
            User(
                id=DOCTOR_1_ID,
                email="tariq.khan@sehatkosh.org",
                hashed_password="mock_hashed_password_doc1",
                role="doctor",
            ),
            User(
                id=DOCTOR_2_ID,
                email="ayesha.malik@sehatkosh.org",
                hashed_password="mock_hashed_password_doc2",
                role="doctor",
            ),
            User(
                id=REGISTRAR_1_ID,
                email="sana.perveen@sehatkosh.org",
                hashed_password="mock_hashed_password_reg1",
                role="registrar",
            ),
            User(
                id=ADMIN_ID,
                email="admin@sehatkosh.org",
                hashed_password="mock_hashed_password_admin",
                role="super-admin",
            ),
        ]
        session.add_all(users)
        await session.commit()
        print(f"   ✓ Seeded {len(users)} users.")

        # ── 5. Seed Practitioners ────────────────────────────────────────────
        print("🩺 Seeding practitioners and hospital staff...")
        practitioners = [
            Practitioner(
                id=PRACTITIONER_PIMS_DOC1_ID,
                user_id=DOCTOR_1_ID,
                facility_id=FACILITY_PIMS_ID,
                department_id=PIMS_CARD_ID,
                pmdc_number="48291-P",
                designation="Consultant Cardiologist",
                prescribing_authority=True,
                is_active=True,
                created_at=now,
            ),
            Practitioner(
                id=PRACTITIONER_PIMS_REG1_ID,
                user_id=REGISTRAR_1_ID,
                facility_id=FACILITY_PIMS_ID,
                department_id=PIMS_OPD_ID,
                pmdc_number=None,
                designation="Triage Nurse & Registrar",
                prescribing_authority=False,
                is_active=True,
                created_at=now,
            ),
            Practitioner(
                id=PRACTITIONER_RAZI_DOC2_ID,
                user_id=DOCTOR_2_ID,
                facility_id=FACILITY_RAZI_ID,
                department_id=RAZI_OPD_ID,
                pmdc_number="59102-P",
                designation="Consultant Physician",
                prescribing_authority=True,
                is_active=True,
                created_at=now,
            ),
        ]
        session.add_all(practitioners)
        await session.commit()
        print(f"   ✓ Seeded {len(practitioners)} practitioners.")

        # ── 6. Seed Patient Profiles ─────────────────────────────────────────
        print("🏥 Seeding clinical patient profiles...")
        patients = [
            PatientProfile(
                id=PATIENT_1_ID,
                mrn="SK-2026-0001",
                cnic="3740512345671",
                cnic_masked="37405-*******-1",
                phone_masked="0300-***0001",
                blood_group="B+",
                full_name="Ali Raza",
                age=34,
                gender="Male",
                allergies=["Penicillin", "Sulfa drugs"],
            ),
            PatientProfile(
                id=PATIENT_2_ID,
                mrn="SK-2026-0002",
                cnic="3740576543213",
                cnic_masked="37405-*******-3",
                phone_masked="0321-***0002",
                blood_group="O+",
                full_name="Fatima Bibi",
                age=28,
                gender="Female",
                allergies=[],
            ),
            PatientProfile(
                id=PATIENT_3_ID,
                mrn="SK-2026-0003",
                cnic="3740599999995",
                cnic_masked="37405-*******-5",
                phone_masked="0333-***0003",
                blood_group="A-",
                full_name="Muhammad Usman",
                age=45,
                gender="Male",
                allergies=["Aspirin"],
            ),
        ]
        session.add_all(patients)
        await session.commit()
        print(f"   ✓ Seeded {len(patients)} patient profiles.")

        # ── 7. Seed Local Facility MRNs ──────────────────────────────────────
        print("🏷️ Seeding local facility MRN records...")
        patient_facility_records = [
            PatientFacilityRecord(
                id=PFR_PIMS_P1_ID,
                patient_id=PATIENT_1_ID,
                facility_id=FACILITY_PIMS_ID,
                local_mrn="PIMS-2026-001",
                registered_at=now - timedelta(days=30),
            ),
            PatientFacilityRecord(
                id=PFR_RAZI_P1_ID,
                patient_id=PATIENT_1_ID,
                facility_id=FACILITY_RAZI_ID,
                local_mrn="RAZI-2026-001",
                registered_at=now - timedelta(days=2),
            ),
            PatientFacilityRecord(
                id=PFR_PIMS_P2_ID,
                patient_id=PATIENT_2_ID,
                facility_id=FACILITY_PIMS_ID,
                local_mrn="PIMS-2026-002",
                registered_at=now - timedelta(days=15),
            ),
            PatientFacilityRecord(
                id=PFR_RAZI_P3_ID,
                patient_id=PATIENT_3_ID,
                facility_id=FACILITY_RAZI_ID,
                local_mrn="RAZI-2026-002",
                registered_at=now - timedelta(days=5),
            ),
        ]
        session.add_all(patient_facility_records)
        await session.commit()
        print(f"   ✓ Seeded {len(patient_facility_records)} local MRN records.")

        # ── 8. Seed Consent Grants ───────────────────────────────────────────
        print("🔑 Seeding consent grants (Active, Expired)...")
        grants = [
            # Patient 1: Active 24-hr consent for Doctor 1 at PIMS
            ConsentGrant(
                id=CONSENT_1_ID,
                patient_id=PATIENT_1_ID,
                physician_id=DOCTOR_1_ID,
                facility_id=FACILITY_PIMS_ID,
                status="active",
                granted_at=now - timedelta(hours=1),
                expires_at=now + timedelta(hours=23),
                is_break_glass=False,
                justification=None,
            ),
            # Patient 2: Active 24-hr consent for Doctor 1 at PIMS
            ConsentGrant(
                id=CONSENT_2_ID,
                patient_id=PATIENT_2_ID,
                physician_id=DOCTOR_1_ID,
                facility_id=FACILITY_PIMS_ID,
                status="active",
                granted_at=now - timedelta(hours=6),
                expires_at=now + timedelta(hours=18),
                is_break_glass=False,
                justification=None,
            ),
            # Patient 3: Expired consent for Doctor 1
            ConsentGrant(
                id=CONSENT_3_ID,
                patient_id=PATIENT_3_ID,
                physician_id=DOCTOR_1_ID,
                facility_id=FACILITY_RAZI_ID,
                status="expired",
                granted_at=now - timedelta(hours=26),
                expires_at=now - timedelta(hours=2),
                is_break_glass=False,
                justification=None,
            ),
        ]
        session.add_all(grants)
        await session.commit()
        print(f"   ✓ Seeded {len(grants)} consent grants.")

        # ── 9. Seed Clinical Encounter ───────────────────────────────────────
        print("📋 Seeding enterprise clinical encounter...")
        fhir_bundle_p1 = {
            "resourceType": "Bundle",
            "id": "bundle-seed-001",
            "type": "collection",
            "timestamp": (now - timedelta(days=2)).isoformat(),
            "entry": [
                {
                    "fullUrl": f"urn:uuid:patient-{PATIENT_1_ID}",
                    "resource": {
                        "resourceType": "Patient",
                        "id": str(PATIENT_1_ID),
                        "name": [{"text": "Ali Raza", "use": "official"}],
                    },
                },
                {
                    "fullUrl": "urn:uuid:medrx-seed-001",
                    "resource": {
                        "resourceType": "MedicationRequest",
                        "id": "medrx-seed-001",
                        "status": "active",
                        "intent": "order",
                        "medicationCodeableConcept": {
                            "coding": [
                                {
                                    "system": "http://snomed.info/sct",
                                    "code": "372687004",
                                    "display": "Amoxicillin",
                                }
                            ],
                            "text": "Amoxicillin",
                        },
                        "dosageInstruction": [
                            {"text": "500mg — 3 times daily — 7 days"}
                        ],
                    },
                },
                {
                    "fullUrl": "urn:uuid:medrx-seed-002",
                    "resource": {
                        "resourceType": "MedicationRequest",
                        "id": "medrx-seed-002",
                        "status": "active",
                        "intent": "order",
                        "medicationCodeableConcept": {
                            "coding": [
                                {
                                    "system": "http://snomed.info/sct",
                                    "code": "387517004",
                                    "display": "Paracetamol",
                                }
                            ],
                            "text": "Paracetamol",
                        },
                        "dosageInstruction": [
                            {"text": "500mg — As needed — 3 days"}
                        ],
                    },
                },
            ],
        }

        encounter_1 = ClinicalEncounter(
            id=ENCOUNTER_1_ID,
            patient_id=PATIENT_1_ID,
            facility_id=FACILITY_PIMS_ID,
            practitioner_id=PRACTITIONER_PIMS_DOC1_ID,
            encounter_class="OPD",
            triage_priority="ROUTINE",
            vitals_snapshot={
                "bp_systolic": 120,
                "bp_diastolic": 80,
                "pulse": 76,
                "temperature": 101.0,
                "spo2": 98,
            },
            soap_subjective="Patient complains of sore throat and fever for 3 days.",
            soap_objective="T 101F, pharyngeal erythema, no exudate.",
            soap_assessment={
                "code": "J02.9",
                "text": "Acute pharyngitis, unspecified",
                "system": "ICD-10",
            },
            soap_plan="Amoxicillin 500mg TDS x 7d, Paracetamol 500mg SOS",
            status="FINALIZED",
            physician_name="Dr. Tariq Khan",
            facility_name="Pakistan Institute of Medical Sciences (PIMS)",
            encounter_date=(now - timedelta(days=2)).date(),
            soap_notes={
                "subjective": "Patient complains of sore throat and fever for 3 days.",
                "objective": "T 101F, pharyngeal erythema, no exudate.",
                "assessment": "Acute pharyngitis",
                "plan": "Amoxicillin 500mg TDS x 7d, Paracetamol 500mg SOS",
            },
            fhir_bundle=fhir_bundle_p1,
            document_s3_key="prescriptions/seed_encounter_001.jpg",
            finalized_at=now - timedelta(days=2),
        )
        session.add(encounter_1)
        await session.commit()
        print("   ✓ Seeded 1 enterprise clinical encounter.")

        # ── 10. Seed Triage Queue Entries ────────────────────────────────────
        print("⏳ Seeding live departmental triage queues...")
        queue_entries = [
            TriageQueueEntry(
                id=QUEUE_PIMS_P1_ID,
                facility_id=FACILITY_PIMS_ID,
                department_id=PIMS_OPD_ID,
                patient_id=PATIENT_1_ID,
                token_number="OPD-001",
                triage_priority="ROUTINE",
                status="WAITING",
                vitals_snapshot={
                    "bp_systolic": 120,
                    "bp_diastolic": 80,
                    "pulse": 78,
                    "spo2": 99,
                    "temperature": 98.6,
                },
                chief_complaint="Routine cardiology follow-up",
                practitioner_id=PRACTITIONER_PIMS_DOC1_ID,
                admitted_at=now - timedelta(minutes=25),
            ),
            TriageQueueEntry(
                id=QUEUE_RAZI_P3_ID,
                facility_id=FACILITY_RAZI_ID,
                department_id=RAZI_OPD_ID,
                patient_id=PATIENT_3_ID,
                token_number="OPD-001",
                triage_priority="URGENT",
                status="WAITING",
                vitals_snapshot={
                    "bp_systolic": 145,
                    "bp_diastolic": 95,
                    "pulse": 90,
                    "spo2": 96,
                    "temperature": 99.1,
                },
                chief_complaint="Elevated blood pressure with mild headache",
                practitioner_id=PRACTITIONER_RAZI_DOC2_ID,
                admitted_at=now - timedelta(minutes=10),
            ),
        ]
        session.add_all(queue_entries)
        await session.commit()
        print(f"   ✓ Seeded {len(queue_entries)} departmental queue entries.")

    print("✨ [SehatKosh Seeder] Database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
