"""
Sprint 4 Automated Tests: Research De-Identification Pipeline & Admin Multi-Quorum Sign-Off
Satisfies:
- FR-SEC-03: Research De-Identification & Age Binning
- FR-SEC-01: Multi-Admin Quorum Sign-Off (2-of-3 Super Admin Approvals)
"""

import json
import uuid
from datetime import date
from uuid import UUID

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
import sqlalchemy as sa
from sqlalchemy.ext.compiler import compiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import app
from app.models.audit import AuditLog
from app.models.base import Base
from app.models.encounter import ClinicalEncounter
from app.models.patient import PatientProfile
from app.models.user import User
from app.services.anonymizer import bin_age, sanitize_patient_record


# In SQLite, declare UUID as TEXT so numeric-only UUIDs are not coerced to float
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

ADMIN_1_UUID = UUID("22222222-2222-2222-2222-222222222221")
ADMIN_2_UUID = UUID("22222222-2222-2222-2222-222222222222")
ADMIN_3_UUID = UUID("22222222-2222-2222-2222-222222222223")

PATIENT_1_UUID = UUID("33333333-3333-3333-3333-333333333331")
PATIENT_2_UUID = UUID("33333333-3333-3333-3333-333333333332")


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def _get_test_db():
        async with TestAsyncSession() as session:
            yield session

    app.dependency_overrides[get_db] = _get_test_db

    # Seed initial test admins and patients
    async with TestAsyncSession() as session:
        admin1 = User(
            id=ADMIN_1_UUID,
            email="admin1@sehatkosh.gov.pk",
            hashed_password="hash1",
            role="super-admin",
        )
        admin2 = User(
            id=ADMIN_2_UUID,
            email="admin2@sehatkosh.gov.pk",
            hashed_password="hash2",
            role="super-admin",
        )
        admin3 = User(
            id=ADMIN_3_UUID,
            email="admin3@sehatkosh.gov.pk",
            hashed_password="hash3",
            role="super-admin",
        )
        session.add_all([admin1, admin2, admin3])

        p1 = PatientProfile(
            id=PATIENT_1_UUID,
            mrn="MRN-TEST-001",
            cnic="35201-1234567-1",
            cnic_masked="35201-*****67-1",
            phone_masked="+92-300-***4567",
            blood_group="B+",
            full_name="Ahmad Khan",
            age=33,
            gender="Male",
            allergies=["Penicillin"],
        )
        p2 = PatientProfile(
            id=PATIENT_2_UUID,
            mrn="MRN-TEST-002",
            cnic="35201-9876543-2",
            cnic_masked="35201-*****43-2",
            phone_masked="+92-321-***9876",
            blood_group="O+",
            full_name="Fatima Noor",
            age=28,
            gender="Female",
            allergies=["Sulfa"],
        )
        session.add_all([p1, p2])

        enc1 = ClinicalEncounter(
            id=uuid.uuid4(),
            patient_id=PATIENT_1_UUID,
            physician_name="Dr. Tariq Khan",
            facility_name="Shifa Hospital",
            encounter_date=date(2026, 10, 1),
            document_s3_key="s3://records/raw_001.jpg",
            soap_notes={"assessment": "Type 2 Diabetes Mellitus; Hypertension"},
            fhir_bundle={
                "resourceType": "Bundle",
                "entry": [
                    {
                        "resource": {
                            "resourceType": "MedicationRequest",
                            "medicationCodeableConcept": {"text": "Metformin 500mg"},
                        }
                    },
                    {
                        "resource": {
                            "resourceType": "Condition",
                            "code": {"text": "Type 2 Diabetes Mellitus"},
                        }
                    },
                ],
            },
        )
        enc2 = ClinicalEncounter(
            id=uuid.uuid4(),
            patient_id=PATIENT_2_UUID,
            physician_name="Dr. Ayesha Malik",
            facility_name="Mayo Hospital",
            encounter_date=date(2026, 10, 5),
            document_s3_key="s3://records/raw_002.jpg",
            soap_notes={"assessment": "Acute Bronchitis"},
            fhir_bundle={
                "resourceType": "Bundle",
                "entry": [
                    {
                        "resource": {
                            "resourceType": "MedicationRequest",
                            "medicationCodeableConcept": {"text": "Amoxicillin 500mg"},
                        }
                    }
                ],
            },
        )
        session.add_all([enc1, enc2])
        await session.commit()

    yield

    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# 1. Age Binning & De-Identification Engine Tests (FR-SEC-03)
