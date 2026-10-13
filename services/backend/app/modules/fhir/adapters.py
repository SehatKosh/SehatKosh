"""
FHIR transformation adapters for SehatKosh.

MockFHIRAdapter
    Deterministic adapter for local dev / CI.  Accepts the structured
    OCR dict shape and builds a basic FHIR Bundle — no normalisation.

ResilientFHIRAdapter
    Production-grade adapter that accepts *any* OCR output (structured,
    partial, or raw text) and returns a validated FHIR R4 Bundle.
    Implements the FHIRTransformer protocol.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.modules.fhir.normalizer import normalise_ocr_output
from app.schemas.fhir import (
    Coding,
    CodeableConcept,
    DosageInstruction,
    FHIRBundle,
    FHIRBundleEntry,
    MedicationRequest,
    Patient,
    PatientName,
    Practitioner,
    PractitionerName,
    Reference,
    Repeat,
    Timing,
)


# ---------------------------------------------------------------------------
# MockFHIRAdapter — unchanged from original, kept for backward compatibility
# ---------------------------------------------------------------------------

class MockFHIRAdapter:
    """
    Deterministic FHIR transformation adapter for local dev and CI tests.

    Converts OCR-extracted prescription data into a valid HL7 FHIR R4 Bundle
    with MedicationRequest entries. No external API calls required.

    NOTE: This adapter trusts the incoming dict to have the canonical
    ``medications`` key.  For resilient handling of arbitrary payloads,
    use ``ResilientFHIRAdapter`` instead.
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_medication_request(
    med: Dict[str, Any],
    patient_ref: str,
    authored_on: str,
    has_snomed: bool,
) -> MedicationRequest:
    """Build a validated MedicationRequest Pydantic model from a normalised med dict."""

    # Coding — only add SNOMED entry when we have a real code
    codings: List[Coding] = []
    if med.get("snomed_code"):
        codings.append(
            Coding(
                system="http://snomed.info/sct",
                code=med["snomed_code"],
                display=med.get("snomed_display") or med["name"],
            )
        )

    medication_concept = CodeableConcept(
        coding=codings,
        text=med["name"],
    )

    # Timing
    timing: Timing | None = None
    if med.get("frequency") is not None:
        repeat = Repeat(
            frequency=med["frequency"],
            period=med.get("period"),
            periodUnit=med.get("period_unit"),
        )
        timing = Timing(repeat=repeat)

    # Dosage instruction text
    parts = filter(None, [med.get("strength", ""), med.get("frequency_text", ""), med.get("duration", "")])
    dosage_text = " — ".join(parts) or med["name"]

    dosage = DosageInstruction(
        text=dosage_text,
        timing=timing,
    )

    # Determine status: active when we have recognised data, unknown otherwise
    status = "active" if (med.get("snomed_code") or med.get("frequency")) else "unknown"

    return MedicationRequest(
        status=status,  # type: ignore[arg-type]
        intent="order",
        medicationCodeableConcept=medication_concept,
        subject=Reference(reference=patient_ref, display=None),
        authoredOn=authored_on,
        dosageInstruction=[dosage],
    )


# ---------------------------------------------------------------------------
# ResilientFHIRAdapter
# ---------------------------------------------------------------------------

class ResilientFHIRAdapter:
    """
    Production-grade, resilient FHIR R4 transformation adapter.

    Accepts *any* dict from the OCR pipeline — structured, partial,
    misspelled-key, or raw-text blob — and returns a strictly validated
    HL7 FHIR R4 ``Bundle`` dict.

    Core resilience guarantees
    --------------------------
    - Never raises an unhandled exception regardless of input shape.
    - Missing or unparseable fields degrade to safe FHIR defaults:
        - ``status="unknown"``, ``intent="order"``
        - ``CodeableConcept.text=<verbatim_string>``, ``coding=[]``
        - Fallback patient/practitioner identifiers.
    - Always returns a Pydantic-validated Bundle so downstream code can
      rely on a deterministic structure.

    Bundle structure
    ----------------
    entry[0] → Patient resource
    entry[1] → Practitioner resource  (if doctor_name is known)
    entry[2..N] → MedicationRequest resources
    """

    async def transform_to_fhir(self, raw_ocr: Any) -> dict:
        """
        Convert arbitrary OCR output to a validated FHIR R4 Bundle dict.

        Args:
            raw_ocr: Any dict (or string) returned by the OCR processor.

        Returns:
            dict — a serialised, Pydantic-validated FHIRBundle.
        """
        try:
            return await self._transform(raw_ocr)
        except Exception:  # pragma: no cover — safety net only
            # Absolute last-resort fallback: return an empty but valid bundle
            return FHIRBundle().model_dump(mode="json")

    async def _transform(self, raw_ocr: Any) -> dict:
        """Internal transformation; wrapped by transform_to_fhir for safety."""

        # ---------------------------------------------------------------- #
        # Step 1 — Normalise
        # ---------------------------------------------------------------- #
        normalised = normalise_ocr_output(raw_ocr)

        patient_name: str = normalised["patient_name"]
        doctor_name: str = normalised["doctor_name"]
        authored_on: str = normalised["date"]
        medications: List[Dict[str, Any]] = normalised["medications"]
        is_fallback: bool = normalised["is_fallback"]

        # ---------------------------------------------------------------- #
        # Step 2 — Build Patient entry
        # ---------------------------------------------------------------- #
        patient = Patient(
            name=[PatientName(text=patient_name)],
        )
        patient_ref = f"urn:uuid:{patient.id}"

        patient_entry = FHIRBundleEntry(
            fullUrl=patient_ref,
            resource=patient.model_dump(mode="json"),
        )

        entries: List[FHIRBundleEntry] = [patient_entry]

        # ---------------------------------------------------------------- #
        # Step 3 — Build Practitioner entry (if we have a doctor name)
        # ---------------------------------------------------------------- #
        if doctor_name and doctor_name != "Unknown Doctor":
            practitioner = Practitioner(
                name=[PractitionerName(text=doctor_name)],
            )
            entries.append(
                FHIRBundleEntry(
                    fullUrl=f"urn:uuid:{practitioner.id}",
                    resource=practitioner.model_dump(mode="json"),
                )
            )

        # ---------------------------------------------------------------- #
        # Step 4 — Build MedicationRequest entries
        # ---------------------------------------------------------------- #
        unmapped_count = 0
        for med in medications:
            has_snomed = bool(med.get("snomed_code"))
            if not has_snomed:
                unmapped_count += 1

            try:
                med_request = _build_medication_request(
                    med=med,
                    patient_ref=patient_ref,
                    authored_on=authored_on,
                    has_snomed=has_snomed,
                )
            except Exception:
                # Individual medication build failure → skip gracefully
                continue

            entries.append(
                FHIRBundleEntry(
                    fullUrl=f"urn:uuid:{med_request.id}",
                    resource=med_request.model_dump(mode="json"),
                )
            )

        # ---------------------------------------------------------------- #
        # Step 5 — Assemble & validate Bundle
        # ---------------------------------------------------------------- #
        bundle = FHIRBundle(entry=entries)
        validated = FHIRBundle.model_validate(bundle.model_dump(mode="json"))
        bundle_dict = validated.model_dump(mode="json")

        # Attach SehatKosh-specific metadata (not part of strict FHIR schema)
        bundle_dict["_meta"] = {
            "source": "SehatKosh-ResilientFHIR",
            "medications_detected": len(medications),
            "unmapped_codes_count": unmapped_count,
            "is_fallback": is_fallback,
        }

        return bundle_dict
