import hashlib
from typing import Any, Dict, List, Optional

from app.models.encounter import ClinicalEncounter
from app.models.patient import PatientProfile

DIRECT_IDENTIFIER_KEYS = {
    "cnic",
    "cnic_masked",
    "phone",
    "phone_masked",
    "mrn",
    "patient_name",
    "full_name",
    "doctor_name",
    "physician_name",
    "facility_name",
    "document_s3_key",
    "user_id",
}


def bin_age(age: Optional[int]) -> str:
    """
    Groups age into 5-year deterministic bins satisfying FR-SEC-03:
    0-4, 5-9, 10-14, ..., 85-89, 90+.
    """
    if age is None:
        return "Unknown"
    if age < 0:
        return "0-4"
    if age >= 90:
        return "90+"
    lower = (age // 5) * 5
    upper = lower + 4
    return f"{lower}-{upper}"


def extract_medications_from_bundle(fhir_bundle: Optional[dict]) -> List[str]:
    """
    Extracts only generic / brand medication names from a FHIR bundle,
    stripping facility names, physician identity, and document keys.
    """
    if not fhir_bundle or not isinstance(fhir_bundle, dict):
        return []

    medications: List[str] = []
    entries = fhir_bundle.get("entry", [])
    if not isinstance(entries, list):
        return []

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        resource = entry.get("resource", {})
        if resource.get("resourceType") == "MedicationRequest":
            concept = resource.get("medicationCodeableConcept", {})
            name = concept.get("text")
            if not name:
                coding = concept.get("coding", [])
                if isinstance(coding, list) and len(coding) > 0:
                    name = coding[0].get("display")
            if name and name not in medications:
                medications.append(name)

    return sorted(medications)


def extract_diagnoses_from_encounters(encounters: List[ClinicalEncounter]) -> List[str]:
    """
    Aggregates clinical diagnoses from encounter FHIR bundles and SOAP notes.
    """
    diagnoses: List[str] = []
    for enc in encounters:
        # 1. From FHIR bundle Condition resources
        bundle = enc.fhir_bundle
        if isinstance(bundle, dict):
            for entry in bundle.get("entry", []):
                if isinstance(entry, dict):
                    res = entry.get("resource", {})
                    if res.get("resourceType") == "Condition":
                        concept = res.get("code", {})
                        text = concept.get("text")
                        if not text:
                            coding = concept.get("coding", [])
                            if isinstance(coding, list) and len(coding) > 0:
                                text = coding[0].get("display")
                        if text and text not in diagnoses:
                            diagnoses.append(text)

        # 2. From SOAP notes assessment
        soap = enc.soap_notes
        if isinstance(soap, dict):
            assessment = soap.get("assessment") or soap.get("diagnosis")
            if assessment and isinstance(assessment, str):
                # Clean up bullet or comma separated terms
                terms = [t.strip(" -•*") for t in assessment.replace(";", ",").split(",") if t.strip()]
                for t in terms:
                    if t and t not in diagnoses:
                        diagnoses.append(t)

    return sorted(diagnoses)


def sanitize_patient_record(
    patient: PatientProfile,
    encounters: List[ClinicalEncounter],
    salt: str = "sehatkosh-research-salt",
) -> Dict[str, Any]:
    """
    De-identifies a patient record and associated encounters:
    - Redacts mrn, cnic, phone, user_id, full_name, physician, and facility names.
    - Generates an ephemeral research pseudo-ID: sha256(f"{patient.id}{salt}")[:12].
    - Replaces exact birthdate/age with 5-year age bin.
    - Aggregates diagnoses, blood group, and prescribed medications without document keys.
    """
    pseudo_id = hashlib.sha256(f"{patient.id}{salt}".encode()).hexdigest()[:12]
    age_bracket = bin_age(patient.age)

    # Collect medications and diagnoses across encounters
    all_medications: List[str] = []
    for enc in encounters:
        meds = extract_medications_from_bundle(enc.fhir_bundle)
        for m in meds:
            if m not in all_medications:
                all_medications.append(m)

    diagnoses = extract_diagnoses_from_encounters(encounters)

    record: Dict[str, Any] = {
        "research_id": pseudo_id,
        "age_bracket": age_bracket,
        "gender": patient.gender or "Unknown",
        "blood_group": patient.blood_group,
        "allergies": [a for a in (patient.allergies or []) if isinstance(a, str)],
        "diagnoses": diagnoses,
        "medications": sorted(all_medications),
        "encounter_count": len(encounters),
    }

    # Strict defense: ensure none of the direct identifier keys exist
    for key in DIRECT_IDENTIFIER_KEYS:
        record.pop(key, None)

    return record
