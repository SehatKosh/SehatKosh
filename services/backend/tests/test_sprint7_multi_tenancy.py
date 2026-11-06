"""
Sprint 7 Automated Tests: Multi-Tenant Enterprise Facility Scaffolding & Isolation
Satisfies:
- Relational Schema: facilities, departments, practitioners, patient_facility_records, triage_queue_entries
- Enterprise Clinical Encounters: SOAP fields, vitals, triage priorities, encounter classes
- REST Endpoints: GET /facilities, GET /facilities/{id}/departments, GET/POST /facilities/{id}/queue
- Institutional Data Isolation: Verifying cross-facility access restrictions via active facility context
"""

import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
import sqlalchemy as sa
from sqlalchemy.ext.compiler import compiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import app
from app.models.base import Base
from app.models.consent import ConsentGrant
from app.models.department import Department
from app.models.encounter import ClinicalEncounter
from app.models.facility import Facility
from app.models.patient import PatientFacilityRecord, PatientProfile
from app.models.queue import TriageQueueEntry
from app.models.staff import Practitioner
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
RAZI_ID = uuid.UUID("aaaaaaaa-2222-2222-2222-222222222222")

PIMS_OPD_ID = uuid.UUID("bbbbbbbb-1111-1111-1111-111111111111")
PIMS_ER_ID = uuid.UUID("bbbbbbbb-1111-1111-1111-111111111112")
RAZI_OPD_ID = uuid.UUID("bbbbbbbb-2222-2222-2222-222222222221")

DOC_PIMS_USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
DOC_RAZI_USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111112")

PRACTITIONER_PIMS_ID = uuid.UUID("cccccccc-1111-1111-1111-111111111111")
PRACTITIONER_RAZI_ID = uuid.UUID("cccccccc-2222-2222-2222-222222222221")

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

    # Seed test fixtures
    async with TestAsyncSession() as session:
        # Facilities
        pims = Facility(
            id=PIMS_ID,
            name="Pakistan Institute of Medical Sciences (PIMS)",
            code="PIMS",
            facility_type="PUBLIC_TERTIARY",
            license_number="PHC-2024-001",
            is_active=True,
        )
        razi = Facility(
            id=RAZI_ID,
            name="Razi Hospital Islamabad",
            code="RAZI",
            facility_type="PRIVATE_HOSPITAL",
            license_number="IHRA-2024-042",
            is_active=True,
        )
        session.add_all([pims, razi])

        # Departments
        pims_opd = Department(
            id=PIMS_OPD_ID,
            facility_id=PIMS_ID,
            name="Outpatient Department (OPD)",
            code="OPD",
            floor_or_location="Ground Floor",
            is_active=True,
        )
        pims_er = Department(
            id=PIMS_ER_ID,
            facility_id=PIMS_ID,
            name="Emergency & Trauma",
            code="ER",
            floor_or_location="Trauma Wing",
            is_active=True,
        )
        razi_opd = Department(
            id=RAZI_OPD_ID,
            facility_id=RAZI_ID,
            name="Consultant Clinics",
            code="OPD",
            floor_or_location="1st Floor",
            is_active=True,
        )
        session.add_all([pims_opd, pims_er, razi_opd])

        # Users
        u1 = User(id=DOC_PIMS_USER_ID, email="dr.pims@test.org", hashed_password="pw", role="doctor")
        u2 = User(id=DOC_RAZI_USER_ID, email="dr.razi@test.org", hashed_password="pw", role="doctor")
        session.add_all([u1, u2])

        # Practitioners
        prac1 = Practitioner(
            id=PRACTITIONER_PIMS_ID,
            user_id=DOC_PIMS_USER_ID,
            facility_id=PIMS_ID,
            department_id=PIMS_OPD_ID,
            pmdc_number="12345-P",
            designation="Consultant Cardiologist",
            prescribing_authority=True,
        )
        prac2 = Practitioner(
            id=PRACTITIONER_RAZI_ID,
            user_id=DOC_RAZI_USER_ID,
            facility_id=RAZI_ID,
            department_id=RAZI_OPD_ID,
            pmdc_number="67890-P",
            designation="Consultant Physician",
            prescribing_authority=True,
        )
        session.add_all([prac1, prac2])

        # Patients
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
        )
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
        )
        session.add_all([pat1, pat2])
        await session.commit()

    yield

    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_list_facilities_and_departments(client: AsyncClient):
    """Verifies listing active facilities and departmental sub-resources."""
    resp = await client.get("/api/v1/facilities")
    assert resp.status_code == 200
    facs = resp.json()
    assert len(facs) == 2
    codes = {f["code"] for f in facs}
    assert "PIMS" in codes
    assert "RAZI" in codes

    # Departments for PIMS
    dept_resp = await client.get(f"/api/v1/facilities/{PIMS_ID}/departments")
    assert dept_resp.status_code == 200
    depts = dept_resp.json()
    assert len(depts) == 2
    dept_codes = {d["code"] for d in depts}
    assert "OPD" in dept_codes
    assert "ER" in dept_codes

    # 404 for unknown facility
    bad_resp = await client.get(f"/api/v1/facilities/{uuid.uuid4()}/departments")
    assert bad_resp.status_code == 404


@pytest.mark.asyncio
async def test_list_practitioners(client: AsyncClient):
    """Verifies listing clinicians bound to a facility with PMDC registration."""
    resp = await client.get(f"/api/v1/facilities/{PIMS_ID}/practitioners")
    assert resp.status_code == 200
    pracs = resp.json()
    assert len(pracs) == 1
    assert pracs[0]["designation"] == "Consultant Cardiologist"
    assert pracs[0]["pmdc_number"] == "12345-P"
    assert pracs[0]["prescribing_authority"] is True


