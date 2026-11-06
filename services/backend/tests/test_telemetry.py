import pytest
from httpx import AsyncClient

from app.modules.telemetry.interface import TelemetryProcessor
from app.modules.telemetry.registry import get_telemetry_adapter


@pytest.mark.asyncio
async def test_telemetry_registry_resolves_template_plugin():
    """Validates that real custom telemetry plugins can be dynamically loaded and executed."""
    adapter = get_telemetry_adapter("plugin:plugins.telemetry.template.BandAdapter")
    assert isinstance(adapter, TelemetryProcessor)
    res = await adapter.parse_wearable_payload({"bpm": 76})
    assert res["heart_rate"] == 76


@pytest.mark.asyncio
async def test_telemetry_parse_endpoint(client: AsyncClient):
    """End-to-end telemetry ingestion endpoint test."""
    payload = {"bpm": 80, "oxygen": 97, "step_count": 6500}
    response = await client.post("/api/v1/telemetry/parse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "vitals" in data
    assert data["vitals"]["heart_rate"] == 80
    assert data["telemetry_engine_used"] == "mock"
