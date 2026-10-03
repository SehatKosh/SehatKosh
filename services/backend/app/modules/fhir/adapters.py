import uuid
from datetime import datetime, timezone


class MockFHIRAdapter:
    """
    Deterministic FHIR transformation adapter for local dev and CI tests.

    Converts OCR-extracted prescription data into a valid HL7 FHIR R4 Bundle
    with MedicationRequest entries. No external API calls required.
    """

    async def transform_to_fhir(self, extracted_data: dict) -> dict:
        """
        Build an HL7 FHIR R4 Bundle from OCR extraction output.

        Args:
            extracted_data: dict returned by OCRProcessor.extract_prescription()

        Returns:
            dict representing an HL7 FHIR R4 Bundle resource.
        """
        bundle_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        entries = []
        for med in extracted_data.get("medications", []):
            request_id = str(uuid.uuid4())
            entries.append(
                {
                    "fullUrl": f"urn:uuid:{request_id}",
                    "resource": {
                        "resourceType": "MedicationRequest",
                        "id": request_id,
                        "status": "active",
                        "intent": "order",
                        "medicationCodeableConcept": {
                            "coding": [
                                {
                                    "system": "http://snomed.info/sct",
                                    "code": med.get("snomed_code", ""),
                                    "display": med.get("name", "Unknown"),
                                }
                            ],
                            "text": med.get("name", "Unknown"),
                        },
                        "subject": {
                            "display": "Patient (SehatKosh)"
                        },
                        "requester": {
                            "display": extracted_data.get("doctor_name", "Unknown Doctor")
                        },
                        "authoredOn": extracted_data.get("date", now[:10]),
                        "dosageInstruction": [
                            {
                                "text": (
                                    f"{med.get('strength', '')} — "
                                    f"{med.get('frequency', '')} — "
                                    f"{med.get('duration', '')}"
                                )
                            }
                        ],
                    },
                }
            )

        return {
            "resourceType": "Bundle",
            "id": bundle_id,
            "type": "collection",
            "timestamp": now,
            "entry": entries,
            "meta": {
                "source": "SehatKosh-OCR-Pipeline",
                "clinic": extracted_data.get("clinic", ""),
            },
        }
