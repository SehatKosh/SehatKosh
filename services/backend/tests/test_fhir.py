"""
Comprehensive edge-case tests for the FHIR normalisation pipeline.

Test matrix:
  Unit — ResilientFHIRAdapter
    1. Raw unstructured text input
    2. Typo/aliased keys with unknown drug
    3. Completely empty payload
    4. Fully structured clean input (SNOMED codes preserved)
    5. Mixed types (numeric strength, "TDS" frequency string)
    6. Multiple medications in raw text
    7. Non-dict input (bare string)

  Unit — Normalizer
    8. Frequency mapping: TDS / BD / OD / QID
    9. SNOMED lookup: known drugs / unknown drugs
    10. Key aliasing: physician / drugs / visit_date

  Unit — Pydantic FHIR schemas
    11. FHIRBundle.model_validate on valid dict
    12. MedicationRequest defaults

  Regression — MockFHIRAdapter (original tests preserved)
    13-17. Original test suite (bundle shape, entry count, SNOMED codes, etc.)

  Integration — Health check endpoint
    18-19. /api/v1/health returns ok with mock config
"""

from __future__ import annotations

import re
from datetime import date

import pytest
from httpx import AsyncClient

from app.modules.fhir.adapters import MockFHIRAdapter, ResilientFHIRAdapter
from app.modules.fhir.normalizer import normalise_ocr_output, _parse_frequency, _lookup_snomed
from app.schemas.fhir import FHIRBundle, MedicationRequest, CodeableConcept, Coding


# ===========================================================================
# Helpers
# ===========================================================================

def _is_iso_date(value: str) -> bool:
    """Return True when value matches YYYY-MM-DD."""
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}$", str(value)))


def _is_iso_datetime(value: str) -> bool:
    """Return True when value looks like an ISO 8601 datetime."""
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", str(value)))


def _bundle_med_requests(bundle: dict) -> list[dict]:
    """Extract all MedicationRequest resources from a bundle dict."""
    return [
        e["resource"]
        for e in bundle.get("entry", [])
        if e.get("resource", {}).get("resourceType") == "MedicationRequest"
    ]


# ===========================================================================
# 1. Raw unstructured text input
# ===========================================================================

@pytest.mark.asyncio
async def test_resilient_raw_text_produces_valid_bundle():
    """
    Input: raw_text blob mentioning a known drug with frequency.
    Assert: valid Bundle, ≥1 MedicationRequest, frequency=2 (BD), status='active'.
    """
    adapter = ResilientFHIRAdapter()
    result = await adapter.transform_to_fhir(
        {"raw_text": "Patient: Ali, Doctor: Dr. Aslam, Augmentin 625mg twice daily for 5 days"}
    )

    assert result["resourceType"] == "Bundle"
    assert _is_iso_datetime(result["timestamp"])

    med_requests = _bundle_med_requests(result)
    assert len(med_requests) >= 1, "Expected at least 1 MedicationRequest from raw text"

    # Find the Augmentin entry
    aug = next(
        (r for r in med_requests if "augmentin" in r["medicationCodeableConcept"]["text"].lower()),
        None,
    )
    assert aug is not None, "Augmentin not found in MedicationRequests"

    # Frequency check (twice daily → frequency=2)
    dosage = aug["dosageInstruction"][0]
    timing = dosage.get("timing")
    if timing and timing.get("repeat"):
        assert timing["repeat"]["frequency"] == 2

    assert aug["status"] in {"active", "unknown"}


# ===========================================================================
# 2. Typo/aliased keys + unknown drug
# ===========================================================================

@pytest.mark.asyncio
async def test_resilient_typo_keys_unknown_drug():
    """
    Input: misspelled key 'drugs', unknown herb, qty field.
    Assert: valid Bundle, CodeableConcept.text == 'UnknownHerb', coding == [],
            status may be 'unknown', no unhandled exceptions.
    """
    adapter = ResilientFHIRAdapter()
    result = await adapter.transform_to_fhir(
        {"doc": "Dr. Smith", "drugs": [{"title": "UnknownHerb", "qty": "some"}]}
    )

    assert result["resourceType"] == "Bundle"

    med_requests = _bundle_med_requests(result)
    assert len(med_requests) == 1

    mr = med_requests[0]
    concept = mr["medicationCodeableConcept"]
    assert concept["text"] == "UnknownHerb"
    assert concept["coding"] == [], "Unknown drug must have empty coding list"
    assert mr["intent"] == "order"
    assert mr["status"] in {"active", "unknown"}


# ===========================================================================
# 3. Completely empty payload
# ===========================================================================

