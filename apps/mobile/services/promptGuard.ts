export interface PatientHealthProfile {
  name?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  allergies: string[];
  chronicConditions: string[];
  activeMedications: string[];
  telemetry?: {
    steps?: number;
    restingHr?: number | null;
    spo2?: number | null;
    bloodPressure?: string | null;
    sleepDuration?: string | null;
    glucoseMgDl?: number | null;
    sevenDayBaseline?: {
      avgSteps?: number;
      avgRestingHr?: number | null;
      avgSpo2?: number | null;
      avgSleepHours?: number | null;
    };
  };
}

export const DEFAULT_PATIENT_PROFILE: PatientHealthProfile = {
  name: "Muhammad Ahsan",
  age: 22,
  gender: "Male",
  bloodGroup: "O+",
  allergies: [
    "Penicillin (Severe anaphylaxis)",
    "Sulfa Drugs (Moderate cutaneous reaction)",
  ],
  chronicConditions: [
    "Stage 1 Essential Hypertension (ICD-10: I10)",
    "Reactive Airway Component (Mild)",
  ],
  activeMedications: [
    "Atenolol 50mg PO OD (Morning)",
    "Salbutamol MDI 100mcg 2 puffs PRN",
  ],
};

/**
 * Validates prompt and image before submission.
 */
export function validatePrompt(
  prompt: string,
  hasImage: boolean
): { valid: boolean; error?: string } {
  const trimmed = prompt.trim();
  if (!trimmed && !hasImage) {
    return {
      valid: false,
      error: "Please enter a message or attach a prescription/lab image.",
    };
  }
  return { valid: true };
}

/**
 * Formats clinical system guidance and optionally grounds the query
 * in the patient's longitudinal health passport.
 */
export function buildGroundedPrompt(
  userPrompt: string,
  includeHealthProfile: boolean,
  profileOverride?: Partial<PatientHealthProfile>
): string {
  const profile: PatientHealthProfile = {
    ...DEFAULT_PATIENT_PROFILE,
    ...profileOverride,
  };

  const cleanPrompt = userPrompt.trim();

  if (!includeHealthProfile) {
    if (!cleanPrompt) {
      return (
        "[CLINICAL DIRECTIVE]\n" +
        "You are Avi, an enterprise clinical AI assistant powered by Google MedGemma 1.5 4B. " +
        "Inspect the attached medical image (prescription, diagnostic report, or lab test). " +
        "Extract medications, dosages, frequency, clinical diagnoses, and highlight any alerts or precautionary notes."
      );
    }
    return (
      "[CLINICAL DIRECTIVE]\n" +
      "You are Avi, an enterprise clinical AI assistant powered by Google MedGemma 1.5 4B. " +
      "Provide a medically accurate, clear, and reassuring explanation for the patient query below.\n\n" +
      `[PATIENT QUERY]\n${cleanPrompt}`
    );
  }

  const profileSummaryLines = [
    `• Patient: ${profile.name || "Patient"} (${profile.age || 38}y ${profile.gender || "Female"})`,
    `• Blood Group: ${profile.bloodGroup || "Unknown"}`,
    `• Known Allergies: ${profile.allergies.join(", ") || "None recorded"}`,
    `• Active Diagnoses: ${profile.chronicConditions.join(", ") || "None recorded"}`,
    `• Current Medications: ${profile.activeMedications.join("; ") || "None recorded"}`,
  ];

  if (profile.telemetry) {
    const t = profile.telemetry;
    const vitals: string[] = [];
    if (t.steps) vitals.push(`${t.steps.toLocaleString()} steps`);
    if (t.restingHr) vitals.push(`${t.restingHr} bpm resting HR`);
    if (t.spo2) vitals.push(`${t.spo2}% SpO2`);
    if (t.sleepDuration) vitals.push(`${t.sleepDuration} sleep`);
    if (t.bloodPressure) vitals.push(`${t.bloodPressure} mmHg BP`);
    if (t.glucoseMgDl) vitals.push(`${t.glucoseMgDl} mg/dL Glucose`);

    let telemetryLine = `• Wearable Telemetry — Today: ${vitals.join(", ") || "Active baseline"}`;
    if (t.sevenDayBaseline) {
      const b = t.sevenDayBaseline;
      const bItems: string[] = [];
      if (b.avgSteps) bItems.push(`${b.avgSteps.toLocaleString()} steps/day`);
      if (b.avgRestingHr) bItems.push(`${b.avgRestingHr} bpm HR`);
      if (b.avgSpo2) bItems.push(`${b.avgSpo2}% SpO2`);
      if (b.avgSleepHours) bItems.push(`${b.avgSleepHours}h sleep`);
      if (bItems.length > 0) {
        telemetryLine += ` | 7-Day Avg: ${bItems.join(", ")}`;
      }
    }
    profileSummaryLines.push(telemetryLine);
  }

  const profileSummary = profileSummaryLines.join("\n");

  const querySection = cleanPrompt
    ? `[PATIENT QUERY]\n${cleanPrompt}`
    : "[PATIENT QUERY]\nPlease review and explain the attached prescription or clinical report in light of my health profile.";

  return (
    `[PATIENT CLINICAL PROFILE]\n${profileSummary}\n\n` +
    "[CLINICAL DIRECTIVE]\n" +
    "You are Avi, an enterprise clinical AI assistant powered by Google MedGemma 1.5 4B. " +
    "Analyze the query and any attached medical image specifically in relation to the patient's active profile above. " +
    "1. Explicitly cross-reference active medications for drug-drug interactions or contraindications.\n" +
    "2. Check for allergic contraindications against known allergies.\n" +
    "3. Highlight critical red flags or precautions.\n" +
    "4. State all clinical explanations with high clarity and empathy.\n" +
    "5. Remind the patient to verify any treatment adjustments with their attending physician.\n\n" +
    `${querySection}`
  );
}
