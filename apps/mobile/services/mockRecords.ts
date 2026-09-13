// ─── Mock Clinical Records ────────────────────────────────────────────────────
// Realistic fixture data for SehatKosh demo. Each record maps to a full SOAP
// clinical encounter dossier accessible via app/sessions/[id].tsx.

export type Medication = {
  name: string;
  form: string;
  strength: string;
  frequency: string;
  duration: string;
};

export type ClinicalEncounter = {
  id: string;
  doctor: string;
  specialty: string;
  facility: string;
  date: string;
  dateISO: string;
  encounterType: string;
  tags: { label: string; color: "sky" | "emerald" | "amber" | "violet" }[];
  summary: string;
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  medications: Medication[];
  attachedDocument: boolean;
};

export const MOCK_RECORDS: ClinicalEncounter[] = [
  {
    id: "enc-001",
    doctor: "Dr. Tariq Khan",
    specialty: "Cardiology",
    facility: "Shifa International Hospital",
    date: "Aug 30, 2026",
    dateISO: "2026-08-30",
    encounterType: "Follow-up Consultation",
    tags: [
      { label: "Prescription: 2 drugs", color: "sky" },
      { label: "ECG ordered", color: "amber" },
      { label: "Document attached", color: "emerald" },
    ],
    summary:
      "Follow-up for hypertension management. Atenolol dose adjusted following resting BP readings. Lifestyle modification plan issued. ECG to be repeated in 4 weeks.",
    soap: {
      subjective:
        "Patient reports mild morning headaches and occasional palpitations over the past two weeks. Denies chest pain or shortness of breath. Currently on Atenolol 25mg but compliance has been inconsistent.",
      objective:
        "BP: 148/94 mmHg (right arm, seated) · Pulse: 88 BPM · SpO₂: 97% · Weight: 74.5 kg · No peripheral edema. Heart sounds S1 S2 normal, no murmurs.",
      assessment:
        "Stage 1 Hypertension — ICD-10: I10. Medication non-compliance identified as contributing factor. No acute cardiac event.",
      plan:
        "Increase Atenolol to 50mg once daily. Add Amlodipine 5mg once daily if BP >140/90 at follow-up. Sodium-restricted diet (<2g/day). 30 min brisk walk five days per week. Repeat ECG and lipid panel in 4 weeks.",
    },
    medications: [
      {
        name: "Atenolol",
        form: "Tablet",
        strength: "50 mg",
        frequency: "Once daily (morning)",
        duration: "Ongoing — review in 4 weeks",
      },
      {
        name: "Amlodipine",
        form: "Tablet",
        strength: "5 mg",
        frequency: "Once daily (evening)",
        duration: "Ongoing — review in 4 weeks",
      },
    ],
    attachedDocument: true,
  },
  {
    id: "enc-002",
    doctor: "Dr. Ayesha Malik",
    specialty: "Pulmonology",
    facility: "PIMS Hospital",
    date: "Aug 12, 2026",
    dateISO: "2026-08-12",
    encounterType: "Acute Consultation",
    tags: [
      { label: "Prescription: 2 drugs", color: "sky" },
      { label: "Document attached", color: "emerald" },
    ],
    summary:
      "Acute chest congestion and productive cough. Bacterial chest infection confirmed. Amoxicillin course and salbutamol rescue inhaler prescribed.",
    soap: {
      subjective:
        "5-day history of productive cough with yellowish sputum, low-grade fever (37.9°C), and chest tightness on deep inspiration. Reports increased breathlessness on climbing stairs.",
      objective:
        "Temp: 37.9°C · RR: 19 breaths/min · SpO₂: 95% · BP: 118/76 mmHg · Chest auscultation: coarse crackles in right lower lobe. No wheeze at rest.",
      assessment:
        "Community-acquired bacterial pneumonia (right lower lobe) — ICD-10: J18.9. Mild reactive airway component noted.",
      plan:
        "Amoxicillin 500mg three times daily for 7 days. Salbutamol inhaler (100mcg/puff) — 2 puffs as needed for breathlessness. Increase oral fluid intake. Rest for 5 days. Follow-up if fever persists beyond 72 hours or SpO₂ drops below 93%.",
    },
    medications: [
      {
        name: "Amoxicillin",
        form: "Capsule",
        strength: "500 mg",
        frequency: "Three times daily (with meals)",
        duration: "7 days",
      },
      {
        name: "Salbutamol",
        form: "Metered-dose Inhaler",
        strength: "100 mcg/puff",
        frequency: "2 puffs as needed (max 4×/day)",
        duration: "Until breathlessness resolves",
      },
    ],
    attachedDocument: true,
  },
  {
    id: "enc-003",
    doctor: "Dr. Bilal Qureshi",
    specialty: "Internal Medicine",
    facility: "Kulsum International Hospital",
    date: "Jul 28, 2026",
    dateISO: "2026-07-28",
    encounterType: "Routine Health Checkup",
    tags: [
      { label: "Lab ordered: CBC", color: "violet" },
      { label: "Vitals normal", color: "emerald" },
    ],
    summary:
      "Annual preventive health review. All vitals within normal limits. CBC and lipid panel ordered for baseline. No medication prescribed.",
    soap: {
      subjective:
        "Presents for annual health screening. No current complaints. Mild fatigue reported that patient attributes to work-related stress. Non-smoker. Occasional social alcohol use. Family history: father with T2DM.",
      objective:
        "BP: 122/78 mmHg · Pulse: 72 BPM · Temp: 36.7°C · Weight: 74.5 kg · Height: 178 cm · BMI: 23.5 · Abdomen soft, non-tender. No lymphadenopathy.",
      assessment:
        "Healthy adult male — routine preventive screen. No acute or chronic illness identified. Borderline family risk for metabolic syndrome — ICD-10: Z13.6.",
      plan:
        "CBC with differential and lipid panel ordered. HbA1c screen given paternal diabetes history. Maintain current BMI through regular aerobic activity. Limit processed food intake. Follow-up in 2 weeks for lab results.",
    },
    medications: [],
    attachedDocument: false,
  },
  {
    id: "enc-004",
    doctor: "Dr. Samina Raza",
    specialty: "Dermatology",
    facility: "Shifa International Hospital",
    date: "Jun 14, 2026",
    dateISO: "2026-06-14",
    encounterType: "Specialist Consultation",
    tags: [
      { label: "Prescription: 1 drug", color: "sky" },
      { label: "Document attached", color: "emerald" },
    ],
    summary:
      "Contact dermatitis on inner left forearm. Desonide 0.05% topical cream prescribed for a 2-week course. Potential triggers identified.",
    soap: {
      subjective:
        "3-week history of pruritic erythematous rash on the inner left forearm. Patient recently changed laundry detergent brand. No new food introductions. Denies systemic symptoms. Known allergy: NSAIDs (mild skin rash).",
      objective:
        "Well-demarcated erythematous patch ~6×4 cm on left volar forearm. No vesiculation or oozing. Mild lichenification at margins. No regional lymphadenopathy.",
      assessment:
        "Allergic contact dermatitis — ICD-10: L23.9. Likely trigger: fragrance in new laundry detergent. Chronic scratching contributing to lichenification.",
      plan:
        "Desonide 0.05% topical cream — apply thin layer to affected area twice daily for 14 days. Revert to fragrance-free detergent. Avoid occlusive dressings. Oral cetirizine 10mg at night for pruritus if severe. Review in 2 weeks; consider patch testing if rash recurs.",
    },
    medications: [
      {
        name: "Desonide",
        form: "Topical Cream",
        strength: "0.05%",
        frequency: "Twice daily (thin layer on affected area)",
        duration: "14 days",
      },
    ],
    attachedDocument: true,
  },
];

/** Look up a single encounter by ID. Returns undefined if not found. */
export function getEncounterById(id: string): ClinicalEncounter | undefined {
  return MOCK_RECORDS.find((record) => record.id === id);
}

/** Group encounters by month label (e.g. "August 2026") */
export function groupByMonth(
  records: ClinicalEncounter[]
): { month: string; encounters: ClinicalEncounter[] }[] {
  const map = new Map<string, ClinicalEncounter[]>();
  for (const record of records) {
    const [, month, year] = record.date.match(/(\w+ \d+), (\d+)/) ?? [];
    const label = month && year ? `${month.split(" ")[0]} ${year}` : "Other";
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(record);
  }
  return Array.from(map.entries()).map(([month, encounters]) => ({
    month,
    encounters,
  }));
}