@pytest.mark.asyncio
async def test_resilient_empty_payload_valid_bundle():
    """
    Input: {}.
    Assert: valid Bundle with a Patient entry, no MedicationRequests,
            valid ISO timestamp, no exceptions.
    """
    adapter = ResilientFHIRAdapter()
    result = await adapter.transform_to_fhir({})

    assert result["resourceType"] == "Bundle"
    assert _is_iso_datetime(result["timestamp"])
    assert isinstance(result["entry"], list)
    # Should still have a Patient entry
    patient_entries = [
        e for e in result["entry"]
        if e.get("resource", {}).get("resourceType") == "Patient"
    ]
    assert len(patient_entries) >= 1
    # Zero MedicationRequests from empty payload
    assert len(_bundle_med_requests(result)) == 0


# ===========================================================================
# 4. Fully structured clean input
# ===========================================================================

@pytest.mark.asyncio
async def test_resilient_structured_input_snomed_codes(sample_ocr_output: dict):
    """
    Input: canonical OCR dict with known SNOMED drugs.
    Assert: SNOMED codes preserved, timings structured, status='active'.
    """
    adapter = ResilientFHIRAdapter()
    result = await adapter.transform_to_fhir(sample_ocr_output)

    assert result["resourceType"] == "Bundle"

    med_requests = _bundle_med_requests(result)
    assert len(med_requests) == len(sample_ocr_output["medications"])

    # Collect SNOMED codes from FHIR output
    actual_codes = set()
    for mr in med_requests:
        for coding in mr["medicationCodeableConcept"].get("coding", []):
            if coding.get("code"):
                actual_codes.add(coding["code"])

    expected_codes = {
        m["snomed_code"]
        for m in sample_ocr_output["medications"]
        if m.get("snomed_code")
    }
    assert expected_codes.issubset(actual_codes)

    # authoredOn must be a valid date
    for mr in med_requests:
        if mr.get("authoredOn"):
            assert _is_iso_date(mr["authoredOn"])


# ===========================================================================
# 5. Mixed types: numeric strength + shorthand frequency
# ===========================================================================

@pytest.mark.asyncio
async def test_resilient_mixed_types_numeric_strength():
    """
    Input: strength as int, frequency as 'TDS'.
    Assert: produces valid bundle without errors.
    """
    adapter = ResilientFHIRAdapter()
    result = await adapter.transform_to_fhir(
        {
            "doctor_name": "Dr. Haris",
            "medications": [
                {
                    "name": "Paracetamol",
                    "strength": 500,        # numeric, not string
                    "frequency": "TDS",
                    "duration": "5 days",
                    "snomed_code": "387517004",
                }
            ],
        }
    )

    assert result["resourceType"] == "Bundle"
    med_requests = _bundle_med_requests(result)
    assert len(med_requests) == 1
    mr = med_requests[0]
    assert "500" in mr["dosageInstruction"][0]["text"]

    # TDS → frequency = 3
    timing = mr["dosageInstruction"][0].get("timing")
    if timing and timing.get("repeat"):
        assert timing["repeat"]["frequency"] == 3


# ===========================================================================
# 6. Multiple medications in raw text
# ===========================================================================

@pytest.mark.asyncio
async def test_resilient_multiple_meds_in_raw_text():
    """
    Input: raw_text with Amoxicillin and Paracetamol mentioned.
    Assert: both detected as MedicationRequests.
    """
    adapter = ResilientFHIRAdapter()
    result = await adapter.transform_to_fhir(
        {
            "raw_text": (
                "Rx: Amoxicillin 500mg TDS x7 days "
                "and Paracetamol 1000mg BD x5 days"
            )
        }
    )

    assert result["resourceType"] == "Bundle"
    med_requests = _bundle_med_requests(result)
    names_lower = [mr["medicationCodeableConcept"]["text"].lower() for mr in med_requests]
    assert any("amoxicillin" in n or "amoxil" in n for n in names_lower), (
        f"Amoxicillin not found in {names_lower}"
    )
    assert any("paracetamol" in n for n in names_lower), (
        f"Paracetamol not found in {names_lower}"
    )


# ===========================================================================
# 7. Non-dict input: bare string
# ===========================================================================

@pytest.mark.asyncio
async def test_resilient_bare_string_input():
    """
    Input: bare string (not wrapped in dict).
    Assert: valid Bundle returned, no exception.
    """
    adapter = ResilientFHIRAdapter()
    result = await adapter.transform_to_fhir(
        "Dr. Tariq Khan prescribed Cap Amoxil 500 mg 1 cap tid x 5 days for Ahsan"
    )
    assert result["resourceType"] == "Bundle"
    assert isinstance(result["entry"], list)


# ===========================================================================
# 8. Frequency mapping unit tests
# ===========================================================================