# ---------------------------------------------------------------------------

def test_bin_age_algorithm():
    """Validates 5-year deterministic age binning specified in FR-SEC-03."""
    assert bin_age(0) == "0-4"
    assert bin_age(4) == "0-4"
    assert bin_age(5) == "5-9"
    assert bin_age(28) == "25-29"
    assert bin_age(33) == "30-34"
    assert bin_age(42) == "40-44"
    assert bin_age(89) == "85-89"
    assert bin_age(90) == "90+"
    assert bin_age(92) == "90+"
    assert bin_age(105) == "90+"
    assert bin_age(-1) == "0-4"
    assert bin_age(None) == "Unknown"


def test_sanitize_patient_record_pii_stripping():
    """
    Ensures sanitize_patient_record never leaks direct identifiers:
    ['cnic', 'phone', 'mrn', 'patient_name', 'doctor_name'].
    """
    patient = PatientProfile(
        id=UUID("33333333-3333-3333-3333-333333333331"),
        mrn="MRN-CONFIDENTIAL-999",
        cnic="35201-9999999-1",
        cnic_masked="35201-*****99-1",
        phone_masked="+92-300-***9999",
        blood_group="AB+",
        full_name="Secret Citizen",
        age=33,
        gender="Male",
        allergies=["NSAIDs"],
    )
    encounter = ClinicalEncounter(
        id=uuid.uuid4(),
        patient_id=patient.id,
        physician_name="Dr. Tariq Khan",
        facility_name="Secret Military Clinic",
        encounter_date=date(2026, 10, 1),
        document_s3_key="s3://classified/record.pdf",
        soap_notes={"assessment": "Asthma"},
        fhir_bundle={
            "resourceType": "Bundle",
            "entry": [
                {
                    "resource": {
                        "resourceType": "MedicationRequest",
                        "medicationCodeableConcept": {"text": "Salbutamol Inhaler"},
                    }
                }
            ],
        },
    )

    clean_record = sanitize_patient_record(patient, [encounter])

    # Required sanitized attributes
    assert clean_record["research_id"] is not None
    assert len(clean_record["research_id"]) == 12
    assert clean_record["age_bracket"] == "30-34"
    assert clean_record["gender"] == "Male"
    assert clean_record["blood_group"] == "AB+"
    assert clean_record["allergies"] == ["NSAIDs"]
    assert "Salbutamol Inhaler" in clean_record["medications"]
    assert clean_record["encounter_count"] == 1

    # Strict check: NEVER contain direct identifier keys
    forbidden_keys = [
        "cnic",
        "phone",
        "mrn",
        "patient_name",
        "doctor_name",
        "physician_name",
        "facility_name",
        "document_s3_key",
        "user_id",
        "full_name",
        "cnic_masked",
        "phone_masked",
    ]
    for key in forbidden_keys:
        assert key not in clean_record, f"Leaked forbidden key '{key}' in sanitized record"

    # Deep check across serialized JSON
    record_json_str = json.dumps(clean_record).lower()
    for forbidden in ["secret citizen", "secret military", "35201-9999999-1", "mrn-confidential"]:
        assert forbidden not in record_json_str, f"Leaked PII value '{forbidden}' in serialized output"


