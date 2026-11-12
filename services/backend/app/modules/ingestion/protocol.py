from typing import Any, Dict, List, Protocol, Tuple, Union, runtime_checkable


@runtime_checkable
class HospitalIngestAdapter(Protocol):
    """
    Protocol for hospital data ingestion adapters.
    Validates and normalizes raw hospital payloads into HL7 FHIR R4 Bundles.
    """

    async def parse_to_fhir(
        self, raw_data: Union[bytes, str, Dict[str, Any]]
    ) -> Tuple[Dict[str, Any], List[str]]:
        """
        Parses raw payload into a validated FHIR bundle.

        Returns:
            Tuple of (normalized_fhir_bundle, validation_errors_list).
            If validation_errors_list is non-empty, the payload is considered invalid.
        """
        ...
