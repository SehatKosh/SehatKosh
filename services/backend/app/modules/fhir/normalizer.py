"""
Resilient heuristic normalizer for OCR prescription output.

Accepts messy, partial, or completely unstructured OCR dictionaries and
raw text blobs and converts them into a canonical intermediate dict that
the FHIR adapter can reliably consume.

Design principles
-----------------
- Never raise an unhandled exception — every failure mode degrades gracefully.
- If a field cannot be extracted, use a safe fallback (empty string, today's
  date, empty list, etc.).
- Medical ontology lookup (SNOMED-CT) covers common Pakistani/South-Asian
  formulary drugs.  Unknown drugs produce ``coding=[]`` and preserve the
  verbatim string in ``CodeableConcept.text``.

Output shape (canonical dict)
------------------------------
{
    "patient_name": str,
    "doctor_name": str,
    "date": str,           # YYYY-MM-DD
    "medications": [
        {
            "name": str,
            "strength": str,
            "frequency_text": str,
            "frequency": int | None,    # times per period
            "period": float | None,
            "period_unit": str | None,
            "duration": str,
            "snomed_code": str | None,
            "snomed_display": str | None,
        },
        ...
    ],
    "is_fallback": bool,
}
"""

from __future__ import annotations

import re
from datetime import date
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Medical ontology — SNOMED-CT lookup table
# Entry format:  display_name → (snomed_code, canonical_display)
# Covers common drugs in the Pakistani / South-Asian formulary.
# ---------------------------------------------------------------------------

SNOMED_LOOKUP: Dict[str, tuple[str, str]] = {
    # Antibiotics
    "amoxicillin": ("372687004", "Amoxicillin"),
    "amoxil": ("372687004", "Amoxicillin"),
    "augmentin": ("89519000", "Amoxicillin and clavulanate potassium"),
    "co-amoxiclav": ("89519000", "Amoxicillin and clavulanate potassium"),
    "ciprofloxacin": ("372840008", "Ciprofloxacin"),
    "cipro": ("372840008", "Ciprofloxacin"),
    "azithromycin": ("372694001", "Azithromycin"),
    "zithromax": ("372694001", "Azithromycin"),
    "metronidazole": ("372567009", "Metronidazole"),
    "flagyl": ("372567009", "Metronidazole"),
    "doxycycline": ("372478003", "Doxycycline"),
    "clarithromycin": ("372741000", "Clarithromycin"),
    # Analgesics / antipyretics
    "paracetamol": ("387517004", "Paracetamol"),
    "acetaminophen": ("387517004", "Paracetamol"),
    "panadol": ("387517004", "Paracetamol"),
    "calpol": ("387517004", "Paracetamol"),
    "ibuprofen": ("387207008", "Ibuprofen"),
    "brufen": ("387207008", "Ibuprofen"),
    "advil": ("387207008", "Ibuprofen"),
    "aspirin": ("387458008", "Aspirin"),
    "diclofenac": ("7034005", "Diclofenac"),
    "voltaren": ("7034005", "Diclofenac"),
    "naproxen": ("372588000", "Naproxen"),
    "tramadol": ("386858008", "Tramadol"),
    "codeine": ("387494007", "Codeine"),
    # Antihistamines
    "chlorpheniramine": ("372482001", "Chlorpheniramine"),
    "cetirizine": ("372523007", "Cetirizine"),
    "zyrtec": ("372523007", "Cetirizine"),
    "loratadine": ("386979001", "Loratadine"),
    "claritin": ("386979001", "Loratadine"),
    # GI
    "omeprazole": ("387423006", "Omeprazole"),
    "losec": ("387423006", "Omeprazole"),
    "esomeprazole": ("396064000", "Esomeprazole"),
    "nexium": ("396064000", "Esomeprazole"),
    "pantoprazole": ("395891006", "Pantoprazole"),
    "domperidone": ("387181004", "Domperidone"),
    "motilium": ("387181004", "Domperidone"),
    "metoclopramide": ("372776000", "Metoclopramide"),
    # Antihypertensives
    "amlodipine": ("386864001", "Amlodipine"),
    "norvasc": ("386864001", "Amlodipine"),
    "lisinopril": ("386872004", "Lisinopril"),
    "atenolol": ("387506000", "Atenolol"),
    "metoprolol": ("372826007", "Metoprolol"),
    # Antidiabetics
    "metformin": ("372567009", "Metformin"),
    "glucophage": ("372567009", "Metformin"),
    "glibenclamide": ("384978004", "Glibenclamide"),
    "insulin": ("325072002", "Insulin"),
    # Vitamins / supplements
    "vitamin c": ("372826007", "Ascorbic acid"),
    "vitamin d": ("430176006", "Vitamin D"),
    "calcium": ("387406002", "Calcium carbonate"),
    "iron": ("387402000", "Ferrous sulfate"),
    "zinc": ("764877006", "Zinc"),
}


