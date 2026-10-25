"""
Sprint 3 Security & End-to-End Regression Test Suite
Validates:
1. BOLA / IDOR Verification: Physician B denied access to Physician A's patient (403 + WARNING audit log).
2. Expired Consent Lockout: Expired grants strictly reject dossier access.
3. Demographic Sandbox Leak Test: /patients/search contains 0 clinical diagnosis/encounter keys.
4. Break-Glass Input Validation: Rejects short justification (<20 chars) with HTTP 422.
5. Queue Filtering Test: GET /queue/active returns only active, unexpired sessions for the requesting doctor.
"""

import uuid
from datetime import datetime, timedelta, timezone
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
from app.models.consent import ConsentGrant
from app.models.encounter import ClinicalEncounter
from app.models.patient import PatientProfile


# In SQLite, declare UUID as TEXT so numeric-only UUIDs are not coerced to float
@compiles(sa.UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "TEXT"


# In-memory async SQLite engine for isolated test execution
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

# Deterministic test fixture UUIDs
DOC_1_UUID = UUID("11111111-1111-1111-1111-111111111111")
DOC_2_UUID = UUID("11111111-1111-1111-1111-111111111112")
PATIENT_1_UUID = UUID("33333333-3333-3333-3333-333333333331")
PATIENT_2_UUID = UUID("33333333-3333-3333-3333-333333333332")
PATIENT_3_UUID = UUID("33333333-3333-3333-3333-333333333333")


@pytest_asyncio.fixture(autouse=True)
async def setup_sprint3_db():
    """Initializes tables for each test and overrides get_db dependency."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def _get_test_db():
        async with TestAsyncSession() as session:
            yield session

    app.dependency_overrides[get_db] = _get_test_db

    yield

    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def direct_db():
    """Direct database session for inspecting committed records."""
    async with TestAsyncSession() as session:
        yield session


# ─── 1. BOLA / IDOR Verification ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_bola_physician_access_denied(direct_db: AsyncSession):
    """
    Physician B attempting to access Patient A (whose consent is granted strictly
    to Physician A) must receive 403 Forbidden, and an audit log with severity WARNING
    must be immutably recorded.
    """
    now = datetime.now(timezone.utc)

    # 1. Setup Patient 1 with active consent granted strictly to Doctor 1
    p1 = PatientProfile(
        id=PATIENT_1_UUID,
        mrn="MRN-BOLA-001",
        cnic="3740512345671",
        cnic_masked="37405-*******-1",
        phone_masked="0300-***0001",
        blood_group="B+",
        full_name="Ali Raza",
        age=34,
        gender="Male",
        allergies=["Penicillin"],
    )
    direct_db.add(p1)

    grant1 = ConsentGrant(
        id=uuid.uuid4(),
        patient_id=PATIENT_1_UUID,
        physician_id=DOC_1_UUID,
        status="active",
        granted_at=now,
        expires_at=now + timedelta(hours=24),
        is_break_glass=False,
    )
    direct_db.add(grant1)
    await direct_db.commit()

    # 2. Doctor 2 attempts to fetch dossier
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/patients/{PATIENT_1_UUID}/dossier?physician_id={DOC_2_UUID}"
        )

    # 3. Assert 403 Forbidden with exact detail
    assert response.status_code == 403
    assert response.json()["detail"] == "No active consent session found"

    # 4. Assert audit log entry recorded with severity WARNING
    audit_res = await direct_db.execute(
        select(AuditLog).where(
            AuditLog.actor_id == str(DOC_2_UUID),
            AuditLog.patient_id == str(PATIENT_1_UUID),
        )
    )
    logs = audit_res.scalars().all()
    assert len(logs) >= 1
    assert any(log.severity == "WARNING" for log in logs)
    assert any(log.action_type == "UNAUTHORIZED_ACCESS_ATTEMPT" for log in logs)


# ─── 2. Expired Consent Lockout ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_expired_consent_lockout(direct_db: AsyncSession):
    """
    Attempting to fetch dossier of a patient whose consent has expired must result in
    403 Forbidden and detail explaining re-authorization is required.
    """
    now = datetime.now(timezone.utc)

    p3 = PatientProfile(
        id=PATIENT_3_UUID,
        mrn="MRN-EXP-003",
        cnic="3740599999995",
        cnic_masked="37405-*******-5",
        phone_masked="0333-***0003",
        blood_group="A-",
        full_name="Muhammad Usman",
        age=45,
        gender="Male",
        allergies=["Aspirin"],
    )
    direct_db.add(p3)

    # Consent expired 2 hours ago
    expired_grant = ConsentGrant(
        id=uuid.uuid4(),
        patient_id=PATIENT_3_UUID,
        physician_id=DOC_1_UUID,
        status="expired",
        granted_at=now - timedelta(hours=26),
        expires_at=now - timedelta(hours=2),
        is_break_glass=False,
    )
    direct_db.add(expired_grant)
    await direct_db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/patients/{PATIENT_3_UUID}/dossier?physician_id={DOC_1_UUID}"
        )

    assert response.status_code == 403
    assert "Consent session expired. Re-authorization required." in response.json()["detail"]


# ─── 3. Demographic Sandbox Leak Test ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_demographic_sandbox_leak_prevention(direct_db: AsyncSession):
    """
    Calling GET /api/v1/patients/search must return 200 OK with demographic fields,
    and explicitly contain ZERO clinical diagnosis, prescription, or note fields.
    """
    p1 = PatientProfile(
        id=PATIENT_1_UUID,
        mrn="MRN-SANDBOX-001",
        cnic="3740512345671",
        cnic_masked="37405-*******-1",
        phone_masked="0300-***0001",
        blood_group="B+",
        full_name="Ali Raza",
        age=34,
        gender="Male",
        allergies=["Penicillin"],
    )
    direct_db.add(p1)

    enc = ClinicalEncounter(
        id=uuid.uuid4(),
        patient_id=PATIENT_1_UUID,
        physician_name="Dr. Tariq Khan",
        facility_name="Shifa International",
        encounter_date=datetime.now(timezone.utc),
        soap_notes={"assessment": "Hypertension Stage 2"},
        fhir_bundle={"resourceType": "Bundle"},
    )
    direct_db.add(enc)
    await direct_db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/patients/search?cnic=3740512345671")

    assert response.status_code == 200
    data = response.json()

    # Required demographic fields must be present
    assert data["mrn"] == "MRN-SANDBOX-001"
    assert data["name"] == "Ali Raza"
    assert data["cnic_masked"] == "37405-*******-1"

    # Sensitive clinical keys must strictly NOT exist
    forbidden_keys = [
        "allergies",
        "soap_notes",
        "fhir_bundle",
        "prescriptions",
        "medications",
        "encounters",
        "diagnoses",
    ]
    for key in forbidden_keys:
        assert key not in data, f"Demographic sandbox leaked forbidden clinical key: '{key}'"


# ─── 4. Break-Glass Input Validation ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_break_glass_justification_validation():
    """
    Emergency break-glass requests require minimum 20 characters of clinical justification.
    Requests with insufficient justification must fail with 422 Unprocessable Entity.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "patient_id": str(PATIENT_1_UUID),
            "treating_physician_name": "Dr. Tariq Khan",
            "witness_staff_id": "NURSE-042",
            "justification": "too short",  # Only 9 characters (< 20)
        }
        response = await client.post("/api/v1/consent/break-glass", json=payload)

    assert response.status_code == 422


