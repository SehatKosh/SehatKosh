"""
Telemetry Teammate Instructions:
1. Duplicate this file, rename it (e.g., my_band.py or apple_health.py).
2. Implement normalization for Apple Health, Google Health Connect, or raw BLE data.
3. In services/backend/.env, set:
   TELEMETRY_ENGINE=plugin:plugins.telemetry.my_band.BandAdapter
"""


class BandAdapter:
    async def parse_wearable_payload(self, raw_data: dict) -> dict:
        return {
            "heart_rate": raw_data.get("bpm", 72),
            "spo2": raw_data.get("oxygen", 98),
            "steps": raw_data.get("step_count", 5000),
            "sleep_minutes": raw_data.get("sleep_duration", 420),
            "device_brand": "Fitbit / Apple / Custom BLE",
        }
