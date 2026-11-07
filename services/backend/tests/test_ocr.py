"""
Tests for the OCR module: registry resolution, fallback handling, and extraction API.

These tests verify:
1. The registry resolves "mock" correctly.
2. The registry falls back to MockOCRAdapter on a bad plugin path.
3. The full /api/v1/prescriptions/extract endpoint works end-to-end.
4. File validation (unsupported MIME type, oversized file) returns correct HTTP errors.
5. CORS configuration and service root endpoint.
"""

import io
import pytest
from httpx import AsyncClient

from app.modules.ocr.adapters import MockOCRAdapter
from app.modules.ocr.registry import get_ocr_adapter


# ---------------------------------------------------------------------------
# Unit: Registry
# ---------------------------------------------------------------------------

def test_registry_resolves_mock():
    """'mock' engine string must return a MockOCRAdapter."""
    adapter = get_ocr_adapter("mock")
    assert isinstance(adapter, MockOCRAdapter)


def test_registry_falls_back_on_bad_plugin_path():
    """Registry must gracefully fall back to MockOCRAdapter when a plugin path is invalid."""
    adapter = get_ocr_adapter("plugin:nonexistent.module.NonExistentClass")
    assert isinstance(adapter, MockOCRAdapter), (
        "Expected MockOCRAdapter fallback for invalid plugin path"
    )


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

    assert body.get("status") == "success"
    data = body.get("data", {})
    assert "raw_ocr" in data, f"'raw_ocr' not found in data keys: {list(data.keys())}"
    assert "fhir_bundle" in data, f"'fhir_bundle' not found in data keys: {list(data.keys())}"
    assert "metadata" in data, f"'metadata' not found in data keys: {list(data.keys())}"

    raw_ocr = data["raw_ocr"]
    assert "doctor_name" in raw_ocr
    assert "medications" in raw_ocr
    assert isinstance(raw_ocr["medications"], list)

    fhir_bundle = data["fhir_bundle"]
    assert fhir_bundle.get("resourceType") == "Bundle"


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


@pytest.mark.asyncio
async def test_cors_allows_localhost_3000(client: AsyncClient):
    """CORS middleware must allow requests from http://localhost:3000."""
    response = await client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


@pytest.mark.asyncio
async def test_cors_allows_127_0_0_1_3000(client: AsyncClient):
    """CORS middleware must allow requests from http://127.0.0.1:3000."""
    response = await client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://127.0.0.1:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "http://127.0.0.1:3000"


@pytest.mark.asyncio
async def test_root_endpoint_returns_online(client: AsyncClient):
    """Root GET / endpoint must return online status and service metadata."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "online"
    assert "SehatKosh" in data.get("service", "")
