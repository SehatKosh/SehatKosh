"""
Sprint 9 Automated Tests: Native HL7 FHIR R4 Server Facade,
Quarantine Review (Reject / Staging List), and Encounter S3 Attachment Metadata.
"""

import uuid
from datetime import date, datetime, timezone

import pytest
import pytest_asyncio
import sqlalchemy as sa
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles

from app.core.database import get_db
from app.main import app
from app.models.attachment import ClinicalAttachment
from app.models.base import Base
from app.models.department import Department
from app.models.encounter import ClinicalEncounter
from app.models.facility import Facility
from app.models.patient import PatientProfile
from app.models.staff import Practitioner
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
ENCOUNTER_1_ID = uuid.UUID("eeeeeeee-1111-1111-1111-111111111111")


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

        # Patient Profile
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
        session.add(pat1)

        # Pre-seed Encounter with FHIR bundle containing MedicationRequest
        enc1 = ClinicalEncounter(
            id=ENCOUNTER_1_ID,
            patient_id=PATIENT_1_ID,
            facility_id=PIMS_ID,
            practitioner_id=PRACTITIONER_PIMS_ID,
            encounter_class="AMB",
            status="FINALIZED",
            encounter_date=date(2026, 11, 1),
            physician_name="Dr. Tariq Khan",
            facility_name="PIMS Hospital",
            source_type="HOSPITAL_EMR_NATIVE",
            verification_status="CLINICIAN_VERIFIED",
            fhir_bundle={
                "resourceType": "Bundle",
                "type": "collection",
                "entry": [
                    {
                        "fullUrl": "urn:uuid:med-001",
                        "resource": {
                            "resourceType": "MedicationRequest",
                            "id": "med-001",
                            "status": "active",
                            "intent": "order",
                            "medicationCodeableConcept": {
                                "coding": [
                                    {
                                        "system": "http://snomed.info/sct",
                                        "code": "387517004",
                                        "display": "Paracetamol 500mg",
                                    }
                                ],
                                "text": "Paracetamol 500mg",
                            },
                        },
                    }
                ],
            },
            finalized_at=datetime.now(timezone.utc),
        )
        session.add(enc1)
        await session.commit()

    yield

    app.dependency_overrides.clear()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_fhir_capability_statement(client: AsyncClient):
    """
    1. Public GET /fhir/R4/metadata returns normative CapabilityStatement (v4.0.1).
    """
    res = await client.get("/fhir/R4/metadata")
    assert res.status_code == 200
    data = res.json()
    assert data["resourceType"] == "CapabilityStatement"
    assert data["fhirVersion"] == "4.0.1"
    assert "format" in data
    assert any("json" in f for f in data["format"])
    resources = data["rest"][0]["resource"]
    res_types = [r["type"] for r in resources]
    assert "Patient" in res_types
    assert "Encounter" in res_types
    assert "MedicationRequest" in res_types
    assert "Bundle" in res_types


@pytest.mark.asyncio
async def test_fhir_encounter_search_bola_blocked(client: AsyncClient):
    """
    2. GET /fhir/R4/Encounter?patient={id} without active consent -> 403 Forbidden.
    """
    res = await client.get(f"/fhir/R4/Encounter?patient={PATIENT_1_ID}")
    assert res.status_code == 403
    assert "consent" in res.json().get("detail", "").lower()


@pytest.mark.asyncio
async def test_fhir_encounter_and_medication_search_with_consent(client: AsyncClient):
    """
    3. Grant active consent -> GET /fhir/R4/Encounter & GET /fhir/R4/MedicationRequest return 200 searchset Bundles.
    """
    # Grant active consent for 24h
    grant_res = await client.post(
        "/api/v1/consent/grant",
        json={
            "patient_id": str(PATIENT_1_ID),
            "physician_id": str(DOC_PIMS_USER_ID),
            "scope": "ALL",
            "duration_hours": 24,
        },
    )
    assert grant_res.status_code == 201

    headers = {"X-Physician-Id": str(DOC_PIMS_USER_ID)}

    # Encounter search
    enc_res = await client.get(f"/fhir/R4/Encounter?patient={PATIENT_1_ID}", headers=headers)
    assert enc_res.status_code == 200
    enc_data = enc_res.json()
    assert enc_data["resourceType"] == "Bundle"
    assert enc_data["type"] == "searchset"
    assert enc_data["total"] >= 1
    enc_entry = enc_data["entry"][0]["resource"]
    assert enc_entry["resourceType"] == "Encounter"
    assert enc_entry["status"] == "finished"
    assert any(
        ext.get("url") == "http://sehatkosh.gov.pk/fhir/StructureDefinition/source-type"
        for ext in enc_entry.get("extension", [])
    )

    # MedicationRequest search
    med_res = await client.get(f"/fhir/R4/MedicationRequest?patient={PATIENT_1_ID}", headers=headers)
    assert med_res.status_code == 200
    med_data = med_res.json()
    assert med_data["resourceType"] == "Bundle"
    assert med_data["type"] == "searchset"
    assert med_data["total"] >= 1
    med_resource = med_data["entry"][0]["resource"]
    assert med_resource["resourceType"] == "MedicationRequest"
    assert med_resource["status"] == "active"


