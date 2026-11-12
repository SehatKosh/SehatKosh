from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    status,
)
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import log_audit_event, require_active_consent
from app.models.encounter import ClinicalEncounter
from app.models.patient import PatientProfile
from app.models.staging import IngestionStagingRecord
from app.modules.ingestion.registry import get_ingest_adapter

router = APIRouter(prefix="/fhir/R4", tags=["HL7 FHIR R4 REST Server"])

DEFAULT_PIMS_FACILITY_ID = UUID("11111111-1111-1111-1111-111111111111")


@router.get(
    "/metadata",
    summary="HL7 FHIR R4 CapabilityStatement",
    response_model=None,
)
async def get_fhir_capability_statement() -> Dict[str, Any]:
    """
    Public conformance statement declaring normative HL7 FHIR R4 server capabilities.
    Specification: FHIR Version 4.0.1 (Normative).
    """
    return {
        "resourceType": "CapabilityStatement",
        "id": "sehatkosh-fhir-r4-server",
        "status": "active",
        "date": "2026-11-12",
        "publisher": "SehatKosh Enterprise Health Informatics Fabric",
        "kind": "instance",
        "software": {
            "name": "SehatKosh EMR FHIR Facade",
            "version": "1.0.0",
        },
        "implementation": {
            "description": "SehatKosh Dual-Custody EMR & HIS Interoperability Server",
            "url": "https://api.sehatkosh.gov.pk/fhir/R4",
        },
        "fhirVersion": "4.0.1",
        "format": ["json", "application/fhir+json"],
        "rest": [
            {
                "mode": "server",
                "documentation": "Secure, consent-guarded clinical FHIR R4 endpoint facade",
                "security": {
                    "cors": True,
                    "description": "Zero-trust demographic sandboxing with 24-hour consent session tokens",
                },
                "resource": [
                    {
                        "type": "Patient",
                        "interaction": [
                            {"code": "read"},
                            {"code": "search-type"},
                        ],
                        "searchParam": [
                            {"name": "identifier", "type": "token"},
                            {"name": "_id", "type": "token"},
                        ],
                    },
                    {
                        "type": "Encounter",
                        "interaction": [
                            {"code": "search-type"},
                        ],
                        "searchParam": [
                            {"name": "patient", "type": "reference"},
                        ],
                    },
                    {
                        "type": "MedicationRequest",
                        "interaction": [
                            {"code": "search-type"},
                        ],
                        "searchParam": [
                            {"name": "patient", "type": "reference"},
                        ],
                    },
                    {
                        "type": "Bundle",
                        "interaction": [
                            {"code": "create"},
                        ],
                    },
                ],
            }
        ],
    }


@router.get(
    "/Patient/{patient_id}",
    summary="Get FHIR R4 Patient by ID",
    response_model=None,
)
async def get_fhir_patient_by_id(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Normative FHIR R4 Patient resource.
    Demographics sandbox: returns identifiers (MRN & masked CNIC) and non-clinical metadata.
    """
    stmt = select(PatientProfile).where(PatientProfile.id == patient_id)
    res = await db.execute(stmt)
    patient = res.scalars().first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient resource '{patient_id}' not found.",
        )

    telecom = []
    if patient.phone_masked:
        telecom.append({"system": "phone", "value": patient.phone_masked, "use": "mobile"})

    return {
        "resourceType": "Patient",
        "id": str(patient.id),
        "identifier": [
            {
                "system": "http://sehatkosh.gov.pk/mrn",
                "value": patient.mrn,
                "use": "official",
            },
            {
                "system": "http://nadra.gov.pk/cnic",
                "value": patient.cnic_masked,
                "use": "secondary",
            },
        ],
        "active": True,
        "name": [
            {
                "use": "official",
                "text": "Confidential Patient",
            }
        ],
        "gender": (patient.gender or "unknown").lower(),
        "telecom": telecom,
    }


@router.get(
    "/Patient",
    summary="Search FHIR R4 Patient by identifier (CNIC or MRN)",
    response_model=None,
)
async def search_fhir_patients(
    identifier: Optional[str] = Query(None, description="CNIC or MRN token"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Searches patients by CNIC or MRN.
    Returns a normative FHIR searchset Bundle conforming to demographic sandbox isolation.
    """
    stmt = select(PatientProfile)
    if identifier:
        id_clean = identifier.strip()
        stmt = stmt.where(
            or_(
                PatientProfile.cnic_masked == id_clean,
                PatientProfile.mrn == id_clean,
                PatientProfile.mrn.ilike(f"%{id_clean}%"),
            )
        )

    res = await db.execute(stmt)
    patients = res.scalars().all()

    entries = []
    for pat in patients:
        entries.append(
            {
                "fullUrl": f"urn:uuid:{pat.id}",
                "resource": {
                    "resourceType": "Patient",
                    "id": str(pat.id),
                    "identifier": [
                        {
                            "system": "http://sehatkosh.gov.pk/mrn",
                            "value": pat.mrn,
                        },
                        {
                            "system": "http://nadra.gov.pk/cnic",
                            "value": pat.cnic_masked,
                        },
                    ],
                    "gender": (pat.gender or "unknown").lower(),
                },
            }
        )

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries,
    }


