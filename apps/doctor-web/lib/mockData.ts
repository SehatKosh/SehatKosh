// Rich clinical mock data — local to doctor-web, does NOT affect shared packages or mobile app

export interface Allergy {
  substance: string;
  severity: "Mild" | "Moderate" | "Severe";
  reaction: string;
}

export interface Patient {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: "Male" | "Female";
  bloodGroup: string;
  medicalId: string;
  phone: string;
  allergies: Allergy[];
  chronicConditions: string[];
  lastEncounterDate: string;
  lastEncounterReason: string;
  activeDrugCount: number;
  hasContraindication: boolean;
  accessStatus: "active" | "pending" | "expired";
  accessExpiresAt: string;
  vitalsStatus: "normal" | "warning" | "critical";
  lastHR: number;
  lastSpO2: number;
}

export interface SoapMedication {
  name: string;
  form: string;
  strength: string;
  frequency: string;
  duration: string;
  refills: number;
}

export interface SoapNote {
  subjective: {
    chiefComplaints: string;
    onset: string;
    severity: string;
    patientStatement: string;
  };
  objective: {
    observations: string;
    bloodPressure: string;
    heartRate: number;
    spO2: number;
    temperature: string;
    weight: string;
  };
  assessment: {
    primaryDiagnosis: string;
    differentialDiagnoses: string[];
    icd10Code: string;
    icd10Display: string;
    snomedCode: string;
    snomedDisplay: string;
  };
  plan: {
    medications: SoapMedication[];
    diagnosticOrders: string[];
    instructions: string;
    followUp: string;
    dietaryRestrictions: string;
  };
}

export interface DocumentField {
  label: string;
  value: string;
  snomedCode?: string;
  confidence: "high" | "medium" | "low";
}

export interface EncounterDocument {
  scanUrl: string; // placeholder URL
  fields: DocumentField[];
  verifiedBy?: string;
  verifiedAt?: string;
}

export type EncounterType = "soap_note" | "prescription" | "lab_report" | "wearable_summary";

export interface Encounter {
  id: string;
  patientId: string;
  type: EncounterType;
  date: string;
  physician: string;
  clinic: string;
  summary: string;
  drugs: string[];
  soap?: SoapNote;
  document?: EncounterDocument;
}

export interface VitalsPoint {
  date: string;
  heartRate: number;
  steps: number;
  spO2: number;
  prescription?: string;
}