@pytest.mark.asyncio
async def test_fhir_bundle_post_quarantines_in_staging(client: AsyncClient):
    """
    4. External EHR posts FHIR bundle to POST /fhir/R4/Bundle -> 202 Accepted and quarantined in staging.
    """
    bundle_payload = {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "ext-pat-01",
                    "name": [{"text": "External Ingest Patient"}],
                }
            },
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "id": "ext-med-01",
                    "medicationCodeableConcept": {"text": "Metformin 500mg"},
                }
            },
        ],
    }

    res = await client.post(
        "/fhir/R4/Bundle",
        json=bundle_payload,
        headers={"X-Facility-ID": str(PIMS_ID)},
    )
    assert res.status_code == 202
    data = res.json()
    assert data["resourceType"] == "BundleResponse"
    assert data["status"] == "accepted"
    assert data["quarantine_status"] == "QUARANTINED"
    assert "staging_id" in data


@pytest.mark.asyncio
async def test_staging_reject_workflow(client: AsyncClient):
    """
    5. Ingestion Staging: List records, then reject a quarantined record with reason.
    """
    # 1. Create a staging record
    async with TestAsyncSession() as session:
        staging_rec = IngestionStagingRecord(
            source_facility_id=PIMS_ID,
            adapter_name="external_fhir",
            schema_version="4.0.1",
            raw_payload={"sample": "data"},
            normalized_fhir_preview={"resourceType": "Bundle"},
            validation_errors=[],
            status="QUARANTINED",
        )
        session.add(staging_rec)
        await session.commit()
        await session.refresh(staging_rec)
        staging_id = staging_rec.id

    # 2. List staging records
    list_res = await client.get("/api/v1/ingestion/staging")
    assert list_res.status_code == 200
    stg_list = list_res.json()
    assert len(stg_list) >= 1
    assert any(str(r["id"]) == str(staging_id) for r in stg_list)

    # 3. Reject staging record
    reject_res = await client.post(
        f"/api/v1/ingestion/{staging_id}/reject",
        json={"reason": "Incompatible diagnostic schema format"},
    )
    assert reject_res.status_code == 200
    rej_data = reject_res.json()
    assert rej_data["status"] == "REJECTED"
    assert any("Incompatible diagnostic schema" in err for err in rej_data["validation_errors"])


@pytest.mark.asyncio
async def test_list_encounter_attachments_with_consent(client: AsyncClient):
    """
    6. Attachments: List attachments for an encounter with active consent.
    """
    # 1. Direct seed an attachment linked to ENCOUNTER_1_ID
    attachment_id = uuid.uuid4()
    dummy_sha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    async with TestAsyncSession() as session:
        att = ClinicalAttachment(
            id=attachment_id,
            encounter_id=ENCOUNTER_1_ID,
            patient_id=PATIENT_1_ID,
            facility_id=PIMS_ID,
            modality_category="LAB_REPORT_PDF",
            s3_bucket="sehatkosh-vault",
            s3_key=f"facilities/{PIMS_ID}/encounters/{ENCOUNTER_1_ID}/lab.pdf",
            mime_type="application/pdf",
            file_size_bytes=2048,
            sha256_hash=dummy_sha256,
            uploaded_by_role="DOCTOR",
        )
        session.add(att)
        await session.commit()

    # 2. Query attachments without consent -> 403 Forbidden
    res_no_consent = await client.get(f"/api/v1/attachments/encounter/{ENCOUNTER_1_ID}")
    assert res_no_consent.status_code == 403

    # 3. Query with patient self-ownership header -> 200 OK
    res_patient = await client.get(
        f"/api/v1/attachments/encounter/{ENCOUNTER_1_ID}",
        headers={"X-Patient-Id": str(PATIENT_1_ID)},
    )
    assert res_patient.status_code == 200
    att_list = res_patient.json()
    assert len(att_list) >= 1
    assert att_list[0]["sha256_hash"] == dummy_sha256
    assert att_list[0]["modality_category"] == "LAB_REPORT_PDF"
