import pytest
from httpx import AsyncClient

from app.modules.telemetry.interface import TelemetryProcessor
from app.modules.telemetry.adapters import MockTelemetryAdapter
from app.modules.telemetry.registry import get_telemetry_adapter


@pytest.mark.asyncio
async def test_mock_telemetry_adapter_satisfies_protocol():
    adapter = MockTelemetryAdapter()
    assert isinstance(adapter, TelemetryProcessor)


@pytest.mark.asyncio
async def test_mock_telemetry_adapter_returns_expected_vitals():
    adapter = MockTelemetryAdapter()
    res = await adapter.parse_wearable_payload({"bpm": 85, "oxygen": 99, "step_count": 8000})
    assert res["heart_rate"] == 85
    assert res["spo2"] == 99
    assert res["steps"] == 8000
    assert "device_brand" in res


@pytest.mark.asyncio
async def test_telemetry_registry_resolves_mock():
    adapter = get_telemetry_adapter("mock")
    assert isinstance(adapter, TelemetryProcessor)


@pytest.mark.asyncio
async def test_telemetry_registry_resolves_template_plugin():
    adapter = get_telemetry_adapter("plugin:plugins.telemetry.template.BandAdapter")
    assert isinstance(adapter, TelemetryProcessor)
    res = await adapter.parse_wearable_payload({"bpm": 76})
    assert res["heart_rate"] == 76


@pytest.mark.asyncio
async def test_telemetry_registry_falls_back_on_bad_path():
    adapter = get_telemetry_adapter("plugin:nonexistent.path.BadClass")
    assert isinstance(adapter, TelemetryProcessor)
    # Safely falls back to MockTelemetryAdapter
    assert isinstance(adapter, MockTelemetryAdapter)


@pytest.mark.asyncio
async def test_telemetry_parse_endpoint(client: AsyncClient):
    payload = {"bpm": 80, "oxygen": 97, "step_count": 6500}
    response = await client.post("/api/v1/telemetry/parse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "vitals" in data
    assert data["vitals"]["heart_rate"] == 80
    assert data["telemetry_engine_used"] == "mock"
