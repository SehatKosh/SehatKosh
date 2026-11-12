import logging
from typing import Dict, Type

from app.modules.ingestion.protocol import HospitalIngestAdapter
from app.modules.ingestion.adapters import (
    ExternalFHIRAdapter,
    LegacyCSVAdapter,
    PDFLabAdapter,
)

logger = logging.getLogger(__name__)

ADAPTER_MAP: Dict[str, Type[HospitalIngestAdapter]] = {
    "external_fhir": ExternalFHIRAdapter,
    "external_fhir_v1": ExternalFHIRAdapter,
    "csv_legacy": LegacyCSVAdapter,
    "csv_legacy_v1": LegacyCSVAdapter,
    "legacy_csv": LegacyCSVAdapter,
    "pdf_lab": PDFLabAdapter,
    "pdf_lab_v1": PDFLabAdapter,
}


def get_ingest_adapter(adapter_name: str) -> HospitalIngestAdapter:
    """
    Resolves adapter_name to a concrete HospitalIngestAdapter instance.
    Defaults to ExternalFHIRAdapter if unrecognized.
    """
    key = adapter_name.strip().lower()
    adapter_cls = ADAPTER_MAP.get(key)
    if not adapter_cls:
        logger.warning(
            "Unknown ingestion adapter '%s'. Falling back to ExternalFHIRAdapter.",
            adapter_name,
        )
        adapter_cls = ExternalFHIRAdapter
    return adapter_cls()
