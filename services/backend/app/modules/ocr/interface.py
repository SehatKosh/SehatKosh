from typing import Protocol, runtime_checkable


@runtime_checkable
class OCRProcessor(Protocol):
    """
    Abstract interface for all OCR adapters in SehatKosh.

    Any class that implements this protocol (mock or plugin-based live model)
    can be used interchangeably as the OCR engine. No inheritance required —
    just implement `extract_prescription` with the correct signature.
    """

    async def extract_prescription(self, image_bytes: bytes) -> dict:
        """
        Process raw image bytes and return a structured prescription dict.

        Args:
            image_bytes: Raw bytes of the uploaded prescription image.

        Returns:
            dict with keys:
                - doctor_name (str)
                - clinic (str)
                - date (str, ISO 8601)
                - medications (list of dicts with name, strength, frequency, duration, snomed_code)
                - raw_text (str)
        """
        ...