# ---------------------------------------------------------------------------
# Key alias maps
# ---------------------------------------------------------------------------

DOCTOR_KEYS = {"doctor_name", "doctor", "physician", "dr_name", "prescriber", "dr"}
PATIENT_KEYS = {"patient_name", "patient", "name", "subject", "patient_id"}
DATE_KEYS = {"date", "authored_on", "visit_date", "created_at", "prescription_date"}
MEDICATION_KEYS = {
    "medications", "meds", "drugs", "prescriptions", "items", "rx",
    "tablets", "medicines", "medication_list",
}

# ---------------------------------------------------------------------------
# Frequency / timing patterns
# ---------------------------------------------------------------------------

# Each entry: (regex_pattern, frequency, period, period_unit)
FREQUENCY_PATTERNS: List[tuple[str, int, float, str]] = [
    # TDS / TID / three times a day
    (r"\bTDS\b|\bTID\b|\b3\s*times?\s+(?:a\s+)?day\b|\bthree\s+times?\s+(?:a\s+)?day\b|\b1[-–]0[-–]1\b",
     3, 1.0, "d"),
    # QID / four times a day
    (r"\bQID\b|\b4\s*times?\s+(?:a\s+)?day\b|\bfour\s+times?\s+(?:a\s+)?day\b|\b1[-–]1[-–]1[-–]1\b",
     4, 1.0, "d"),
    # BD / BID / twice daily
    (r"\bBD\b|\bBID\b|\btwice\s+(?:a\s+)?daily\b|\btwice\s+(?:a\s+)?day\b|\b0[-–]1[-–]0[-–]1\b|\b1[-–]0[-–]1\b",
     2, 1.0, "d"),
    # OD / QD / once daily
    (r"\bOD\b|\bQD\b|\bonce\s+(?:a\s+)?daily\b|\bonce\s+(?:a\s+)?day\b|\bonce\s+daily\b",
     1, 1.0, "d"),
    # SOS / PRN — only fallback; map to once daily
    (r"\bSOS\b|\bPRN\b|\bas\s+needed\b",
     1, 1.0, "d"),
    # Weekly
    (r"\bonce\s+(?:a\s+)?week\b|\bweekly\b|\bOW\b",
     1, 1.0, "wk"),
]


def _parse_frequency(text: str) -> tuple[Optional[int], Optional[float], Optional[str]]:
    """Return (frequency, period, periodUnit) from a free-text string."""
    if not text:
        return None, None, None
    for pattern, freq, period, unit in FREQUENCY_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return freq, period, unit
    return None, None, None


# ---------------------------------------------------------------------------
# Drug name → SNOMED lookup
# ---------------------------------------------------------------------------

def _lookup_snomed(drug_name: str) -> tuple[Optional[str], Optional[str]]:
    """
    Return (snomed_code, canonical_display) for a drug, or (None, None).

    Normalises the drug name before lookup to handle:
    - leading/trailing whitespace
    - mixed case
    - brand names (e.g. 'Amoxil') mapped to INN
    """
    key = drug_name.strip().lower()
    if key in SNOMED_LOOKUP:
        code, display = SNOMED_LOOKUP[key]
        return code, display
    # Substring match — handles "Amoxil 500mg" → "amoxil"
    for alias, (code, display) in SNOMED_LOOKUP.items():
        if alias in key or key in alias:
            return code, display
    return None, None


