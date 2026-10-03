"""
Tests for the FHIR transformation module: MockFHIRAdapter and FHIR Bundle structure.

These tests verify:
1. MockFHIRAdapter produces a valid HL7 FHIR R4 Bundle structure.
2. Bundle contains correct resourceType and entry types.
3. SNOMED CT codes are preserved from OCR input.
4. Health check endpoint returns correct config state.
"""

import pytest
from httpx import AsyncClient

from app.modules.fhir.adapters import MockFHIRAdapter


# ---------------------------------------------------------------------------
# Unit: MockFHIRAdapter
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Integration: Health check endpoint
# ---------------------------------------------------------------------------

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
