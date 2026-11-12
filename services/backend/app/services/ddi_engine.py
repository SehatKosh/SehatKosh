import re
from typing import Dict, List, Set, Tuple

from app.schemas.clinical import InteractionAlert

# Allergy cross-sensitivity mapping (class keyword -> set of reactive drug names/stems)
ALLERGY_CLASSES: Dict[str, Set[str]] = {
    "penicillin": {
        "penicillin", "amoxicillin", "ampicillin", "augmentin", "piperacillin",
        "clavulanate", "amoxil", "amoxicillin-clavulanate", "pen-v",
    },
    "sulfa": {
        "sulfa", "sulfamethoxazole", "sulfasalazine", "bactrim", "septrin",
        "sulfadiazine", "cotrimoxazole",
    },
    "nsaid": {
        "nsaid", "ibuprofen", "aspirin", "naproxen", "diclofenac", "brufen",
        "ketorolac", "indomethacin", "celecoxib", "ponstan", "mefenamic",
    },
    "cephalosporin": {
        "cephalosporin", "ceftriaxone", "cefixime", "cephalexin", "cefepime",
        "cefotaxime", "rocephin",
    },
    "macrolide": {
        "macrolide", "clarithromycin", "azithromycin", "erythromycin", "klacid",
    },
    "fluoroquinolone": {
        "fluoroquinolone", "ciprofloxacin", "levofloxacin", "moxifloxacin", "cipro",
    },
}

# Major Drug-Drug Interactions (pair -> (severity, alert_type, explanation))
DDI_RULES: List[Tuple[Set[str], str, str, str]] = [
    (
        {"ciprofloxacin", "theophylline"},
        "CRITICAL",
        "DDI_CONTRAINDICATION",
        (
            "Ciprofloxacin strongly inhibits hepatic CYP1A2, impairing theophylline clearance "
            "and causing fatal theophylline toxicity."
        ),
    ),
    (
        {"warfarin", "aspirin"},
        "CRITICAL",
        "DDI_CONTRAINDICATION",
        (
            "Dual antithrombotic and anticoagulant therapy creates severe synergy, precipitating "
            "life-threatening GI and cerebral hemorrhage."
        ),
    ),
    (
        {"lisinopril", "potassium"},
        "CRITICAL",
        "DDI_CONTRAINDICATION",
        (
            "Concurrent ACE inhibitor and potassium supplementation poses severe risk of "
            "lethal hyperkalemia and cardiac arrest."
        ),
    ),
    (
        {"clarithromycin", "simvastatin"},
        "CRITICAL",
        "DDI_CONTRAINDICATION",
        (
            "Clarithromycin potent CYP3A4 inhibition causes dramatic accumulation of simvastatin, "
            "triggering rhabdomyolysis and acute renal failure."
        ),
    ),
    (
        {"metformin", "contrast dye"},
        "CRITICAL",
        "DDI_CONTRAINDICATION",
        (
            "Iodinated radiographic contrast can precipitate acute kidney injury and fatal "
            "metformin-induced lactic acidosis."
        ),
    ),
    (
        {"sertraline", "phenelzine"},
        "CRITICAL",
        "DDI_CONTRAINDICATION",
        "Concurrent SSRI and MAOI administration triggers acute, life-threatening Serotonin Syndrome.",
    ),
    (
        {"amiodarone", "simvastatin"},
        "CRITICAL",
        "DDI_CONTRAINDICATION",
        "Amiodarone inhibits CYP3A4 metabolism of simvastatin, substantially increasing rhabdomyolysis risk.",
    ),
]


def _normalize_drug_name(name: str) -> str:
    """Extract clean lowercase generic/brand stem."""
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", "", name.lower()).strip()
    # Strip common dosage indicators (500mg, 10ml, etc.)
    cleaned = re.sub(r"\b\d+\s*(mg|mcg|g|ml|iu|tablets?|caps?)\b", "", cleaned).strip()
    return cleaned


def check_prescription_safety(
    allergies: List[str],
    current_medications: List[str],
    proposed_medications: List[str],
) -> List[InteractionAlert]:
    """
    Evaluates prescription safety by checking:
    1. Allergy cross-sensitivities
    2. Drug-Drug Interactions between proposed medications and current medications
    3. Drug-Drug Interactions within the proposed medications themselves
    """
    alerts: List[InteractionAlert] = []

    norm_allergies = [_normalize_drug_name(a) for a in allergies if a]
    norm_current = [_normalize_drug_name(m) for m in current_medications if m]
    norm_proposed = [_normalize_drug_name(m) for m in proposed_medications if m]

    all_meds = norm_current + norm_proposed

    # 1. Allergy Cross-Sensitivity Check
    for prop_raw, prop_norm in zip(proposed_medications, norm_proposed):
        for allerg_raw, allerg_norm in zip(allergies, norm_allergies):
            is_collision = False

            # Exact or substring match
            if allerg_norm in prop_norm or prop_norm in allerg_norm:
                is_collision = True
            else:
                # Class check
                for class_key, reactive_set in ALLERGY_CLASSES.items():
                    allerg_in_class = any(class_key in allerg_norm or r in allerg_norm for r in reactive_set)
                    prop_in_class = any(class_key in prop_norm or r in prop_norm for r in reactive_set)
                    if allerg_in_class and prop_in_class:
                        is_collision = True
                        break

            if is_collision:
                alerts.append(
                    InteractionAlert(
                        severity="CRITICAL",
                        type="ALLERGY_COLLISION",
                        trigger=f"Allergy '{allerg_raw}' vs Prescribed '{prop_raw}'",
                        detail=(
                            f"Patient has documented allergy to '{allerg_raw}'. Prescribing '{prop_raw}' "
                            "risks acute anaphylaxis or severe hypersensitivity reaction."
                        ),
                    )
                )

    # 2. Drug-Drug Interactions Check
    # Check all pairs in (current + proposed) where at least one drug is in proposed
    checked_pairs: Set[Tuple[str, str]] = set()

    for p_raw, p_norm in zip(proposed_medications, norm_proposed):
        for other_raw, other_norm in zip(
            current_medications + proposed_medications, all_meds
        ):
            if p_raw == other_raw and p_norm == other_norm:
                continue

            pair_key = tuple(sorted([p_norm, other_norm]))
            if pair_key in checked_pairs:
                continue
            checked_pairs.add(pair_key)

            for ddi_set, severity, alert_type, detail in DDI_RULES:
                # Check if both drugs in the DDI set are matched by the pair
                item1, item2 = list(ddi_set)
                match1 = any(item1 in drug or drug in item1 for drug in [p_norm, other_norm])
                match2 = any(item2 in drug or drug in item2 for drug in [p_norm, other_norm])

                if match1 and match2:
                    alerts.append(
                        InteractionAlert(
                            severity=severity,
                            type=alert_type,
                            trigger=f"{p_raw} + {other_raw}",
                            detail=detail,
                        )
                    )

    return alerts
