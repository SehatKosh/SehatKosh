"""
SehatKosh Deterministic Database Seeder
Seeds PostgreSQL with fixed UUID fixtures for doctors, registrars, patients,
consent grants (active, expired, break-glass), and clinical encounters.

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
from app.models.patient import PatientProfile
from app.models.consent import ConsentGrant
from app.models.encounter import ClinicalEncounter

# ─── Fixed Deterministic UUIDs ───────────────────────────────────────────────

DOCTOR_1_ID = UUID("11111111-1111-1111-1111-111111111111")
DOCTOR_2_ID = UUID("11111111-1111-1111-1111-111111111112")
REGISTRAR_1_ID = UUID("22222222-2222-2222-2222-222222222222")
ADMIN_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

PATIENT_1_ID = UUID("33333333-3333-3333-3333-333333333331")
PATIENT_2_ID = UUID("33333333-3333-3333-3333-333333333332")
PATIENT_3_ID = UUID("33333333-3333-3333-3333-333333333333")

CONSENT_1_ID = UUID("44444444-4444-4444-4444-444444444441")
CONSENT_2_ID = UUID("44444444-4444-4444-4444-444444444442")
CONSENT_3_ID = UUID("44444444-4444-4444-4444-444444444443")

ENCOUNTER_1_ID = UUID("55555555-5555-5555-5555-555555555551")


async def seed_database() -> None:
    now = datetime.now(timezone.utc)
    print("🌱 [SehatKosh Seeder] Starting database seeding...")

    async with AsyncSessionLocal() as session:
        # ── 1. Clean existing seeded records (Idempotency) ────────────────────
        print("🧹 Cleaning previous deterministic fixtures if present...")
        await session.execute(
            delete(ConsentGrant).where(
                ConsentGrant.id.in_([CONSENT_1_ID, CONSENT_2_ID, CONSENT_3_ID])
                | ConsentGrant.patient_id.in_([PATIENT_1_ID, PATIENT_2_ID, PATIENT_3_ID])
            )
        )
        await session.execute(
            delete(ClinicalEncounter).where(
                (ClinicalEncounter.id == ENCOUNTER_1_ID)
                | (ClinicalEncounter.patient_id.in_([PATIENT_1_ID, PATIENT_2_ID, PATIENT_3_ID]))
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

        # ── 2. Seed Users ────────────────────────────────────────────────────
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

        # ── 3. Seed Patient Profiles ─────────────────────────────────────────
        print("🏥 Seeding clinical patient profiles...")
        patients = [
            PatientProfile(
                id=PATIENT_1_ID,
                mrn="MRN-2026-001",
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
                mrn="MRN-2026-002",
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
                mrn="MRN-2026-003",
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

        # ── 4. Seed Consent Grants ───────────────────────────────────────────
        print("🔑 Seeding consent grants (Active, Expired)...")
        grants = [
            # Patient 1: Active 24-hr consent for Doctor 1 (expires in 23 hours)
            ConsentGrant(
                id=CONSENT_1_ID,
                patient_id=PATIENT_1_ID,
                physician_id=DOCTOR_1_ID,
                status="active",
                granted_at=now - timedelta(hours=1),
                expires_at=now + timedelta(hours=23),
                is_break_glass=False,
                justification=None,
            ),
            # Patient 2: Active 24-hr consent for Doctor 1 (expires in 18 hours)
            ConsentGrant(
                id=CONSENT_2_ID,
                patient_id=PATIENT_2_ID,
                physician_id=DOCTOR_1_ID,
                status="active",
                granted_at=now - timedelta(hours=6),
                expires_at=now + timedelta(hours=18),
                is_break_glass=False,
                justification=None,
            ),
            # Patient 3: Expired consent for Doctor 1 (expired 2 hours ago)
            ConsentGrant(
                id=CONSENT_3_ID,
                patient_id=PATIENT_3_ID,
                physician_id=DOCTOR_1_ID,
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

        # ── 5. Seed Clinical Encounter ───────────────────────────────────────
        print("📋 Seeding normative FHIR clinical encounters...")
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
            physician_name="Dr. Tariq Khan",
            facility_name="Shifa International Hospital",
            encounter_date=now - timedelta(days=2),
            soap_notes={
                "subjective": "Patient complains of sore throat and fever for 3 days.",
                "objective": "T 101F, pharyngeal erythema, no exudate.",
                "assessment": "Acute pharyngitis",
                "plan": "Amoxicillin 500mg TDS x 7d, Paracetamol 500mg SOS",
            },
            fhir_bundle=fhir_bundle_p1,
            document_s3_key="prescriptions/seed_encounter_001.jpg",
        )
        session.add(encounter_1)
        await session.commit()
        print("   ✓ Seeded 1 clinical encounter with FHIR bundle.")

    print("✨ [SehatKosh Seeder] Database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