@router.get(
    "/Encounter",
    summary="Search FHIR R4 Encounters for Patient",
    response_model=None,
)
async def search_fhir_encounters(
    request: Request,
    patient: UUID = Query(..., description="Target patient UUID"),
    physician_id: Optional[UUID] = Query(None),
    x_patient_id: Optional[UUID] = Header(None, alias="X-Patient-Id"),
    x_physician_id: Optional[UUID] = Header(None, alias="X-Physician-Id"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Guarded by active consent session or patient self-ownership.
    Returns a normative FHIR Bundle of Encounter resources with provenance extensions.
    """
    # Enforce active consent check
    await require_active_consent(
        patient_id=patient,
        physician_id=physician_id,
        x_patient_id=x_patient_id,
        db=db,
        x_physician_id=x_physician_id,
    )

    stmt = select(ClinicalEncounter).where(
        ClinicalEncounter.patient_id == patient
    ).order_by(ClinicalEncounter.encounter_date.desc())
    res = await db.execute(stmt)
    encounters = res.scalars().all()

    entries: List[Dict[str, Any]] = []
    for enc in encounters:
        enc_res: Dict[str, Any] = {
            "resourceType": "Encounter",
            "id": str(enc.id),
            "status": "finished" if enc.status == "FINALIZED" else "in-progress",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": enc.encounter_class or "AMB",
                "display": "ambulatory",
            },
            "subject": {
                "reference": f"Patient/{enc.patient_id}",
            },
            "period": {
                "start": enc.encounter_date.isoformat() if enc.encounter_date else None,
            },
            "serviceProvider": {
                "display": enc.facility_name or "SehatKosh Connected Facility",
            },
            "extension": [
                {
                    "url": "http://sehatkosh.gov.pk/fhir/StructureDefinition/source-type",
                    "valueString": enc.source_type or "HOSPITAL_EMR_NATIVE",
                },
                {
                    "url": "http://sehatkosh.gov.pk/fhir/StructureDefinition/verification-status",
                    "valueString": enc.verification_status or "CLINICIAN_VERIFIED",
                },
            ],
        }

        if enc.parent_encounter_id:
            enc_res["partOf"] = {"reference": f"Encounter/{enc.parent_encounter_id}"}

        entries.append(
            {
                "fullUrl": f"urn:uuid:{enc.id}",
                "resource": enc_res,
            }
        )

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=str(x_physician_id or physician_id or x_patient_id or "ANONYMOUS"),
        action_type="FHIR_ENCOUNTER_SEARCH",
        patient_id=str(patient),
        ip_address=client_ip,
        severity="INFO",
    )

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries,
    }


@router.get(
    "/MedicationRequest",
    summary="Search FHIR R4 MedicationRequests for Patient",
    response_model=None,
)
async def search_fhir_medication_requests(
    request: Request,
    patient: UUID = Query(..., description="Target patient UUID"),
    physician_id: Optional[UUID] = Query(None),
    x_patient_id: Optional[UUID] = Header(None, alias="X-Patient-Id"),
    x_physician_id: Optional[UUID] = Header(None, alias="X-Physician-Id"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Guarded by active consent session or patient self-ownership.
    Extracts all MedicationRequest resources from across the patient's longitudinal encounters.
    """
    # Enforce active consent check
    await require_active_consent(
        patient_id=patient,
        physician_id=physician_id,
        x_patient_id=x_patient_id,
        db=db,
        x_physician_id=x_physician_id,
    )

    stmt = select(ClinicalEncounter).where(
        ClinicalEncounter.patient_id == patient
    ).order_by(ClinicalEncounter.encounter_date.desc())
    res = await db.execute(stmt)
    encounters = res.scalars().all()

    entries: List[Dict[str, Any]] = []

    for enc in encounters:
        bundle = enc.fhir_bundle
        if isinstance(bundle, dict):
            b_entries = bundle.get("entry", [])
            if isinstance(b_entries, list):
                for e in b_entries:
                    if isinstance(e, dict):
                        r = e.get("resource", {})
                        if isinstance(r, dict) and r.get("resourceType") == "MedicationRequest":
                            entries.append(
                                {
                                    "fullUrl": e.get("fullUrl") or f"urn:uuid:{r.get('id', 'med-rx')}",
                                    "resource": r,
                                }
                            )

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id=str(x_physician_id or physician_id or x_patient_id or "ANONYMOUS"),
        action_type="FHIR_MEDICATION_SEARCH",
        patient_id=str(patient),
        ip_address=client_ip,
        severity="INFO",
    )

    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries,
    }


