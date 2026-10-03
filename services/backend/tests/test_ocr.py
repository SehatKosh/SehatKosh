"""
Tests for the OCR module: MockOCRAdapter, PluginOCRAdapter, and registry.

These tests verify:
1. MockOCRAdapter returns the correct output shape.
2. The registry resolves "mock" correctly.
3. The registry falls back to MockOCRAdapter on a bad plugin path (Adjustment #4).
4. The full /api/v1/prescriptions/extract endpoint works end-to-end with mock data.
5. File validation (wrong MIME type, oversized file) returns correct HTTP errors.
"""

import io
import pytest
from httpx import AsyncClient

from app.modules.ocr.adapters import MockOCRAdapter
from app.modules.ocr.registry import get_ocr_adapter
from app.modules.ocr.interface import OCRProcessor


# ---------------------------------------------------------------------------
# Unit: MockOCRAdapter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mock_ocr_adapter_returns_correct_shape():
    """MockOCRAdapter must return all required keys with correct types."""
    adapter = MockOCRAdapter()
    result = await adapter.extract_prescription(b"fake-image-bytes")

    assert isinstance(result, dict), "Result must be a dict"
    assert "doctor_name" in result, "Missing key: doctor_name"
    assert "clinic" in result, "Missing key: clinic"
    assert "date" in result, "Missing key: date"
    assert "medications" in result, "Missing key: medications"
    assert "raw_text" in result, "Missing key: raw_text"

    assert isinstance(result["medications"], list), "medications must be a list"
    assert len(result["medications"]) >= 1, "Should have at least one medication"

    med = result["medications"][0]
    assert "name" in med
    assert "strength" in med
    assert "frequency" in med
    assert "duration" in med


@pytest.mark.asyncio
async def test_mock_ocr_adapter_satisfies_protocol():
    """MockOCRAdapter must satisfy the OCRProcessor runtime-checkable Protocol."""
    adapter = MockOCRAdapter()
    assert isinstance(adapter, OCRProcessor), (
        "MockOCRAdapter does not satisfy OCRProcessor protocol"
    )


@pytest.mark.asyncio
async def test_mock_ocr_adapter_ignores_image_content():
    """MockOCRAdapter must return deterministic output regardless of image bytes."""
    adapter = MockOCRAdapter()
    result_a = await adapter.extract_prescription(b"garbage")
    result_b = await adapter.extract_prescription(b"\x00\xFF\xAB")

    assert result_a["doctor_name"] == result_b["doctor_name"]
    assert result_a["medications"] == result_b["medications"]


# ---------------------------------------------------------------------------
# Unit: Registry
# ---------------------------------------------------------------------------

def test_registry_resolves_mock():
    """'mock' engine string must return a MockOCRAdapter."""
    adapter = get_ocr_adapter("mock")
    assert isinstance(adapter, MockOCRAdapter)


def test_registry_resolves_mock_case_insensitive():
    """Registry must be case-insensitive for 'mock'."""
    adapter = get_ocr_adapter("MOCK")
    assert isinstance(adapter, MockOCRAdapter)


def test_registry_falls_back_on_bad_plugin_path():
    """
    Adjustment #4: Registry must gracefully fall back to MockOCRAdapter
    when a plugin dotpath is invalid or the module cannot be imported.
    """
    adapter = get_ocr_adapter("plugin:nonexistent.module.NonExistentClass")
    assert isinstance(adapter, MockOCRAdapter), (
        "Expected MockOCRAdapter fallback for invalid plugin path"
    )


def test_registry_falls_back_on_empty_plugin_path():
    """Registry must fall back when 'plugin:' prefix has no dotpath after it."""
    adapter = get_ocr_adapter("plugin:")
    assert isinstance(adapter, MockOCRAdapter)


def test_registry_falls_back_on_unknown_engine():
    """Registry must fall back to mock for completely unknown engine strings."""
    adapter = get_ocr_adapter("unknown_engine_xyz")
    assert isinstance(adapter, MockOCRAdapter)


# ---------------------------------------------------------------------------
# Integration: /api/v1/prescriptions/extract endpoint
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_endpoint_returns_200_with_valid_jpeg(
    client: AsyncClient, minimal_image_bytes: bytes
):
    """POST /extract with a valid JPEG must return 200 with extraction + FHIR bundle."""
    response = await client.post(
        "/api/v1/prescriptions/extract",
        files={"file": ("prescription.jpg", io.BytesIO(minimal_image_bytes), "image/jpeg")},
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    body = response.json()

    assert "extraction" in body
    assert "fhir_bundle" in body
    assert "ocr_engine_used" in body

    extraction = body["extraction"]
    assert "doctor_name" in extraction
    assert "medications" in extraction
    assert isinstance(extraction["medications"], list)


@pytest.mark.asyncio
async def test_extract_endpoint_rejects_unsupported_mime(client: AsyncClient):
    """POST /extract with a PDF must return 415 Unsupported Media Type."""
    response = await client.post(
        "/api/v1/prescriptions/extract",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
    )
    assert response.status_code == 415, f"Expected 415, got {response.status_code}"


@pytest.mark.asyncio
async def test_extract_endpoint_rejects_oversized_file(client: AsyncClient):
    """POST /extract with a file > 10 MB must return 413."""
    large_bytes = b"\xFF" * (11 * 1024 * 1024)  # 11 MB
    response = await client.post(
        "/api/v1/prescriptions/extract",
        files={"file": ("big.jpg", io.BytesIO(large_bytes), "image/jpeg")},
    )
    assert response.status_code == 413, f"Expected 413, got {response.status_code}"


@pytest.mark.asyncio
async def test_list_engines_endpoint(client: AsyncClient):
    """GET /engines must return a list with at least the 'mock' engine entry."""
    response = await client.get("/api/v1/prescriptions/engines")
    assert response.status_code == 200
    engines = response.json()
    assert isinstance(engines, list)
    names = [e["name"] for e in engines]
    assert "mock" in names
