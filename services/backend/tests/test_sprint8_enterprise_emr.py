"""
Sprint 8 Automated Tests: Enterprise EMR Provenance, Quarantine Ingestion,
Triage Desk, Clinical Safety (DDI & Allergies), and S3 Attachment Vault.
"""

import uuid
from datetime import date, datetime, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
import sqlalchemy as sa
from sqlalchemy.ext.compiler import compiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import app
from app.models.base import Base
from app.models.facility import Facility
from app.models.department import Department
from app.models.staff import Practitioner
from app.models.patient import PatientProfile
from app.models.encounter import ClinicalEncounter
from app.models.staging import IngestionStagingRecord
from app.models.user import User


# Ensure UUID compiles cleanly to TEXT in SQLite
@compiles(sa.UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "TEXT"


TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
)

TestAsyncSession = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# Test Fixture IDs
PIMS_ID = uuid.UUID("aaaaaaaa-1111-1111-1111-111111111111")
PIMS_OPD_ID = uuid.UUID("bbbbbbbb-1111-1111-1111-111111111111")
DOC_PIMS_USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
PRACTITIONER_PIMS_ID = uuid.UUID("cccccccc-1111-1111-1111-111111111111")
PATIENT_1_ID = uuid.UUID("33333333-3333-3333-3333-333333333331")
PATIENT_2_ID = uuid.UUID("33333333-3333-3333-3333-333333333332")


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def _override_get_db():
        async with TestAsyncSession() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db

    async with TestAsyncSession() as session:
        # Facility
        pims = Facility(
            id=PIMS_ID,
            name="Pakistan Institute of Medical Sciences (PIMS)",
            code="PIMS",
            facility_type="PUBLIC_TERTIARY",
            is_active=True,
        )
        session.add(pims)

        # Department
        dept = Department(
            id=PIMS_OPD_ID,
            facility_id=PIMS_ID,
            name="Outpatient Department",
            code="OPD",
            is_active=True,
        )
        session.add(dept)

        # User & Practitioner
        doc_user = User(
            id=DOC_PIMS_USER_ID,
            email="dr.pims@test.org",
            hashed_password="hashed_pw",
            role="doctor",
        )
        session.add(doc_user)

        prac = Practitioner(
            id=PRACTITIONER_PIMS_ID,
            user_id=DOC_PIMS_USER_ID,
            facility_id=PIMS_ID,
            department_id=PIMS_OPD_ID,
            pmdc_number="12345-P",
            designation="Consultant Physician",
            prescribing_authority=True,
        )
        session.add(prac)

        # Patient 1: Ali Raza with Penicillin allergy
        pat1 = PatientProfile(
            id=PATIENT_1_ID,
            mrn="SK-UHID-001",
            cnic="3740512345671",
            cnic_masked="37405-*******-1",
            phone_masked="0300-***0001",
            blood_group="B+",
            full_name="Ali Raza",
            age=34,
            gender="Male",
            allergies=["Penicillin"],
        )
        # Patient 2: Fatima Bibi
        pat2 = PatientProfile(
            id=PATIENT_2_ID,
            mrn="SK-UHID-002",
            cnic="3740576543213",
            cnic_masked="37405-*******-3",
            phone_masked="0321-***0002",
            blood_group="O+",
            full_name="Fatima Bibi",
            age=28,
            gender="Female",
            allergies=[],
        )
        session.add_all([pat1, pat2])
        await session.commit()

    yield

    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_staging_quarantine_and_promote(client: AsyncClient):
    """
    1. Upload valid legacy hospital CSV -> lands in quarantine staging (QUARANTINED).
    2. Zero pollution of clinical_encounters.
    3. Call promote -> creates finalized ClinicalEncounter with source_type='HOSPITAL_PLUGIN_IMPORT'.
    """
    csv_data = (
        "patient_cnic,diagnosis,medication,dosage,date\n"
        "3740512345671,Type 2 Diabetes,Metformin 500mg,1 tab daily,2026-11-01\n"
    )

    upload_resp = await client.post(
        "/api/v1/ingestion/upload",
        data={"adapter_name": "csv_legacy", "facility_id": str(PIMS_ID)},
        files={"file": ("lab_export.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert upload_resp.status_code == 201
    res_data = upload_resp.json()
    staging_id = res_data["id"]
    assert res_data["status"] == "QUARANTINED"
    assert res_data["validation_errors"] == []
    assert res_data["normalized_fhir_preview"]["resourceType"] == "Bundle"

    # Verify zero pollution in clinical_encounters before promotion
    async with TestAsyncSession() as session:
        enc_count = (await session.execute(select(ClinicalEncounter))).scalars().all()
        assert len(enc_count) == 0

    # Promote staging record to clinical encounter
    promote_resp = await client.post(
        f"/api/v1/ingestion/{staging_id}/promote",
        json={
            "patient_id": str(PATIENT_1_ID),
            "practitioner_id": str(PRACTITIONER_PIMS_ID),
            "encounter_date": "2026-11-01",
        },
    )
    assert promote_resp.status_code == 201
    enc_data = promote_resp.json()
    assert enc_data["source_type"] == "HOSPITAL_PLUGIN_IMPORT"
    assert enc_data["verification_status"] == "CLINICIAN_VERIFIED"
    assert enc_data["status"] == "FINALIZED"
    assert enc_data["patient_id"] == str(PATIENT_1_ID)

    # Verify staging record updated to PROMOTED
    async with TestAsyncSession() as session:
        stmt = select(IngestionStagingRecord).where(IngestionStagingRecord.id == uuid.UUID(staging_id))
        stg = (await session.execute(stmt)).scalars().first()
        assert stg.status == "PROMOTED"
        assert stg.promoted_encounter_id == uuid.UUID(enc_data["id"])


@pytest.mark.asyncio
async def test_invalid_external_payload_quarantined_as_failed(client: AsyncClient):
    """
    Malformed external payload receives status='VALIDATION_FAILED'
    and produces 0 clinical encounters.
    """
    invalid_csv = "random_header,unknown_field\nvalue1,value2\n"

    upload_resp = await client.post(
        "/api/v1/ingestion/upload",
        data={"adapter_name": "csv_legacy"},
        files={"file": ("corrupt.csv", invalid_csv.encode("utf-8"), "text/csv")},
    )
    assert upload_resp.status_code == 201
    res_data = upload_resp.json()
    staging_id = res_data["id"]
    assert res_data["status"] == "VALIDATION_FAILED"
    assert len(res_data["validation_errors"]) > 0

    # Attempting to promote a VALIDATION_FAILED record must be rejected with 400
    promote_resp = await client.post(
        f"/api/v1/ingestion/{staging_id}/promote",
        json={"patient_id": str(PATIENT_1_ID)},
    )
    assert promote_resp.status_code == 400
    assert "Only records in 'QUARANTINED' status can be promoted" in promote_resp.json()["detail"]


@pytest.mark.asyncio
async def test_attachment_vault_magic_bytes_and_dicom_gate(client: AsyncClient):
    """
    1. Rejects fake .pdf shell script with 400 (magic bytes check).
    2. Rejects RADIOLOGY_DICOM when flag is disabled with 400.
    3. Accepts valid PDF and computes SHA-256 hash.
    4. Issues 15-minute presigned download URL guarded by ownership.
    """
    # Create encounter to attach to
    enc_id = uuid.uuid4()
    async with TestAsyncSession() as session:
        enc = ClinicalEncounter(
            id=enc_id,
            patient_id=PATIENT_1_ID,
            facility_id=PIMS_ID,
            physician_name="Dr. Tariq",
            facility_name="PIMS",
            encounter_date=date.today(),
            fhir_bundle={"resourceType": "Bundle", "type": "document", "entry": []},
            status="FINALIZED",
        )
        session.add(enc)
        await session.commit()

    # 1. Fake PDF (contains bash script)
    fake_pdf = b"#!/bin/bash\necho 'Trojan Script'\n"
    bad_upload = await client.post(
        "/api/v1/attachments/upload",
        data={"encounter_id": str(enc_id), "modality_category": "LAB_REPORT_PDF"},
        files={"file": ("lab.pdf", fake_pdf, "application/pdf")},
    )
    assert bad_upload.status_code == 400
    assert "fails binary signature validation" in bad_upload.json()["detail"]

    # 2. Gate RADIOLOGY_DICOM
    valid_dicom_dummy = b"\x00" * 128 + b"DICM" + b"\x00" * 100
    dicom_upload = await client.post(
        "/api/v1/attachments/upload",
        data={"encounter_id": str(enc_id), "modality_category": "RADIOLOGY_DICOM"},
        files={"file": ("scan.dcm", valid_dicom_dummy, "application/dicom")},
    )
    assert dicom_upload.status_code == 400
    assert "Large modality uploads (RADIOLOGY_DICOM) are currently disabled" in dicom_upload.json()["detail"]

    # 3. Valid PDF with %PDF- header
    valid_pdf = b"%PDF-1.4\n1 0 obj\n<< /Title (Lab Test) >>\nendobj\ntrailer\n<<>>\n%%EOF"
    good_upload = await client.post(
        "/api/v1/attachments/upload",
        data={"encounter_id": str(enc_id), "modality_category": "LAB_REPORT_PDF"},
        files={"file": ("valid_lab.pdf", valid_pdf, "application/pdf")},
    )
    assert good_upload.status_code == 201
    att_data = good_upload.json()
    assert att_data["sha256_hash"] is not None
    assert len(att_data["sha256_hash"]) == 64
    assert att_data["encounter_id"] == str(enc_id)

    # 4. Presigned URL access guarded by patient ownership
    att_id = att_data["id"]
    url_resp = await client.get(
        f"/api/v1/attachments/{att_id}/presigned-url",
        headers={"X-Patient-Id": str(PATIENT_1_ID)},
    )
    assert url_resp.status_code == 200
    url_data = url_resp.json()
    assert "presigned_url" in url_data
    assert url_data["expires_in_seconds"] == 900


@pytest.mark.asyncio
async def test_finalized_encounter_immutability_and_amendment(client: AsyncClient):
    """
    Immutability invariant:
    1. Direct PUT/PATCH on FINALIZED encounter -> 409 Conflict.
    2. Corrections must go through POST /encounters/{id}/amend -> creates child with parent_encounter_id.
    """
    enc_id = uuid.uuid4()
    async with TestAsyncSession() as session:
        enc = ClinicalEncounter(
            id=enc_id,
            patient_id=PATIENT_1_ID,
            facility_id=PIMS_ID,
            practitioner_id=PRACTITIONER_PIMS_ID,
            status="FINALIZED",
            physician_name="Dr. Tariq",
            facility_name="PIMS",
            encounter_date=date.today(),
            soap_subjective="Patient reports mild cough.",
            fhir_bundle={"resourceType": "Bundle", "type": "document", "entry": []},
            finalized_at=datetime.now(timezone.utc),
        )
        session.add(enc)
        await session.commit()

    # 1. Attempt direct edit on FINALIZED encounter -> 409 Conflict
    direct_edit = await client.put(
        f"/api/v1/encounters/{enc_id}",
        json={"soap_subjective": "Tampered notes"},
    )
    assert direct_edit.status_code == 409
    assert "Finalized clinical encounters are immutable" in direct_edit.json()["detail"]

    # 2. Submit proper amendment
    amend_resp = await client.post(
        f"/api/v1/encounters/{enc_id}/amend",
        json={
            "reason": "Corrected subjective history: cough was productive with yellowish sputum.",
            "soap_subjective": "Productive cough with sputum.",
            "physician_name": "Dr. Tariq Khan (Amended)",
        },
    )
    assert amend_resp.status_code == 201
    amend_data = amend_resp.json()
    assert amend_data["parent_encounter_id"] == str(enc_id)
    assert amend_data["status"] == "AMENDED"
    assert amend_data["soap_subjective"] == "Productive cough with sputum."
    assert amend_data["patient_id"] == str(PATIENT_1_ID)


@pytest.mark.asyncio
async def test_triage_priority_rules(client: AsyncClient):
    """
    Verifies deterministic triage decision matrix thresholds:
    CRITICAL_RESUSCITATION, URGENT, ROUTINE.
    """
    # 1. Critical: SpO2 < 90%
    crit_resp = await client.post(
        "/api/v1/clinical/triage-calculate",
        json={"spo2": 88, "heart_rate": 115, "systolic_bp": 130},
    )
    assert crit_resp.status_code == 200
    assert crit_resp.json()["priority"] == "CRITICAL_RESUSCITATION"
    assert "Severe hypoxia" in crit_resp.json()["reasoning"]

    # 2. Critical: Extreme Arrhythmia (HR > 140)
    arrh_resp = await client.post(
        "/api/v1/clinical/triage-calculate",
        json={"spo2": 97, "heart_rate": 155, "systolic_bp": 120},
    )
    assert arrh_resp.status_code == 200
    assert arrh_resp.json()["priority"] == "CRITICAL_RESUSCITATION"

    # 3. Urgent: High pyrexia (Temp > 102.5°F)
    urg_resp = await client.post(
        "/api/v1/clinical/triage-calculate",
        json={"spo2": 96, "heart_rate": 95, "temperature_f": 103.2},
    )
    assert urg_resp.status_code == 200
    assert urg_resp.json()["priority"] == "URGENT"
    assert "High pyrexia" in urg_resp.json()["reasoning"]

    # 4. Routine: Normal vitals
    norm_resp = await client.post(
        "/api/v1/clinical/triage-calculate",
        json={"spo2": 98, "heart_rate": 72, "systolic_bp": 120, "diastolic_bp": 80},
    )
    assert norm_resp.status_code == 200
    assert norm_resp.json()["priority"] == "ROUTINE"


@pytest.mark.asyncio
async def test_ddi_and_allergy_collision_alerts(client: AsyncClient):
    """
    Verifies:
    1. Allergy collision: Ali Raza has Penicillin allergy -> prescribing Amoxicillin triggers CRITICAL alert.
    2. Drug-Drug Interaction: Warfarin + Aspirin triggers CRITICAL DDI alert.
    3. Safe medication returns safe=True.
    """
    # 1. Penicillin allergy collision for Patient 1 (Ali Raza)
    allergy_check = await client.post(
        "/api/v1/clinical/check-interactions",
        json={
            "patient_id": str(PATIENT_1_ID),
            "proposed_medications": ["Amoxicillin 500mg"],
        },
    )
    assert allergy_check.status_code == 200
    res1 = allergy_check.json()
    assert res1["safe"] is False
    assert len(res1["alerts"]) >= 1
    assert any(a["type"] == "ALLERGY_COLLISION" for a in res1["alerts"])

    # 2. DDI Contraindication: Warfarin + Aspirin
    ddi_check = await client.post(
        "/api/v1/clinical/check-interactions",
        json={
            "proposed_medications": ["Warfarin 5mg", "Aspirin 75mg"],
        },
    )
    assert ddi_check.status_code == 200
    res2 = ddi_check.json()
    assert res2["safe"] is False
    assert any(a["type"] == "DDI_CONTRAINDICATION" for a in res2["alerts"])

    # 3. Clean medication check
    safe_check = await client.post(
        "/api/v1/clinical/check-interactions",
        json={
            "patient_id": str(PATIENT_2_ID),
            "proposed_medications": ["Paracetamol 500mg"],
        },
    )
    assert safe_check.status_code == 200
    res3 = safe_check.json()
    assert res3["safe"] is True
    assert len(res3["alerts"]) == 0


@pytest.mark.asyncio
async def test_icd10_search(client: AsyncClient):
    """
    Verifies search across standardized Pakistani clinical formulary ICD-10 dataset.
    """
    # Search diabetes
    diab_resp = await client.get("/api/v1/clinical/icd10?q=diabetes")
    assert diab_resp.status_code == 200
    diab_items = diab_resp.json()
    assert len(diab_items) > 0
    assert any("E11" in item["code"] for item in diab_items)

    # Search by code
    htn_resp = await client.get("/api/v1/clinical/icd10?query=I10")
    assert htn_resp.status_code == 200
    htn_items = htn_resp.json()
    assert len(htn_items) > 0
    assert htn_items[0]["code"] == "I10"


@pytest.mark.asyncio
async def test_encounter_finalize(client: AsyncClient):
    """
    Verifies POST /encounters/{id}/finalize transitions status to FINALIZED
    and records finalized_at.
    """
    enc_id = uuid.uuid4()
    async with TestAsyncSession() as session:
        draft = ClinicalEncounter(
            id=enc_id,
            patient_id=PATIENT_1_ID,
            facility_id=PIMS_ID,
            status="IN_PROGRESS",
            encounter_date=date.today(),
            fhir_bundle={"resourceType": "Bundle", "type": "document", "entry": []},
        )
        session.add(draft)
        await session.commit()

    resp = await client.post(f"/api/v1/encounters/{enc_id}/finalize")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "FINALIZED"
    assert data["finalized_at"] is not None