@router.post(
    "/Bundle",
    summary="Ingest external HL7 FHIR Bundle via Quarantine Staging",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=None,
)
async def ingest_fhir_bundle(
    request: Request,
    x_facility_id: Optional[UUID] = Header(None, alias="X-Facility-ID"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Quarantine-first ingestion for external hospital FHIR R4 Bundles.
    Persists incoming bundles into ingestion_staging_records with status QUARANTINED.
    Returns HTTP 202 Accepted with staging_id.
    """
    try:
        raw_bundle = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed FHIR JSON payload: {str(e)}",
        )

    if not isinstance(raw_bundle, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expected JSON object for FHIR Bundle.",
        )

    # Resolve facility ID: Graceful fallback to seeded PIMS if omitted
    resolved_facility_id = x_facility_id or DEFAULT_PIMS_FACILITY_ID

    adapter = get_ingest_adapter("external_fhir")
    fhir_bundle, errors = await adapter.parse_to_fhir(raw_bundle)

    staging_status = "VALIDATION_FAILED" if errors else "QUARANTINED"

    staging_rec = IngestionStagingRecord(
        source_facility_id=resolved_facility_id,
        adapter_name="external_fhir",
        schema_version="4.0.1",
        raw_payload=raw_bundle,
        normalized_fhir_preview=fhir_bundle if not errors else None,
        validation_errors=errors,
        status=staging_status,
    )
    db.add(staging_rec)
    await db.commit()
    await db.refresh(staging_rec)

    client_ip = request.client.host if request.client else None
    await log_audit_event(
        db=db,
        actor_id="EXTERNAL_FHIR_GATEWAY",
        action_type="FHIR_BUNDLE_INGESTION",
        ip_address=client_ip,
        severity="INFO" if not errors else "WARNING",
    )

    return {
        "resourceType": "BundleResponse",
        "status": "accepted",
        "staging_id": str(staging_rec.id),
        "quarantine_status": staging_rec.status,
        "validation_errors": staging_rec.validation_errors or [],
        "message": (
            "Bundle successfully quarantined in Ingestion Staging Queue pending clinical review."
            if not errors
            else "Bundle quarantined with validation warnings."
        ),
    }
