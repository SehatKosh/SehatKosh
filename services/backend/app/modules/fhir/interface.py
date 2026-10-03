from typing import Protocol, runtime_checkable


@runtime_checkable
class FHIRTransformer(Protocol):
    """
    Abstract interface for all FHIR transformation adapters in SehatKosh.

    Converts structured prescription data (from OCR output) into an
    HL7 FHIR R4 Bundle dict. Swap mock for live LLM-based adapter via env var.
    """

    async def transform_to_fhir(self, extracted_data: dict) -> dict:
        """
        Convert OCR-extracted prescription data to a FHIR R4 Bundle.

        Args:
            extracted_data: Structured dict from OCRProcessor.extract_prescription()

        Returns:
            dict representing an HL7 FHIR R4 Bundle (resourceType: "Bundle")
        """
        ...