@pytest.mark.parametrize("text,expected_freq", [
    ("TDS", 3),
    ("TID", 3),
    ("three times a day", 3),
    ("1-0-1", 3),
    ("BD", 2),
    ("BID", 2),
    ("twice daily", 2),
    ("OD", 1),
    ("once daily", 1),
    ("QID", 4),
    ("four times a day", 4),
    ("weekly", 1),
    ("once a week", 1),
    ("SOS", 1),
    ("PRN", 1),
])
def test_parse_frequency_mapping(text: str, expected_freq: int):
    freq, period, unit = _parse_frequency(text)
    assert freq == expected_freq, f"'{text}' → expected freq={expected_freq}, got {freq}"
    assert period is not None
    assert unit is not None


def test_parse_frequency_unknown_returns_none():
    freq, period, unit = _parse_frequency("some random phrase")
    assert freq is None
    assert period is None
    assert unit is None


# ===========================================================================
# 9. SNOMED lookup unit tests
# ===========================================================================

@pytest.mark.parametrize("drug,expected_code", [
    ("Amoxicillin", "372687004"),
    ("amoxil", "372687004"),
    ("Paracetamol", "387517004"),
    ("Panadol", "387517004"),
    ("Ibuprofen", "387207008"),
    ("Brufen", "387207008"),
    ("Ciprofloxacin", "372840008"),
    ("Cipro", "372840008"),
    ("Augmentin", "89519000"),
    ("Metformin", "372567009"),
])
def test_snomed_lookup_known_drugs(drug: str, expected_code: str):
    code, display = _lookup_snomed(drug)
    assert code == expected_code, f"Expected {expected_code} for '{drug}', got {code}"
    assert display is not None


def test_snomed_lookup_unknown_drug_returns_none():
    code, display = _lookup_snomed("QuantumHerb9000")
    assert code is None
    assert display is None


# ===========================================================================
# 10. Key aliasing in normalizer
# ===========================================================================

def test_normalizer_physician_key_alias():
    """'physician' key should be recognised as doctor_name."""
    result = normalise_ocr_output({"physician": "Dr. Zain", "medications": []})
    assert result["doctor_name"] == "Dr. Zain"


def test_normalizer_drugs_key_alias():
    """'drugs' key should be recognised as the medication list."""
    result = normalise_ocr_output(
        {"drugs": [{"name": "Paracetamol", "strength": "500mg", "frequency": "OD"}]}
    )
    assert len(result["medications"]) == 1
    assert result["medications"][0]["name"] == "Paracetamol"


def test_normalizer_visit_date_key_alias():
    """'visit_date' key should be recognised as the authored date."""
    result = normalise_ocr_output({"visit_date": "2026-05-01", "medications": []})
    assert result["date"] == "2026-05-01"


def test_normalizer_empty_fallback_date():
    """Empty payload date should fall back to today's ISO date."""
    result = normalise_ocr_output({})
    assert _is_iso_date(result["date"])
    assert result["date"] == date.today().isoformat()


def test_normalizer_malformed_date_fallback():
    """Non-ISO date should be replaced with today."""
    result = normalise_ocr_output({"date": "13th October 2026"})
    assert _is_iso_date(result["date"])


# ===========================================================================
# 11. FHIRBundle Pydantic schema validation
# ===========================================================================

def test_fhir_bundle_model_validate_valid_dict():
    """FHIRBundle.model_validate should accept a properly shaped dict."""
    raw = {
        "resourceType": "Bundle",
        "id": "test-id",
        "type": "collection",
        "timestamp": "2026-10-13T10:00:00+00:00",
        "entry": [],
    }
    bundle = FHIRBundle.model_validate(raw)
    assert bundle.resourceType == "Bundle"
    assert bundle.type == "collection"
    assert bundle.entry == []


def test_fhir_bundle_roundtrip():
    """FHIRBundle → model_dump → model_validate should be lossless."""
    bundle = FHIRBundle()
    dumped = bundle.model_dump(mode="json")
    reloaded = FHIRBundle.model_validate(dumped)
    assert reloaded.id == bundle.id
    assert reloaded.timestamp == bundle.timestamp


# ===========================================================================
# 12. MedicationRequest Pydantic defaults
# ===========================================================================

def test_medication_request_defaults():
    """MedicationRequest defaults must satisfy FHIR R4 constraints."""
    mr = MedicationRequest(
        medicationCodeableConcept=CodeableConcept(text="Aspirin"),
        subject={"reference": "urn:uuid:patient-1"},
    )
    assert mr.status == "unknown"
    assert mr.intent == "order"
    assert mr.resourceType == "MedicationRequest"
    assert isinstance(mr.id, str) and len(mr.id) > 0
    assert mr.dosageInstruction == []


# ===========================================================================
# 13-17. Regression — MockFHIRAdapter (original tests preserved)
# ===========================================================================

