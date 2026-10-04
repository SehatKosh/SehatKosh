import asyncio
from app.modules.telemetry.interface import TelemetryProcessor  # noqa: F401


class MockTelemetryAdapter:
    """
    Deterministic telemetry adapter for local development and CI tests.
    Normalizes raw payloads or returns standard mock health vitals.
    """

    async def parse_wearable_payload(self, raw_data: dict) -> dict:
        await asyncio.sleep(0.05)  # Simulate processing latency
        return {
            "heart_rate": raw_data.get("bpm") or raw_data.get("heart_rate") or 72,
            "spo2": raw_data.get("oxygen") or raw_data.get("spo2") or 98,
            "steps": raw_data.get("step_count") or raw_data.get("steps") or 5000,
            "sleep_minutes": raw_data.get("sleep_duration") or raw_data.get("sleep_minutes") or 420,
            "device_brand": raw_data.get("device_brand") or "SehatKosh Mock Wearable",
        }


class PluginTelemetryAdapter:
    """
    Wrapper for dynamically loaded telemetry plugin classes.
    """

    def __init__(self, plugin_instance: object):
        self._plugin = plugin_instance

    async def parse_wearable_payload(self, raw_data: dict) -> dict:
        return await self._plugin.parse_wearable_payload(raw_data)