# ---------------------------------------------------------------------------
# 2. Research Export Endpoint Tests (JSON & CSV Streaming + Audit Log)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_research_export_json(async_client: AsyncClient):
    """Tests POST /api/v1/research/export returning streamed JSON dataset and audit log."""
    res = await async_client.post(
        "/api/v1/research/export",
        json={"gender": "Male", "format": "json"},
        headers={"X-Researcher-Id": "44444444-4444-4444-4444-444444444441"},
    )
    assert res.status_code == 200
    assert "application/json" in res.headers["content-type"]

    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 1
    record = data[0]

    assert record["gender"] == "Male"
    assert record["age_bracket"] == "30-34"
    assert "Metformin 500mg" in record["medications"]

    # Verify no PII keys exist in output
    forbidden_keys = ["cnic", "phone", "mrn", "patient_name", "doctor_name"]
    for key in forbidden_keys:
        assert key not in record

    # Verify audit log entry was written
    async with TestAsyncSession() as session:
        stmt = (
            select(AuditLog)
            .where(AuditLog.action_type == "RESEARCH_DATA_EXPORT")
            .order_by(AuditLog.timestamp.desc())
        )
        log = (await session.execute(stmt)).scalars().first()
        assert log is not None
        assert log.severity == "INFO"
        assert log.actor_id == "44444444-4444-4444-4444-444444444441"


@pytest.mark.asyncio
async def test_research_export_csv(async_client: AsyncClient):
    """Tests POST /api/v1/research/export returning streamed CSV dataset."""
    res = await async_client.post(
        "/api/v1/research/export",
        json={"format": "csv"},
        headers={"X-Researcher-Id": "44444444-4444-4444-4444-444444444441"},
    )
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]

    content = res.text
    lines = content.strip().splitlines()
    assert len(lines) >= 3  # Header + 2 patient rows
    header = lines[0].split(",")
    assert "research_id" in header
    assert "age_bracket" in header
    assert "cnic" not in header
    assert "mrn" not in header
    assert "patient_name" not in header


# ---------------------------------------------------------------------------
# 3. Multi-Admin Quorum Engine Tests (FR-SEC-01)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_quorum_lifecycle_and_two_of_three_approval(async_client: AsyncClient):
    """
    Tests 2-of-3 Super Admin Quorum logic:
    1. Action created -> status is PENDING_APPROVAL.
    2. Admin 1 votes APPROVE -> status remains PENDING_APPROVAL (1 vote).
    3. Same Admin 1 attempts to vote again -> rejected with HTTP 400 (integrity check).
    4. Admin 2 votes APPROVE -> status transitions to APPROVED (2 votes).
    """
    # 1. Create quorum request
    create_payload = {
        "action_type": "REVOKE_HOSPITAL_LICENSE",
        "target_id": "HOSP-LAHORE-042",
        "justification": "Gross compliance violation: Repeated unconsented dossier extractions.",
    }
    create_res = await async_client.post(
        "/api/v1/admin/quorum/request",
        json=create_payload,
        headers={"X-Admin-Id": str(ADMIN_1_UUID)},
    )
    assert create_res.status_code == 201
    quorum_data = create_res.json()
    request_id = quorum_data["id"]

    assert quorum_data["status"] == "PENDING_APPROVAL"
    assert quorum_data["approval_count"] == 0
    assert quorum_data["required_signatures"] == 2

    # 2. Admin 1 votes APPROVE -> Status remains PENDING_APPROVAL
    vote1_res = await async_client.post(
        f"/api/v1/admin/quorum/{request_id}/vote",
        json={"decision": "APPROVE"},
        headers={"X-Admin-Id": str(ADMIN_1_UUID)},
    )
    assert vote1_res.status_code == 200
    vote1_data = vote1_res.json()
    assert vote1_data["approval_count"] == 1
    assert vote1_data["status"] == "PENDING_APPROVAL"

    # 3. Integrity check: Admin 1 cannot vote twice
    double_vote_res = await async_client.post(
        f"/api/v1/admin/quorum/{request_id}/vote",
        json={"decision": "APPROVE"},
        headers={"X-Admin-Id": str(ADMIN_1_UUID)},
    )
    assert double_vote_res.status_code == 400
    assert "already cast a vote" in double_vote_res.json()["detail"]

    # 4. Admin 2 votes APPROVE -> Transitions to APPROVED
    vote2_res = await async_client.post(
        f"/api/v1/admin/quorum/{request_id}/vote",
        json={"decision": "APPROVE"},
        headers={"X-Admin-Id": str(ADMIN_2_UUID)},
    )
    assert vote2_res.status_code == 200
    vote2_data = vote2_res.json()
    assert vote2_data["approval_count"] == 2
    assert vote2_data["status"] == "APPROVED"