# ---------------------------------------------------------------------------
# Raw text medication parser
# ---------------------------------------------------------------------------

# Common drug names we can detect via regex in a raw text blob
RAW_TEXT_DRUG_PATTERN = re.compile(
    r"\b("
    + "|".join(
        re.escape(name.title())
        for name in sorted(SNOMED_LOOKUP.keys(), key=len, reverse=True)
    )
    + r")\b",
    re.IGNORECASE,
)

# Strength pattern: digits followed by mg / g / ml / mcg / IU
STRENGTH_PATTERN = re.compile(r"(\d+(?:\.\d+)?\s*(?:mg|g|ml|mcg|IU))", re.IGNORECASE)

# Duration pattern: N days / weeks / months
DURATION_PATTERN = re.compile(
    r"(\d+\s*(?:days?|weeks?|months?|d\b|wk\b))",
    re.IGNORECASE,
)


def _parse_raw_text(raw_text: str) -> List[Dict[str, Any]]:
    """
    Extract a list of medication dicts from a raw text blob.

    Uses regex to detect:
    - Drug names (from ontology list)
    - Strength
    - Frequency
    - Duration

    Returns a list of normalised medication dicts (same shape as
    _normalise_medication_dict output).
    """
    meds: List[Dict[str, Any]] = []
    if not raw_text or not raw_text.strip():
        return meds

    # Find all drug name positions
    drug_matches = list(RAW_TEXT_DRUG_PATTERN.finditer(raw_text))
    if not drug_matches:
        return meds

    # For each drug, extract the context window (text between this match
    # and the next drug match) to scope strength/frequency/duration.
    for idx, match in enumerate(drug_matches):
        drug_name = match.group(0)
        start = match.end()
        end = drug_matches[idx + 1].start() if idx + 1 < len(drug_matches) else len(raw_text)
        context = raw_text[start:end]

        # Strength
        strength_m = STRENGTH_PATTERN.search(context)
        strength = strength_m.group(0).strip() if strength_m else ""

        # Duration
        duration_m = DURATION_PATTERN.search(context)
        duration = duration_m.group(0).strip() if duration_m else ""

        # Frequency (search context window; fall back to full text)
        freq_text = context if context.strip() else raw_text
        frequency, period, period_unit = _parse_frequency(freq_text)

        snomed_code, snomed_display = _lookup_snomed(drug_name)

        meds.append(
            {
                "name": drug_name.strip(),
                "strength": strength,
                "frequency_text": freq_text.strip()[:120],
                "frequency": frequency,
                "period": period,
                "period_unit": period_unit,
                "duration": duration,
                "snomed_code": snomed_code,
                "snomed_display": snomed_display,
            }
        )

    return meds


# ---------------------------------------------------------------------------
# Medication dict normaliser
# ---------------------------------------------------------------------------

