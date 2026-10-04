from typing import Protocol, runtime_checkable


@runtime_checkable
class TelemetryProcessor(Protocol):
    """
    Abstract interface for all telemetry and smartwatch data parsers.

    Any class that implements this protocol (mock or live plugin adapter)
    can be plugged into the telemetry pipeline seamlessly.
    """

    async def parse_wearable_payload(self, raw_data: dict) -> dict:
        """
        Normalizes raw smartwatch/band metrics into unified health vitals.

        Args:
            raw_data: Unstructured or vendor-specific telemetry payload.

        Returns:
            dict containing:
                - heart_rate (int)
                - spo2 (int/float)
                - steps (int)
                - sleep_minutes (int)
                - device_brand (str)
        """
        ...
