import asyncio
from app.modules.ocr.interface import OCRProcessor  # noqa: F401 (used for type clarity)


class MockOCRAdapter:
    """
    Deterministic fallback OCR adapter for local development and CI tests.

    Returns a hardcoded realistic prescription extraction instantly
    (with a small simulated delay). Requires zero external dependencies,
    zero network calls, and works completely offline.
    """

    async def extract_prescription(self, image_bytes: bytes) -> dict:
        await asyncio.sleep(0.3)  # Simulate processing latency
        return {
            "doctor_name": "Dr. Tariq Khan",
            "clinic": "Shifa International Hospital",
            "date": "2026-10-01",
            "medications": [
                {
                    "name": "Amoxicillin",
                    "strength": "500mg",
                    "frequency": "3 times daily",
                    "duration": "7 days",
                    "snomed_code": "376255008",
                },
                {
                    "name": "Paracetamol",
                    "strength": "1000mg",
                    "frequency": "As needed (max 4 times daily)",
                    "duration": "5 days",
                    "snomed_code": "387517004",
                },
            ],
            "raw_text": "Amoxicillin 500mg TDS x 7d / Paracetamol 1000mg PRN x 5d",
        }


class PluginOCRAdapter:
    """
    Thin wrapper around a dynamically loaded plugin OCR class.

    The plugin class is loaded at runtime by the registry (registry.py).
    This adapter delegates all calls to the underlying plugin instance,
    preserving the OCRProcessor interface for the rest of the application.
    """

    def __init__(self, plugin_instance: object):
        self._plugin = plugin_instance

    async def extract_prescription(self, image_bytes: bytes) -> dict:
        return await self._plugin.extract_prescription(image_bytes)