@pytest.mark.asyncio
async def test_quorum_two_rejections_transitions_to_rejected(async_client: AsyncClient):
    """Tests that 2 distinct REJECT votes transition quorum status to REJECTED."""
    create_payload = {
        "action_type": "PURGE_FACILITY_RECORDS",
        "target_id": "FACILITY-RAWALPINDI-001",
        "justification": "Facility decommission request from municipal authority.",
    }
    create_res = await async_client.post(
        "/api/v1/admin/quorum/request",
        json=create_payload,
        headers={"X-Admin-Id": str(ADMIN_1_UUID)},
    )
    request_id = create_res.json()["id"]

    # First rejection from Admin 1
    r1 = await async_client.post(
        f"/api/v1/admin/quorum/{request_id}/vote",
        json={"decision": "REJECT"},
        headers={"X-Admin-Id": str(ADMIN_1_UUID)},
    )
    assert r1.status_code == 200
    assert r1.json()["status"] == "PENDING_APPROVAL"
    assert r1.json()["rejection_count"] == 1

    # Second rejection from Admin 3
    r2 = await async_client.post(
        f"/api/v1/admin/quorum/{request_id}/vote",
        json={"decision": "REJECT"},
        headers={"X-Admin-Id": str(ADMIN_3_UUID)},
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "REJECTED"
    assert r2.json()["rejection_count"] == 2


@pytest.mark.asyncio
async def test_list_pending_quorum_requests(async_client: AsyncClient):
    """Validates that GET /api/v1/admin/quorum/pending lists only open actions."""
    # Create request 1 (pending)
    res1 = await async_client.post(
        "/api/v1/admin/quorum/request",
        json={
            "action_type": "MASS_DATA_EXPORT",
            "target_id": "NATIONAL_EPIDEMIOLOGY_STUDY",
            "justification": "MOH nationwide cohort study authorization.",
        },
        headers={"X-Admin-Id": str(ADMIN_1_UUID)},
    )
    req1_id = res1.json()["id"]

    # Create request 2 (will be approved)
    res2 = await async_client.post(
        "/api/v1/admin/quorum/request",
        json={
            "action_type": "PURGE_FACILITY_RECORDS",
            "target_id": "TEMP-FACILITY-009",
            "justification": "Testing facility cleanup.",
        },
        headers={"X-Admin-Id": str(ADMIN_1_UUID)},
    )
    req2_id = res2.json()["id"]

    # Approve request 2
    await async_client.post(
        f"/api/v1/admin/quorum/{req2_id}/vote",
        json={"decision": "APPROVE"},
        headers={"X-Admin-Id": str(ADMIN_1_UUID)},
    )
    await async_client.post(
        f"/api/v1/admin/quorum/{req2_id}/vote",
        json={"decision": "APPROVE"},
        headers={"X-Admin-Id": str(ADMIN_2_UUID)},
    )

    # Check pending list
    pending_res = await async_client.get("/api/v1/admin/quorum/pending")
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    pending_ids = [item["id"] for item in pending_list]

    assert req1_id in pending_ids
    assert req2_id not in pending_ids  # Because req2 is APPROVED