export interface DrugInteraction {
  type: "drug-allergy" | "drug-drug";
  severity: "critical" | "moderate" | "minor";
  molecule1: string;
  molecule1Source: string;
  molecule2: string;
  molecule2Source: string;
  mechanism: string;
  clinicalNote: string;
  suggestedAlternative: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_PATIENTS: Patient[] = [
  {
    id: "pat-001",
    name: "Muhammad Ahsan",
    initials: "MA",
    age: 24,
    gender: "Male",
    bloodGroup: "O+",
    medicalId: "SK-8921-X",
    phone: "+92 300 1234567",
    allergies: [
      { substance: "Penicillin G", severity: "Severe", reaction: "Anaphylaxis, urticaria" },
      { substance: "NSAIDs (Ibuprofen)", severity: "Mild", reaction: "Gastric irritation" },
    ],
    chronicConditions: ["Hypertension (Stage 1)"],
    lastEncounterDate: "2026-08-30",
    lastEncounterReason: "Bronchitis Follow-up",
    activeDrugCount: 3,
    hasContraindication: true,
    accessStatus: "active",
    accessExpiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000 + 14 * 60 * 1000).toISOString(),
    vitalsStatus: "warning",
    lastHR: 92,
    lastSpO2: 96,
  },
  {
    id: "pat-002",
    name: "Sara Khan",
    initials: "SK",
    age: 35,
    gender: "Female",
    bloodGroup: "A+",
    medicalId: "SK-4523-Y",
    phone: "+92 321 9876543",
    allergies: [
      { substance: "Sulfonamides", severity: "Moderate", reaction: "Skin rash, photosensitivity" },
    ],
    chronicConditions: ["Type 2 Diabetes Mellitus", "Dyslipidemia"],
    lastEncounterDate: "2026-08-28",
    lastEncounterReason: "Diabetes Quarterly Review",
    activeDrugCount: 2,
    hasContraindication: false,
    accessStatus: "pending",
    accessExpiresAt: "",
    vitalsStatus: "normal",
    lastHR: 76,
    lastSpO2: 98,
  },
  {
    id: "pat-003",
    name: "Ahmed Raza",
    initials: "AR",
    age: 58,
    gender: "Male",
    bloodGroup: "B-",
    medicalId: "SK-7892-Z",
    phone: "+92 333 4561234",
    allergies: [],
    chronicConditions: ["COPD (GOLD Stage II)", "Hypertension (Stage 2)", "Osteoarthritis"],
    lastEncounterDate: "2026-08-20",
    lastEncounterReason: "Pulmonology Follow-up & Spirometry",
    activeDrugCount: 4,
    hasContraindication: false,
    accessStatus: "expired",
    accessExpiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    vitalsStatus: "normal",
    lastHR: 68,
    lastSpO2: 94,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ENCOUNTERS
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_ENCOUNTERS: Encounter[] = [
  // ─── Muhammad Ahsan ───────────────────────────────────────────────────────
  {
    id: "enc-001",
    patientId: "pat-001",
    type: "soap_note",
    date: "2026-08-30T10:00:00Z",
    physician: "Dr. Tariq Khan",
    clinic: "Shifa International Hospital",
    summary:
      "Acute bacterial bronchitis with mild productive cough. Prescribed antibiotic course. Patient reported improvement in fever but persistent cough.",
    drugs: ["Amoxicillin 500mg", "Paracetamol 500mg", "Salbutamol Inhaler"],
    soap: {
      subjective: {
        chiefComplaints: "Productive cough with greenish sputum, mild chest tightness",
        onset: "5 days prior to consultation",
        severity: "Moderate — affecting sleep and daily activities",
        patientStatement:
          '"I have been coughing a lot, especially at night, and I can see green stuff coming out. I had fever for 2 days but it went away. My chest feels tight when I breathe deeply."',
      },
      objective: {
        observations:
          "Bilateral basal crackles on auscultation. No wheeze. Throat mildly erythematous. No lymphadenopathy.",
        bloodPressure: "138/88 mmHg",
        heartRate: 92,
        spO2: 96,
        temperature: "37.2°C",
        weight: "72 kg",
      },
      assessment: {
        primaryDiagnosis: "Acute Bacterial Bronchitis",
        differentialDiagnoses: ["Community-Acquired Pneumonia", "Viral Upper Respiratory Infection", "Asthma Exacerbation"],
        icd10Code: "J20.9",
        icd10Display: "Acute bronchitis, unspecified",
        snomedCode: "10509002",
        snomedDisplay: "Acute bronchitis (disorder)",
      },
      plan: {
        medications: [
          { name: "Amoxicillin", form: "Capsule", strength: "500mg", frequency: "TDS (3× daily)", duration: "7 days", refills: 0 },
          { name: "Paracetamol", form: "Tablet", strength: "500mg", frequency: "PRN every 6h", duration: "As needed", refills: 1 },
          { name: "Salbutamol", form: "MDI Inhaler", strength: "100mcg/puff", frequency: "2 puffs QID", duration: "5 days", refills: 0 },
        ],
        diagnosticOrders: ["Chest X-Ray (PA view)", "Complete Blood Count (CBC)", "Sputum Culture & Sensitivity"],
        instructions:
          "Increase fluid intake. Steam inhalation twice daily. Avoid cold beverages. Report immediately if breathing worsens or fever returns above 38.5°C.",
        followUp: "7 days — reassess cough and review culture results",
        dietaryRestrictions: "Avoid cold drinks, fried food. Increase warm fluids.",
      },
    },
    document: {
      scanUrl: "/placeholder-rx.jpg",
      fields: [
        { label: "Clinician", value: "Dr. Tariq Khan", confidence: "high" },
        { label: "Registration No.", value: "PMDC-12345-A", confidence: "high" },
        { label: "Drug 1", value: "Amoxicillin 500mg Caps", snomedCode: "372687004", confidence: "high" },
        { label: "Drug 2", value: "Paracetamol 500mg Tabs", snomedCode: "387517004", confidence: "high" },
        { label: "Drug 3", value: "Salbutamol Inhaler 100mcg", snomedCode: "372897005", confidence: "medium" },
        { label: "Date", value: "30 Aug 2026", confidence: "high" },
      ],
    },
  },
  {
    id: "enc-002",
    patientId: "pat-001",
    type: "prescription",
    date: "2026-08-15T09:30:00Z",
    physician: "Dr. Ayesha Malik",
    clinic: "PIMS Hospital",
    summary:
      "Hypertension management review. Blood pressure elevated at 145/92. Antihypertensive regimen adjusted. Patient adherent to previous medication.",
    drugs: ["Amlodipine 5mg", "Ramipril 5mg"],
    document: {
      scanUrl: "/placeholder-rx.jpg",
      fields: [
        { label: "Clinician", value: "Dr. Ayesha Malik", confidence: "high" },
        { label: "Registration No.", value: "PMDC-67890-B", confidence: "high" },
        { label: "Drug 1", value: "Amlodipine 5mg Tabs", snomedCode: "386864001", confidence: "high" },
        { label: "Drug 2", value: "Ramipril 5mg Caps", snomedCode: "372718000", confidence: "medium" },
        { label: "Date", value: "15 Aug 2026", confidence: "high" },
      ],
    },
  },
  {
    id: "enc-003",
    patientId: "pat-001",
    type: "lab_report",
    date: "2026-08-01T08:00:00Z",
    physician: "Pathology Lab — Shifa",
    clinic: "Shifa International Hospital",
    summary:
      "CBC & Lipid Profile. WBC 11.2 ×10³/µL (elevated). Cholesterol 215 mg/dL. LDL 142 mg/dL. Triglycerides 178 mg/dL.",
    drugs: [],
  },
  {
    id: "enc-004",
    patientId: "pat-001",
    type: "wearable_summary",
    date: "2026-07-31T23:59:00Z",
    physician: "Apple Watch — Auto-sync",
    clinic: "SehatKosh Wearable Integration",
    summary:
      "July monthly summary: Average resting HR 78 bpm. SpO2 range 95–99%. Total steps 127,450. Sleep avg 6h 22min. 2 irregular rhythm notifications.",
    drugs: [],
  },

  // ─── Sara Khan ────────────────────────────────────────────────────────────
  {
    id: "enc-005",
    patientId: "pat-002",
    type: "soap_note",
    date: "2026-08-28T11:00:00Z",
    physician: "Dr. Tariq Khan",
    clinic: "Shifa International Hospital",
    summary:
      "Type 2 Diabetes quarterly review. HbA1c at 7.4% — slightly above target. Metformin dose increased. Patient counseled on dietary carbohydrate restriction.",
    drugs: ["Metformin 1000mg", "Atorvastatin 20mg"],
    soap: {
      subjective: {
        chiefComplaints: "Routine quarterly diabetes check. Reports occasional fatigue and increased thirst.",
        onset: "Fatigue worsening over past 3 months",
        severity: "Mild-Moderate",
        patientStatement:
          '"I feel tired most afternoons even after sleeping well at night. I have been drinking more water than usual. My diet has not been the best this quarter."',
      },
      objective: {
        observations: "Alert and oriented. No peripheral edema. Feet exam: intact sensation, no ulcers.",
        bloodPressure: "124/82 mmHg",
        heartRate: 76,
        spO2: 98,
        temperature: "36.8°C",
        weight: "68 kg",
      },
      assessment: {
        primaryDiagnosis: "Type 2 Diabetes Mellitus — Suboptimal Control",
        differentialDiagnoses: ["Hypothyroidism (fatigue)", "Anaemia"],
        icd10Code: "E11.9",
        icd10Display: "Type 2 diabetes mellitus without complications",
        snomedCode: "44054006",
        snomedDisplay: "Diabetes mellitus type 2 (disorder)",
      },
      plan: {
        medications: [
          { name: "Metformin", form: "Tablet (XR)", strength: "1000mg", frequency: "BD (twice daily)", duration: "Ongoing", refills: 3 },
          { name: "Atorvastatin", form: "Tablet", strength: "20mg", frequency: "OD at night", duration: "Ongoing", refills: 3 },
        ],
        diagnosticOrders: ["HbA1c (repeat in 3 months)", "Fasting Lipid Profile", "Urine Albumin-Creatinine Ratio", "Thyroid Function Test"],
        instructions: "Low GI diet. 30 min walk daily. Avoid refined sugars. Monitor blood sugar at home twice daily.",
        followUp: "3 months — HbA1c review",
        dietaryRestrictions: "Low glycaemic index diet. Limit rice, white bread, sugary drinks.",
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// VITALS HISTORY (30 days for pat-001)
// ─────────────────────────────────────────────────────────────────────────────

function generateVitals(): VitalsPoint[] {
  const points: VitalsPoint[] = [];
  const now = new Date("2026-08-31");
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const hr = Math.round(72 + Math.sin(i * 0.4) * 8 + (Math.random() - 0.5) * 6);
    const steps = Math.round(5000 + Math.random() * 5000);
    const spO2 = Math.round(96 + (Math.random() - 0.3) * 3);
    const clampedSpO2 = Math.min(100, Math.max(89, spO2));
    points.push({
      date: dateStr,
      heartRate: Math.min(110, Math.max(55, hr)),
      steps,
      spO2: clampedSpO2,
      prescription: i === 15 ? "Amoxicillin started" : i === 1 ? "Salbutamol started" : undefined,
    });
  }
  return points;
}

export const MOCK_VITALS_HISTORY: Record<string, VitalsPoint[]> = {
  "pat-001": generateVitals(),
};

// ─────────────────────────────────────────────────────────────────────────────
// DRUG INTERACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_INTERACTIONS: Record<string, DrugInteraction[]> = {
  "pat-001": [
    {
      type: "drug-allergy",
      severity: "critical",
      molecule1: "Amoxicillin",
      molecule1Source: "Active Prescription (Aug 30, 2026)",
      molecule2: "Penicillin G",
      molecule2Source: "Known Severe Allergy",
      mechanism:
        "Amoxicillin is an aminopenicillin with a beta-lactam ring structurally identical to Penicillin G. Cross-reactivity in penicillin-allergic patients is well-documented and can trigger IgE-mediated anaphylaxis.",
      clinicalNote:
        "Patient has a documented Severe allergy to Penicillin G with anaphylaxis history. Prescribing Amoxicillin poses immediate anaphylaxis risk. This constitutes a Level 1 Clinical Safety Alert.",
      suggestedAlternative:
        "Consider Macrolides (Azithromycin 500mg OD × 3 days) or Fluoroquinolones (Levofloxacin 500mg OD × 5 days) subject to culture sensitivity results.",
    },
  ],
  "pat-002": [],
  "pat-003": [],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getPatientById(id: string): Patient | undefined {
  return MOCK_PATIENTS.find((p) => p.id === id);
}

export function getEncountersByPatientId(patientId: string): Encounter[] {
  return MOCK_ENCOUNTERS.filter((e) => e.patientId === patientId).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getInteractionsByPatientId(patientId: string): DrugInteraction[] {
  return MOCK_INTERACTIONS[patientId] ?? [];
}

export async function fetchWithDelay<T>(data: T, delayMs = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
}