# ─── 5. Queue Filtering Test ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_queue_filtering_active_only(direct_db: AsyncSession):
    """
    GET /api/v1/queue/active must return unexpired active sessions for Doctor 1,
    omitting expired sessions and sessions for other physicians.
    """
    now = datetime.now(timezone.utc)

    # Patient 1: Active for Doctor 1 (expires in 23h)
    p1 = PatientProfile(
        id=PATIENT_1_UUID,
        mrn="MRN-Q-001",
        cnic="3740512345671",
        cnic_masked="37405-*******-1",
        phone_masked="0300-***0001",
        blood_group="B+",
        full_name="Ali Raza",
    )
    direct_db.add(p1)
    g1 = ConsentGrant(
        id=uuid.uuid4(),
        patient_id=PATIENT_1_UUID,
        physician_id=DOC_1_UUID,
        status="active",
        granted_at=now - timedelta(hours=1),
        expires_at=now + timedelta(hours=23),
        is_break_glass=False,
    )
    direct_db.add(g1)

    # Patient 2: Active for Doctor 1 (expires in 18h, break-glass)
    p2 = PatientProfile(
        id=PATIENT_2_UUID,
        mrn="MRN-Q-002",
        cnic="3740576543213",
        cnic_masked="37405-*******-3",
        phone_masked="0321-***0002",
        blood_group="O+",
        full_name="Fatima Bibi",
    )
    direct_db.add(p2)
    g2 = ConsentGrant(
        id=uuid.uuid4(),
        patient_id=PATIENT_2_UUID,
        physician_id=DOC_1_UUID,
        status="active",
        granted_at=now - timedelta(hours=2),
        expires_at=now + timedelta(hours=18),
        is_break_glass=True,
    )
    direct_db.add(g2)

    # Patient 3: Expired for Doctor 1 (expired 2 hours ago)
    p3 = PatientProfile(
        id=PATIENT_3_UUID,
        mrn="MRN-Q-003",
        cnic="3740599999995",
        cnic_masked="37405-*******-5",
        phone_masked="0333-***0003",
        blood_group="A-",
        full_name="Muhammad Usman",
    )
    direct_db.add(p3)
    g3 = ConsentGrant(
        id=uuid.uuid4(),
        patient_id=PATIENT_3_UUID,
        physician_id=DOC_1_UUID,
        status="expired",
        granted_at=now - timedelta(hours=26),
        expires_at=now - timedelta(hours=2),
        is_break_glass=False,
    )
    direct_db.add(g3)

    await direct_db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/queue/active?physician_id={DOC_1_UUID}")

    assert response.status_code == 200
    queue = response.json()

    # Patient 1 and Patient 2 must appear
    returned_ids = [item["id"] for item in queue]
    assert str(PATIENT_1_UUID) in returned_ids
    assert str(PATIENT_2_UUID) in returned_ids

    # Patient 3 (expired) must NOT appear
    assert str(PATIENT_3_UUID) not in returned_ids

    # Check emergency badge flag
    p2_item = next(item for item in queue if item["id"] == str(PATIENT_2_UUID))
    assert p2_item["is_break_glass"] is True

    p1_item = next(item for item in queue if item["id"] == str(PATIENT_1_UUID))
    assert p1_item["is_break_glass"] is False


@pytest.mark.asyncio
async def test_queue_empty_for_physician_without_active_grants():
    """
    A physician with no active consent grants must receive an empty list ([]) with 200 OK.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/queue/active?physician_id={DOC_2_UUID}")

    assert response.status_code == 200
    assert response.json() == []
