from typing import Any, Dict, Tuple


def calculate_triage_priority(vitals: Dict[str, Any]) -> Tuple[str, str]:
    """
    Deterministic rule-based clinical triage calculator.

    Priority criteria:
    - CRITICAL_RESUSCITATION:
        spo2 < 90
        OR heart_rate > 140 OR heart_rate < 40
        OR systolic_bp > 190 OR systolic_bp < 80
        OR gcs <= 8
    - URGENT:
        90 <= spo2 <= 94
        OR 110 <= heart_rate <= 140
        OR 160 <= systolic_bp <= 190
        OR diastolic_bp > 100
        OR temperature_f > 102.5 (or temperature_c > 39.1)
    - ROUTINE:
        Otherwise.

    Returns:
        Tuple of (priority_label, clinical_reasoning)
    """
    if not vitals or not isinstance(vitals, dict):
        return "ROUTINE", "Normal vital signs or no vitals provided."

    def _extract_val(*keys: str) -> float | None:
        for k in keys:
            val = vitals.get(k)
            if val is not None:
                try:
                    return float(val)
                except (ValueError, TypeError):
                    continue
        return None

    spo2 = _extract_val("spo2", "oximeter_spo2")
    hr = _extract_val("heart_rate", "pulse", "bpm")
    sys_bp = _extract_val("systolic_bp", "bp_systolic", "systolic")
    dia_bp = _extract_val("diastolic_bp", "bp_diastolic", "diastolic")
    temp_f = _extract_val("temperature_f", "temperature", "temp")
    temp_c = _extract_val("temperature_c")
    gcs = _extract_val("gcs", "glasgow_coma_scale")

    # Normalize Celsius to Fahrenheit if clearly Celsius (< 45.0)
    if temp_f is not None and temp_f < 45.0:
        temp_f = (temp_f * 9.0 / 5.0) + 32.0
    elif temp_c is not None:
        temp_f = (temp_c * 9.0 / 5.0) + 32.0

    # 1. CRITICAL_RESUSCITATION
    critical_reasons = []
    if spo2 is not None and spo2 < 90:
        critical_reasons.append(f"Severe hypoxia (SpO2 {spo2:.0f}%)")
    if hr is not None and (hr > 140 or hr < 40):
        critical_reasons.append(f"Severe arrhythmia / hemodynamic instability (Heart rate {hr:.0f} bpm)")
    if sys_bp is not None and (sys_bp > 190 or sys_bp < 80):
        critical_reasons.append(f"Critical blood pressure crisis (Systolic {sys_bp:.0f} mmHg)")
    if gcs is not None and gcs <= 8:
        critical_reasons.append(f"Comatose or severely altered mental status (GCS {gcs:.0f}/15)")

    if critical_reasons:
        return "CRITICAL_RESUSCITATION", "; ".join(critical_reasons)

    # 2. URGENT
    urgent_reasons = []
    if spo2 is not None and 90 <= spo2 <= 94:
        urgent_reasons.append(f"Moderate hypoxia (SpO2 {spo2:.0f}%)")
    if hr is not None and 110 <= hr <= 140:
        urgent_reasons.append(f"Tachycardia (Heart rate {hr:.0f} bpm)")
    if sys_bp is not None and 160 <= sys_bp <= 190:
        urgent_reasons.append(f"Stage 2 Hypertension crisis (Systolic {sys_bp:.0f} mmHg)")
    if dia_bp is not None and dia_bp > 100:
        urgent_reasons.append(f"Diastolic Hypertension (Diastolic {dia_bp:.0f} mmHg)")
    if temp_f is not None and temp_f > 102.5:
        urgent_reasons.append(f"High pyrexia (Temperature {temp_f:.1f}°F)")

    if urgent_reasons:
        return "URGENT", "; ".join(urgent_reasons)

    return "ROUTINE", "Vital signs within acceptable clinical thresholds."
