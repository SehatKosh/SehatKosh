import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
import pytest_asyncio
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.security import log_audit_event, require_active_consent
from app.main import app
from app.models.audit import AuditLog
from app.models.base import Base
from app.models.consent import ConsentGrant
from app.models.encounter import ClinicalEncounter
from app.models.patient import PatientProfile
from app.models.user import User

# In-memory async SQLite engine for isolated, non-containerized testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestAsyncSession = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
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
async def db_session():
    """Provides a direct async session for fixture setup and inspection."""
    async with TestAsyncSession() as session:
        yield session


@pytest_asyncio.fixture
async def api_client():
    """Async HTTP client connected to the application with test DB overrides."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


# ─── Model Unit Tests ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_user_model_crud(db_session: AsyncSession):
    user = User(
        email="doctor@sehatkosh.pk",
        hashed_password="hashed_pw_secret",
        role="doctor",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert user.id is not None
    assert user.role == "doctor"

    stmt = select(User).where(User.email == "doctor@sehatkosh.pk")
    res = await db_session.execute(stmt)
    loaded = res.scalars().first()
    assert loaded is not None
    assert loaded.email == "doctor@sehatkosh.pk"


@pytest.mark.asyncio
async def test_patient_profile_and_encounter(db_session: AsyncSession):
    patient_id = uuid.uuid4()
    patient = PatientProfile(
        id=patient_id,
        mrn="MRN-TEST-001",
        cnic="37405-1234567-1",
        cnic_masked="37405-*******-1",
        phone_masked="+92 300 *******",
        blood_group="B+",
        full_name="Muhammad Bilal",
        age=32,
        gender="Male",
        allergies=[{"substance": "Penicillin", "severity": "Severe"}],
    )
    db_session.add(patient)
    await db_session.commit()

    encounter = ClinicalEncounter(
        patient_id=patient_id,
        physician_name="Dr. Tariq Khan",
        facility_name="Shifa International",
        encounter_date=date(2026, 8, 30),
        soap_notes={"assessment": "Bronchitis"},
        fhir_bundle={"resourceType": "Bundle", "entry": []},
        document_s3_key="prescriptions/test.jpg",
    )
    db_session.add(encounter)
    await db_session.commit()
    await db_session.refresh(encounter)

    assert encounter.id is not None
    assert encounter.physician_name == "Dr. Tariq Khan"
    assert encounter.soap_notes["assessment"] == "Bronchitis"


# ─── Consent Boundary & Dependency Tests ─────────────────────────────────────

@pytest.mark.asyncio
async def test_require_active_consent_missing(db_session: AsyncSession):
    patient_id = uuid.uuid4()
    physician_id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        await require_active_consent(
            patient_id=patient_id,
            physician_id=physician_id,
            db=db_session,
        )

    assert exc_info.value.status_code == 403
    assert "No active consent session found" in exc_info.value.detail


@pytest.mark.asyncio
async def test_require_active_consent_active(db_session: AsyncSession):
    patient_id = uuid.uuid4()
    physician_id = uuid.uuid4()

    now = datetime.now(timezone.utc)
    grant = ConsentGrant(
        patient_id=patient_id,
        physician_id=physician_id,
        status="active",
        granted_at=now,
        expires_at=now + timedelta(hours=24),
        is_break_glass=False,
    )
    db_session.add(grant)
    await db_session.commit()

    resolved_grant = await require_active_consent(
        patient_id=patient_id,
        physician_id=physician_id,
        db=db_session,
    )
    assert resolved_grant.id == grant.id
    assert resolved_grant.status == "active"


@pytest.mark.asyncio
async def test_require_active_consent_expired(db_session: AsyncSession):
    patient_id = uuid.uuid4()
    physician_id = uuid.uuid4()

    now = datetime.now(timezone.utc)
    grant = ConsentGrant(
        patient_id=patient_id,
        physician_id=physician_id,
        status="active",
        granted_at=now - timedelta(hours=26),
        expires_at=now - timedelta(hours=2),  # Expired 2 hours ago
        is_break_glass=False,
    )
    db_session.add(grant)
    await db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        await require_active_consent(
            patient_id=patient_id,
            physician_id=physician_id,
            db=db_session,
        )

    assert exc_info.value.status_code == 403
    assert "Consent session expired" in exc_info.value.detail

    # Verify status was updated to expired in database
    await db_session.refresh(grant)
    assert grant.status == "expired"


@pytest.mark.asyncio
async def test_require_active_consent_break_glass(db_session: AsyncSession):
    patient_id = uuid.uuid4()
    physician_id = uuid.uuid4()

    now = datetime.now(timezone.utc)
    grant = ConsentGrant(
        patient_id=patient_id,
        physician_id=physician_id,
        status="active",
        granted_at=now,
        expires_at=now + timedelta(hours=2),
        is_break_glass=True,
        justification="Acute trauma in ER, unconscious patient.",
    )
    db_session.add(grant)
    await db_session.commit()

    resolved = await require_active_consent(
        patient_id=patient_id,
        physician_id=physician_id,
        db=db_session,
    )
    assert resolved.is_break_glass is True


# ─── API End-to-End Tests ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_api_create_encounter_and_audit(api_client: AsyncClient, db_session: AsyncSession):
    patient_id = uuid.uuid4()
    payload = {
        "patient_id": str(patient_id),
        "physician_name": "Dr. Ayesha Malik",
        "facility_name": "PIMS Hospital",
        "encounter_date": "2026-08-15",
        "soap_notes": {"subjective": "Headache and fever"},
        "fhir_bundle": {
            "resourceType": "Bundle",
            "type": "collection",
            "entry": [],
        },
        "document_s3_key": "prescriptions/rx-001.jpg",
    }

    res = await api_client.post("/api/v1/encounters", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["physician_name"] == "Dr. Ayesha Malik"
    assert data["patient_id"] == str(patient_id)

    # Verify AuditLog was written
    stmt = select(AuditLog).where(AuditLog.action_type == "ENCOUNTER_CREATE")
    audit_res = await db_session.execute(stmt)
    audit = audit_res.scalars().first()
    assert audit is not None
    assert audit.patient_id == str(patient_id)
    assert audit.actor_id == "Dr. Ayesha Malik"
    assert audit.severity == "INFO"


@pytest.mark.asyncio
async def test_api_dossier_requires_consent(api_client: AsyncClient, db_session: AsyncSession):
    patient_id = uuid.uuid4()
    physician_id = uuid.uuid4()

    # Pre-create patient
    patient = PatientProfile(
        id=patient_id,
        mrn="MRN-DOSSIER-1",
        cnic="37405-1234567-2",
        cnic_masked="37405-*******-2",
        phone_masked="+92 321 *******",
        blood_group="A+",
        full_name="Sara Khan",
        age=35,
        gender="Female",
        allergies=[],
    )
    db_session.add(patient)
    await db_session.commit()

    # 1. Access without consent -> 403 Forbidden
    res_no_consent = await api_client.get(
        f"/api/v1/patients/{patient_id}/dossier",
        params={"physician_id": str(physician_id)},
    )
    assert res_no_consent.status_code == 403

    # 2. Grant active consent -> 200 OK
    grant_payload = {
        "patient_id": str(patient_id),
        "physician_id": str(physician_id),
        "validity_hours": 24,
    }
    grant_res = await api_client.post("/api/v1/consent/grant", json=grant_payload)
    assert grant_res.status_code == 201

    # 3. Access dossier with active consent -> 200 OK
    res_with_consent = await api_client.get(
        f"/api/v1/patients/{patient_id}/dossier",
        params={"physician_id": str(physician_id)},
    )
    assert res_with_consent.status_code == 200
    dossier = res_with_consent.json()
    assert dossier["patient"]["mrn"] == "MRN-DOSSIER-1"
    assert dossier["consent"]["status"] == "active"

    # Verify DOSSIER_VIEW audit log
    stmt = select(AuditLog).where(AuditLog.action_type == "DOSSIER_VIEW")
    audit_res = await db_session.execute(stmt)
    audit = audit_res.scalars().first()
    assert audit is not None
    assert audit.patient_id == str(patient_id)


@pytest.mark.asyncio
async def test_api_break_glass_flow(api_client: AsyncClient, db_session: AsyncSession):
    patient_id = uuid.uuid4()

    # Reject short justification (< 20 chars)
    short_payload = {
        "patient_id": str(patient_id),
        "treating_physician_name": "Dr. Usman Farooq",
        "witness_staff_id": "STAFF-902",
        "justification": "Too short",
    }
    res_invalid = await api_client.post("/api/v1/consent/break-glass", json=short_payload)
    assert res_invalid.status_code == 422

    # Accept valid justification (>= 20 chars)
    valid_payload = {
        "patient_id": str(patient_id),
        "treating_physician_name": "Dr. Usman Farooq",
        "witness_staff_id": "STAFF-902",
        "justification": "Patient unconscious in ER following severe road traffic accident.",
    }
    res_valid = await api_client.post("/api/v1/consent/break-glass", json=valid_payload)
    assert res_valid.status_code == 201
    data = res_valid.json()
    assert data["is_break_glass"] is True

    # Check CRITICAL audit log
    stmt = select(AuditLog).where(AuditLog.action_type == "BREAK_GLASS_OVERRIDE")
    audit_res = await db_session.execute(stmt)
    audit = audit_res.scalars().first()
    assert audit is not None
    assert audit.severity == "CRITICAL"


@pytest.mark.asyncio
async def test_api_demographic_sandbox_isolation(api_client: AsyncClient, db_session: AsyncSession):
    patient_id = uuid.uuid4()
    patient = PatientProfile(
        id=patient_id,
        mrn="MRN-SANDBOX-1",
        cnic="37405-9999999-9",
        cnic_masked="37405-*******-9",
        phone_masked="+92 333 *******",
        blood_group="O+",
        full_name="Tariq Mahmood",
        age=45,
        gender="Male",
        allergies=[],
    )
    db_session.add(patient)
    await db_session.commit()

    res = await api_client.get(
        "/api/v1/patients/search",
        params={"cnic": "37405-9999999-9"},
    )
    assert res.status_code == 200
    demographics = res.json()

    # Sandboxed fields present
    assert demographics["mrn"] == "MRN-SANDBOX-1"
    assert demographics["cnic_masked"] == "37405-*******-9"
    assert demographics["name"] == "Tariq Mahmood"

    # Strictly isolated: zero clinical diagnostic or prescription keys present
    assert "diagnoses" not in demographics
    assert "prescriptions" not in demographics
    assert "soap_notes" not in demographics
    assert "encounters" not in demographics