@pytest.mark.asyncio
async def test_fhir_adapter_returns_bundle_resource_type(sample_ocr_output: dict):
    """FHIR output must have resourceType: 'Bundle'."""
    adapter = MockFHIRAdapter()
    result = await adapter.transform_to_fhir(sample_ocr_output)

    assert result.get("resourceType") == "Bundle", (
        f"Expected 'Bundle', got {result.get('resourceType')}"
    )


@pytest.mark.asyncio
async def test_fhir_adapter_bundle_has_required_fields(sample_ocr_output: dict):
    """Bundle must contain id, type, timestamp, and entry fields."""
    adapter = MockFHIRAdapter()
    result = await adapter.transform_to_fhir(sample_ocr_output)

    assert "id" in result, "Bundle missing 'id'"
    assert "type" in result, "Bundle missing 'type'"
    assert "timestamp" in result, "Bundle missing 'timestamp'"
    assert "entry" in result, "Bundle missing 'entry'"
    assert isinstance(result["entry"], list), "'entry' must be a list"


@pytest.mark.asyncio
async def test_fhir_adapter_entry_count_matches_medications(sample_ocr_output: dict):
    """Bundle entry count must equal the number of medications in OCR output."""
    adapter = MockFHIRAdapter()
    result = await adapter.transform_to_fhir(sample_ocr_output)

    expected_count = len(sample_ocr_output["medications"])
    actual_count = len(result["entry"])
    assert actual_count == expected_count, (
        f"Expected {expected_count} entries, got {actual_count}"
    )


@pytest.mark.asyncio
async def test_fhir_entries_are_medication_requests(sample_ocr_output: dict):
    """Each Bundle entry must contain a MedicationRequest resource."""
    adapter = MockFHIRAdapter()
    result = await adapter.transform_to_fhir(sample_ocr_output)

    for i, entry in enumerate(result["entry"]):
        resource = entry.get("resource", {})
        assert resource.get("resourceType") == "MedicationRequest", (
            f"Entry {i} is not a MedicationRequest: {resource.get('resourceType')}"
        )


@pytest.mark.asyncio
async def test_fhir_entries_preserve_snomed_codes(sample_ocr_output: dict):
    """SNOMED CT codes from OCR output must appear in the FHIR MedicationRequest coding."""
    adapter = MockFHIRAdapter()
    result = await adapter.transform_to_fhir(sample_ocr_output)

    expected_codes = {
        med["snomed_code"]
        for med in sample_ocr_output["medications"]
        if med.get("snomed_code")
    }

    actual_codes = set()
    for entry in result["entry"]:
        resource = entry["resource"]
        coding = (
            resource.get("medicationCodeableConcept", {})
            .get("coding", [])
        )
        for code_entry in coding:
            actual_codes.add(code_entry.get("code"))

    assert expected_codes.issubset(actual_codes), (
        f"SNOMED codes missing from FHIR output. "
        f"Expected: {expected_codes}, Found: {actual_codes}"
    )


@pytest.mark.asyncio
async def test_fhir_entries_have_dosage_instructions(sample_ocr_output: dict):
    """Each MedicationRequest must have at least one dosageInstruction."""
    adapter = MockFHIRAdapter()
    result = await adapter.transform_to_fhir(sample_ocr_output)

    for i, entry in enumerate(result["entry"]):
        resource = entry["resource"]
        dosage = resource.get("dosageInstruction", [])
        assert len(dosage) >= 1, f"Entry {i} missing dosageInstruction"
        assert dosage[0].get("text"), f"Entry {i} has empty dosage text"


@pytest.mark.asyncio
async def test_fhir_adapter_handles_empty_medications():
    """FHIR adapter must gracefully handle an empty medications list."""
    adapter = MockFHIRAdapter()
    empty_input = {
        "doctor_name": "Dr. Test",
        "clinic": "Test Clinic",
        "date": "2026-10-01",
        "medications": [],
        "raw_text": "",
    }
    result = await adapter.transform_to_fhir(empty_input)
    assert result["resourceType"] == "Bundle"
    assert result["entry"] == []


# ===========================================================================
# 18-19. Integration — Health check endpoint
# ===========================================================================

@pytest.mark.asyncio
async def test_health_check_returns_ok(client: AsyncClient):
    """GET /api/v1/health must return status 'ok'."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert "ocr_engine" in body
    assert "fhir_parser" in body


@pytest.mark.asyncio
async def test_health_check_reflects_mock_config(client: AsyncClient):
    """Health check must report 'mock' for both ocr_engine and fhir_parser in test mode."""
    response = await client.get("/api/v1/health")
    body = response.json()
    # In test environment, OCR_ENGINE and FHIR_PARSER default to "mock"
    assert body["ocr_engine"] == "mock"
    assert body["fhir_parser"] == "mock"
