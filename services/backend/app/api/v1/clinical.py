from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.encounter import ClinicalEncounter
from app.models.patient import PatientProfile
from app.schemas.clinical import (
    ICD10Item,
    InteractionCheckRequest,
    InteractionCheckResponse,
    TriageCalculateRequest,
    TriageCalculateResponse,
)
from app.services.anonymizer import extract_medications_from_bundle
from app.services.ddi_engine import check_prescription_safety
from app.services.triage import calculate_triage_priority

router = APIRouter(prefix="/clinical", tags=["Clinical Safety & Triage"])

# Standard Pakistani clinical formulary ICD-10 reference dataset
STANDARD_ICD10: List[ICD10Item] = [
    ICD10Item(code="I10", description="Essential Hypertension"),
    ICD10Item(code="E11.9", description="Type 2 Diabetes Mellitus without complications"),
    ICD10Item(code="J20.9", description="Acute Bronchitis, unspecified"),
    ICD10Item(code="I25.9", description="Chronic Ischemic Heart Disease"),
    ICD10Item(code="A09", description="Infectious Gastroenteritis and Colitis"),
    ICD10Item(code="A90", description="Dengue Fever"),
    ICD10Item(code="A01.0", description="Typhoid Fever"),
    ICD10Item(code="J06.9", description="Acute Upper Respiratory Infection, unspecified"),
    ICD10Item(code="K29.7", description="Gastritis, unspecified"),
    ICD10Item(code="N39.0", description="Urinary Tract Infection, site not specified"),
    ICD10Item(code="T07", description="Unspecified multiple injuries / Acute Trauma"),
    ICD10Item(code="J45.909", description="Unspecified Asthma, uncomplicated"),
]


@router.post(
    "/check-interactions",
    response_model=InteractionCheckResponse,
    summary="Check drug-drug interactions and allergy cross-sensitivities",
)
async def check_interactions(
    payload: InteractionCheckRequest,
    db: AsyncSession = Depends(get_db),
) -> InteractionCheckResponse:
    """
    Evaluates prescription safety against known patient allergies and longitudinal medications.
    """
    allergies: List[str] = list(payload.allergies or [])
    current_meds: List[str] = []

    if payload.patient_id:
        # Load patient allergies
        stmt_pat = select(PatientProfile).where(PatientProfile.id == payload.patient_id)
        res_pat = await db.execute(stmt_pat)
        patient = res_pat.scalars().first()
        if patient and patient.allergies:
            for a in patient.allergies:
                if isinstance(a, str) and a not in allergies:
                    allergies.append(a)

        # Load active/recent encounter medications
        stmt_enc = (
            select(ClinicalEncounter)
            .where(ClinicalEncounter.patient_id == payload.patient_id)
            .order_by(ClinicalEncounter.encounter_date.desc())
            .limit(5)
        )
        res_enc = await db.execute(stmt_enc)
        encounters = res_enc.scalars().all()
        for enc in encounters:
            meds = extract_medications_from_bundle(enc.fhir_bundle)
            for m in meds:
                if m not in current_meds:
                    current_meds.append(m)

    alerts = check_prescription_safety(
        allergies=allergies,
        current_medications=current_meds,
        proposed_medications=payload.proposed_medications,
    )

    is_safe = not any(a.severity == "CRITICAL" for a in alerts)
    return InteractionCheckResponse(safe=is_safe, alerts=alerts)


@router.get(
    "/icd10",
    response_model=List[ICD10Item],
    summary="Search ICD-10 diagnostic codes",
)
async def search_icd10(
    query: Optional[str] = Query(None, alias="query"),
    q: Optional[str] = Query(None, alias="q"),
) -> List[ICD10Item]:
    """
    Searches standard clinical ICD-10 terminology by disease name or code.
    """
    term = (query or q or "").strip().lower()
    if not term:
        return STANDARD_ICD10[:8]

    matches = [
        item for item in STANDARD_ICD10
        if term in item.code.lower() or term in item.description.lower()
    ]
    return matches


@router.post(
    "/triage-calculate",
    response_model=TriageCalculateResponse,
    summary="Calculate triage priority from vital signs",
)
async def triage_calculate(
    payload: TriageCalculateRequest,
) -> TriageCalculateResponse:
    """
    Executes the deterministic hospital triage decision matrix.
    """
    vitals_dict = payload.model_dump(exclude_none=True)
    priority, reasoning = calculate_triage_priority(vitals_dict)
    return TriageCalculateResponse(priority=priority, reasoning=reasoning)