def _normalise_medication_dict(med: Any) -> Optional[Dict[str, Any]]:
    """
    Normalise a single medication entry from arbitrary OCR output.

    Accepts a dict, string, or None.  Returns None if the input is
    completely unusable (so the caller can skip it).
    """
    if isinstance(med, str):
        # Treat the string itself as the drug name
        raw_name = med.strip()
        if not raw_name:
            return None
        snomed_code, snomed_display = _lookup_snomed(raw_name)
        return {
            "name": raw_name,
            "strength": "",
            "frequency_text": "",
            "frequency": None,
            "period": None,
            "period_unit": None,
            "duration": "",
            "snomed_code": snomed_code,
            "snomed_display": snomed_display,
        }

    if not isinstance(med, dict):
        return None

    # Drug name — try multiple key aliases
    name = (
        med.get("name")
        or med.get("drug")
        or med.get("medication")
        or med.get("medicine")
        or med.get("title")
        or med.get("generic_name")
        or med.get("brand_name")
        or ""
    )
    name = str(name).strip()
    if not name:
        return None

    # Strength
    strength = str(
        med.get("strength") or med.get("dose") or med.get("dosage") or med.get("qty") or ""
    ).strip()

    # Frequency — raw text first
    frequency_text = str(
        med.get("frequency") or med.get("freq") or med.get("schedule") or ""
    ).strip()
    frequency, period, period_unit = _parse_frequency(frequency_text)

    # Duration
    duration = str(
        med.get("duration") or med.get("days") or med.get("course") or ""
    ).strip()

    # SNOMED — try existing code first, then lookup
    snomed_code = med.get("snomed_code") or med.get("code") or None
    snomed_display = med.get("snomed_display") or None
    if not snomed_code:
        snomed_code, snomed_display = _lookup_snomed(name)

    return {
        "name": name,
        "strength": strength,
        "frequency_text": frequency_text,
        "frequency": frequency,
        "period": period,
        "period_unit": period_unit,
        "duration": duration,
        "snomed_code": snomed_code,
        "snomed_display": snomed_display,
    }


# ---------------------------------------------------------------------------
# Top-level normalizer
# ---------------------------------------------------------------------------

def _extract_value(data: dict, key_set: set, fallback: str = "") -> str:
    """Case-insensitive key resolver for a set of aliases."""
    lower_map = {k.lower(): v for k, v in data.items()}
    for key in key_set:
        val = lower_map.get(key.lower())
        if val is not None:
            return str(val).strip()
    return fallback


def normalise_ocr_output(raw: Any) -> Dict[str, Any]:
    """
    Convert arbitrary OCR output into the canonical intermediate dict.

    Handles:
    - Structured dict with known keys
    - Structured dict with aliased / misspelled keys
    - ``{"raw_text": "..."}`` blob
    - Completely empty input ``{}``
    - Non-dict inputs (coerced gracefully)

    Returns canonical dict — see module docstring for shape.
    """
    # Coerce non-dict inputs
    if not isinstance(raw, dict):
        if isinstance(raw, str):
            raw = {"raw_text": raw}
        else:
            raw = {}

    today = date.today().isoformat()

    # ------------------------------------------------------------------ #
    # 1. Resolve scalar fields
    # ------------------------------------------------------------------ #
    doctor_name = _extract_value(raw, DOCTOR_KEYS, fallback="Unknown Doctor")
    patient_name = _extract_value(raw, PATIENT_KEYS, fallback="Unknown Patient")
    authored_date = _extract_value(raw, DATE_KEYS, fallback=today) or today

    # Basic sanity — if date looks non-ISO just fall back to today
    if not re.match(r"\d{4}-\d{2}-\d{2}", authored_date):
        authored_date = today

    # ------------------------------------------------------------------ #
    # 2. Resolve medication list
    # ------------------------------------------------------------------ #
    med_list_raw: Any = None
    lower_raw = {k.lower(): v for k, v in raw.items()}
    for key in MEDICATION_KEYS:
        val = lower_raw.get(key.lower())
        if val is not None:
            med_list_raw = val
            break

    is_fallback = False
    medications: List[Dict[str, Any]] = []

    if med_list_raw is not None and isinstance(med_list_raw, list):
        for med in med_list_raw:
            normalised = _normalise_medication_dict(med)
            if normalised:
                medications.append(normalised)
        is_fallback = False
    else:
        # ---------------------------------------------------------------- #
        # 3. Raw-text fallback: parse free-form text
        # ---------------------------------------------------------------- #
        raw_text_keys = {"raw_text", "text", "ocr_text", "content", "body"}
        raw_text = ""
        for key in raw_text_keys:
            raw_text = str(lower_raw.get(key, "") or "").strip()
            if raw_text:
                break
        # Also try the whole stringified dict as a last resort
        if not raw_text:
            raw_text = " ".join(str(v) for v in raw.values() if isinstance(v, str))

        medications = _parse_raw_text(raw_text)
        is_fallback = True

    return {
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "date": authored_date,
        "medications": medications,
        "is_fallback": is_fallback,
    }