@pytest.mark.asyncio
async def test_patient_intake_auto_mrn_provisioning(client: AsyncClient):
    """
    Simulates patient Ali visiting PIMS, then visiting Razi:
    Verifies sequential local MRN is provisioned uniquely for each hospital.
    """
    # 1. Enqueue Ali at PIMS
    pims_enqueue = await client.post(
        f"/api/v1/facilities/{PIMS_ID}/queue",
        json={
            "patient_id": str(PATIENT_1_ID),
            "department_id": str(PIMS_OPD_ID),
            "triage_priority": "ROUTINE",
            "chief_complaint": "Persistent cough",
            "vitals_snapshot": {"bp": "120/80", "pulse": 72},
        },
    )
    assert pims_enqueue.status_code == 201
    pims_data = pims_enqueue.json()
    assert pims_data["local_mrn"] == "PIMS-2026-0001"
    assert pims_data["token_number"] == "OPD-001"
    assert pims_data["patient_mrn"] == "SK-UHID-001"

    # 2. Enqueue Ali at Razi (First visit to Razi)
    razi_enqueue = await client.post(
        f"/api/v1/facilities/{RAZI_ID}/queue",
        json={
            "patient_id": str(PATIENT_1_ID),
            "department_id": str(RAZI_OPD_ID),
            "triage_priority": "URGENT",
            "chief_complaint": "Severe chest pain",
            "vitals_snapshot": {"bp": "145/95", "pulse": 88},
        },
    )
    assert razi_enqueue.status_code == 201
    razi_data = razi_enqueue.json()
    assert razi_data["local_mrn"] == "RAZI-2026-0001"
    assert razi_data["token_number"] == "OPD-001"
    # Same national patient identity
    assert razi_data["patient_id"] == str(PATIENT_1_ID)


@pytest.mark.asyncio
async def test_institutional_data_isolation(client: AsyncClient):
    """
    Verifies that Facility A staff cannot query or tamper with Facility B's waiting queue.
    """
    # Admit patient at PIMS
    await client.post(
        f"/api/v1/facilities/{PIMS_ID}/queue",
        json={
            "patient_id": str(PATIENT_1_ID),
            "department_id": str(PIMS_OPD_ID),
            "triage_priority": "ROUTINE",
        },
    )

    # Admit patient at Razi
    await client.post(
        f"/api/v1/facilities/{RAZI_ID}/queue",
        json={
            "patient_id": str(PATIENT_2_ID),
            "department_id": str(RAZI_OPD_ID),
            "triage_priority": "URGENT",
        },
    )

    # 1. PIMS queue contains ONLY PIMS patient
    pims_q = await client.get(
        f"/api/v1/facilities/{PIMS_ID}/queue",
        headers={"X-Facility-ID": str(PIMS_ID)},
    )
    assert pims_q.status_code == 200
    pims_items = pims_q.json()
    assert len(pims_items) == 1
    assert pims_items[0]["patient_id"] == str(PATIENT_1_ID)

    # 2. Razi queue contains ONLY Razi patient
    razi_q = await client.get(
        f"/api/v1/facilities/{RAZI_ID}/queue",
        headers={"X-Facility-ID": str(RAZI_ID)},
    )
    assert razi_q.status_code == 200
    razi_items = razi_q.json()
    assert len(razi_items) == 1
    assert razi_items[0]["patient_id"] == str(PATIENT_2_ID)

    # 3. Cross-facility access attempt: Caller with PIMS context attempts to inspect Razi queue
    cross_attempt = await client.get(
        f"/api/v1/facilities/{RAZI_ID}/queue",
        headers={"X-Facility-ID": str(PIMS_ID)},
    )
    assert cross_attempt.status_code == 403
    assert "Cross-facility access denied" in cross_attempt.json()["detail"]


@pytest.mark.asyncio
async def test_enterprise_encounter_model_fields(client: AsyncClient):
    """
    Verifies ClinicalEncounter persistence with enterprise fields:
    facility_id, practitioner_id, encounter_class, triage_priority, SOAP fields.
    """
    async with TestAsyncSession() as session:
        encounter = ClinicalEncounter(
            id=uuid.uuid4(),
            patient_id=PATIENT_1_ID,
            facility_id=PIMS_ID,
            practitioner_id=PRACTITIONER_PIMS_ID,
            encounter_class="EMERGENCY",
            triage_priority="CRITICAL_RESUSCITATION",
            vitals_snapshot={"bp_systolic": 80, "bp_diastolic": 50, "pulse": 130},
            soap_subjective="Acute trauma from motorcycle crash.",
            soap_objective="Multiple contusions, conscious but confused.",
            soap_assessment={"icd10": "T07", "text": "Unspecified multiple injuries"},
            soap_plan="Stat IV fluids, CT scan head and abdomen.",
            status="FINALIZED",
            physician_name="Dr. Tariq Khan",
            facility_name="Pakistan Institute of Medical Sciences (PIMS)",
            encounter_date=date.today(),
            fhir_bundle={"resourceType": "Bundle", "type": "document", "entry": []},
            finalized_at=datetime.now(timezone.utc),
        )
        session.add(encounter)
        await session.commit()

        # Query back and verify relationships
        stmt = (
            select(ClinicalEncounter)
            .where(ClinicalEncounter.id == encounter.id)
        )
        res = await session.execute(stmt)
        saved = res.scalars().first()

        assert saved is not None
        assert saved.facility_id == PIMS_ID
        assert saved.practitioner_id == PRACTITIONER_PIMS_ID
        assert saved.encounter_class == "EMERGENCY"
        assert saved.triage_priority == "CRITICAL_RESUSCITATION"
        assert saved.soap_assessment["icd10"] == "T07"
        assert saved.vitals_snapshot["pulse"] == 130
        assert saved.status == "FINALIZED"

