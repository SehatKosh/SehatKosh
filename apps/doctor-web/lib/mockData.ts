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
  {
    id: "pat-004",
    name: "Fatima Noor",
    initials: "FN",
    age: 28,
    gender: "Female",
    bloodGroup: "AB+",
    medicalId: "SK-3310-A",
    phone: "+92 316 7890123",
    allergies: [],
    chronicConditions: ["Migraine (Chronic)"],
    lastEncounterDate: "2026-08-10",
    lastEncounterReason: "Migraine Prophylaxis Review",
    activeDrugCount: 1,
    hasContraindication: false,
    accessStatus: "active",
    accessExpiresAt: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
    vitalsStatus: "normal",
    lastHR: 72,
    lastSpO2: 99,
  },
  {
    id: "pat-005",
    name: "Bilal Sheikh",
    initials: "BS",
    age: 32,
    gender: "Male",
    bloodGroup: "O-",
    medicalId: "SK-1102-B",
    phone: "+92 301 5551234",
    allergies: [],
    chronicConditions: [],
    lastEncounterDate: "2026-08-28",
    lastEncounterReason: "Appendectomy — Post-op Day 7 Check",
    activeDrugCount: 2,
    hasContraindication: false,
    accessStatus: "active",
    accessExpiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    vitalsStatus: "normal",
    lastHR: 80,
    lastSpO2: 98,
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

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-ROLE MOCK DATA — Doctor Queue, Staff, Audit Logs, Research Cases
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "doctor" | "registrar" | "admin" | "researcher";

export interface QueueItem {
  id: string;
  queueNumber: number;
  patientId: string;
  patientName: string;
  patientMrn: string;
  chiefComplaint: string;
  waitMinutes: number;
  consentExpiresAt: string;
  status: "waiting" | "in_consultation" | "completed";
}

export interface HospitalStaff {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  roomNumber?: string;
  hospitalName: string;
  onDuty: boolean;
  email: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  physicianName: string;
  physicianId: string;
  patientMrn: string;
  patientCnic: string;
  action: "Dossier Viewed" | "Document Zoomed" | "Summary Copied" | "Break-Glass Override" | "Consent Dispatched" | "Record Ingested";
  severity: "normal" | "high";
  ipAddress: string;
}

export interface AnonymizedCase {
  caseId: string;
  subjectHash: string;
  ageBracket: string;
  gender: "Male" | "Female";
  primaryCondition: string;
  icd10Code: string;
  prescribedMolecules: string[];
  encounterCount: number;
  regimenLengthDays: number;
  outcome: "Resolved" | "Maintenance" | "Escalated";
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

export interface AdminMetrics {
  activeSessions: number;
  registeredPatients: number;
  breakGlassToday: number;
  ingestQueue: number;
}

// ── Queue Items ──────────────────────────────────────────────────────────────

export const MOCK_QUEUE_ITEMS: QueueItem[] = [
  {
    id: "q-001", queueNumber: 1, patientId: "pat-001",
    patientName: "Muhammad Ahsan", patientMrn: "SK-8921-X",
    chiefComplaint: "Chest tightness for 3 days, mild shortness of breath",
    waitMinutes: 12,
    consentExpiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000 + 42 * 60 * 1000).toISOString(),
    status: "waiting",
  },
  {
    id: "q-002", queueNumber: 2, patientId: "pat-002",
    patientName: "Sara Khan", patientMrn: "SK-4523-Y",
    chiefComplaint: "Fatigue and increased thirst — diabetes review",
    waitMinutes: 26,
    consentExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
    status: "waiting",
  },
  {
    id: "q-003", queueNumber: 3, patientId: "pat-003",
    patientName: "Ahmed Raza", patientMrn: "SK-7892-Z",
    chiefComplaint: "COPD follow-up, worsening exertional dyspnea",
    waitMinutes: 41,
    consentExpiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000 + 8 * 60 * 1000).toISOString(),
    status: "waiting",
  },
  {
    id: "q-004", queueNumber: 4, patientId: "pat-004",
    patientName: "Fatima Noor", patientMrn: "SK-3310-A",
    chiefComplaint: "Recurrent migraine, requesting new prophylactic",
    waitMinutes: 55,
    consentExpiresAt: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
    status: "waiting",
  },
  {
    id: "q-005", queueNumber: 5, patientId: "pat-005",
    patientName: "Bilal Sheikh", patientMrn: "SK-1102-B",
    chiefComplaint: "Post-op wound check — appendectomy day 7",
    waitMinutes: 68,
    consentExpiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    status: "in_consultation",
  },
];

// ── Hospital Staff ────────────────────────────────────────────────────────────

export const MOCK_HOSPITAL_STAFF: HospitalStaff[] = [
  { id: "dr-001", name: "Dr. Tariq Khan", role: "doctor", department: "Cardiology", roomNumber: "Room 4", hospitalName: "Shifa International Hospital", onDuty: true, email: "tariq.khan@shifa.edu.pk" },
  { id: "dr-002", name: "Dr. Ayesha Malik", role: "doctor", department: "Endocrinology", roomNumber: "Room 7", hospitalName: "Shifa International Hospital", onDuty: true, email: "ayesha.malik@shifa.edu.pk" },
  { id: "dr-003", name: "Dr. Usman Farooq", role: "doctor", department: "Pulmonology", roomNumber: "Room 2", hospitalName: "Shifa International Hospital", onDuty: false, email: "usman.farooq@shifa.edu.pk" },
  { id: "dr-004", name: "Dr. Zainab Hussain", role: "doctor", department: "Neurology", roomNumber: "Room 9", hospitalName: "Shifa International Hospital", onDuty: true, email: "zainab.h@shifa.edu.pk" },
  { id: "dr-005", name: "Dr. Kamran Iqbal", role: "doctor", department: "General Surgery", roomNumber: "Room 1", hospitalName: "Shifa International Hospital", onDuty: false, email: "kamran.i@shifa.edu.pk" },
  { id: "reg-001", name: "Sana Perveen", role: "registrar", department: "Front Desk", hospitalName: "Shifa International Hospital", onDuty: true, email: "sana.p@shifa.edu.pk" },
  { id: "reg-002", name: "Omer Siddiqui", role: "registrar", department: "Front Desk", hospitalName: "Shifa International Hospital", onDuty: false, email: "omer.s@shifa.edu.pk" },
];

// ── Audit Logs ────────────────────────────────────────────────────────────────

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: "log-001", timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), physicianName: "Dr. Tariq Khan", physicianId: "dr-001", patientMrn: "SK-8921-X", patientCnic: "37405-1234567-1", action: "Dossier Viewed", severity: "normal", ipAddress: "192.168.1.45" },
  { id: "log-002", timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), physicianName: "Dr. Tariq Khan", physicianId: "dr-001", patientMrn: "SK-8921-X", patientCnic: "37405-1234567-1", action: "Summary Copied", severity: "normal", ipAddress: "192.168.1.45" },
  { id: "log-003", timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(), physicianName: "Dr. Ayesha Malik", physicianId: "dr-002", patientMrn: "SK-4523-Y", patientCnic: "42201-9876543-2", action: "Dossier Viewed", severity: "normal", ipAddress: "192.168.1.62" },
  { id: "log-004", timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), physicianName: "Dr. Usman Farooq", physicianId: "dr-003", patientMrn: "SK-7892-Z", patientCnic: "35202-4561234-3", action: "Break-Glass Override", severity: "high", ipAddress: "192.168.1.33" },
  { id: "log-005", timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), physicianName: "Sana Perveen", physicianId: "reg-001", patientMrn: "SK-3310-A", patientCnic: "61101-7890123-4", action: "Consent Dispatched", severity: "normal", ipAddress: "192.168.1.10" },
  { id: "log-006", timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), physicianName: "Dr. Tariq Khan", physicianId: "dr-001", patientMrn: "SK-4523-Y", patientCnic: "42201-9876543-2", action: "Document Zoomed", severity: "normal", ipAddress: "192.168.1.45" },
  { id: "log-007", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), physicianName: "Sana Perveen", physicianId: "reg-001", patientMrn: "SK-1102-B", patientCnic: "42301-5551234-5", action: "Record Ingested", severity: "normal", ipAddress: "192.168.1.10" },
  { id: "log-008", timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), physicianName: "Dr. Zainab Hussain", physicianId: "dr-004", patientMrn: "SK-8921-X", patientCnic: "37405-1234567-1", action: "Break-Glass Override", severity: "high", ipAddress: "192.168.1.88" },
  { id: "log-009", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), physicianName: "Dr. Ayesha Malik", physicianId: "dr-002", patientMrn: "SK-7892-Z", patientCnic: "35202-4561234-3", action: "Dossier Viewed", severity: "normal", ipAddress: "192.168.1.62" },
  { id: "log-010", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), physicianName: "Omer Siddiqui", physicianId: "reg-002", patientMrn: "SK-3310-A", patientCnic: "61101-7890123-4", action: "Consent Dispatched", severity: "normal", ipAddress: "192.168.1.14" },
  { id: "log-011", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), physicianName: "Dr. Kamran Iqbal", physicianId: "dr-005", patientMrn: "SK-1102-B", patientCnic: "42301-5551234-5", action: "Dossier Viewed", severity: "normal", ipAddress: "192.168.1.77" },
  { id: "log-012", timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), physicianName: "Dr. Tariq Khan", physicianId: "dr-001", patientMrn: "SK-8921-X", patientCnic: "37405-1234567-1", action: "Summary Copied", severity: "normal", ipAddress: "192.168.1.45" },
];

// ── Admin Metrics ─────────────────────────────────────────────────────────────

export const MOCK_ADMIN_METRICS: AdminMetrics = {
  activeSessions: 7,
  registeredPatients: 3842,
  breakGlassToday: 2,
  ingestQueue: 14,
};

// ── Anonymized Research Cases ─────────────────────────────────────────────────

export const MOCK_ANONYMIZED_CASES: AnonymizedCase[] = [
  {
    caseId: "case-001", subjectHash: "SUBJECT-ANON-9042", ageBracket: "20–25", gender: "Male",
    primaryCondition: "Acute Bacterial Bronchitis", icd10Code: "J20.9",
    prescribedMolecules: ["Amoxicillin", "Paracetamol", "Salbutamol"],
    encounterCount: 4, regimenLengthDays: 7, outcome: "Resolved",
    soap: {
      subjective: "Subject reports productive cough with mucopurulent sputum, mild chest tightness, fever resolved after 48h.",
      objective: "Bilateral basal crackles. SpO₂ 96%. HR 92 bpm. Temp 37.2°C. BP 138/88 mmHg.",
      assessment: "Acute bacterial bronchitis (J20.9). Differentials: CAP, viral URTI, asthma exacerbation.",
      plan: "Amoxicillin 500mg TDS × 7d. Salbutamol MDI 2 puffs QID × 5d. Follow-up 7 days. Culture sensitivity ordered.",
    },
  },
  {
    caseId: "case-002", subjectHash: "SUBJECT-ANON-3817", ageBracket: "30–35", gender: "Female",
    primaryCondition: "Type 2 Diabetes Mellitus — Suboptimal Control", icd10Code: "E11.9",
    prescribedMolecules: ["Metformin", "Atorvastatin"],
    encounterCount: 6, regimenLengthDays: 90, outcome: "Maintenance",
    soap: {
      subjective: "Subject reports afternoon fatigue and polydipsia. Diet adherence poor this quarter. HbA1c 7.4%.",
      objective: "Alert and oriented. No peripheral edema. Foot exam: intact sensation, no ulcers. BP 124/82.",
      assessment: "T2DM suboptimal control (E11.9). Differentials: hypothyroidism-related fatigue, anaemia.",
      plan: "Metformin XR 1000mg BD ongoing. Atorvastatin 20mg OD. HbA1c repeat 3 months. Low GI diet counselling.",
    },
  },
  {
    caseId: "case-003", subjectHash: "SUBJECT-ANON-7291", ageBracket: "55–60", gender: "Male",
    primaryCondition: "COPD GOLD Stage II", icd10Code: "J44.1",
    prescribedMolecules: ["Tiotropium", "Budesonide", "Formoterol", "Salbutamol"],
    encounterCount: 9, regimenLengthDays: 365, outcome: "Maintenance",
    soap: {
      subjective: "Worsening exertional dyspnea over past month. Increased sputum production. No haemoptysis.",
      objective: "Reduced air entry bilaterally. FEV1 62% predicted. SpO₂ 94%. RR 22/min.",
      assessment: "COPD GOLD Stage II exacerbation (J44.1). Spirometry confirms moderate obstruction.",
      plan: "Continue Tiotropium 18mcg OD. Add Budesonide/Formoterol 160/4.5mcg BD. Pulmonary rehab referral.",
    },
  },
  {
    caseId: "case-004", subjectHash: "SUBJECT-ANON-5533", ageBracket: "25–30", gender: "Female",
    primaryCondition: "Essential Hypertension", icd10Code: "I10",
    prescribedMolecules: ["Amlodipine", "Ramipril"],
    encounterCount: 3, regimenLengthDays: 180, outcome: "Maintenance",
    soap: {
      subjective: "Routine BP monitoring. Subject reports occasional headaches. No visual disturbances.",
      objective: "BP 148/94 mmHg. HR 78 bpm. No papilloedema. Fundoscopy normal.",
      assessment: "Essential hypertension, Stage 1 (I10). White-coat effect possible.",
      plan: "Amlodipine 5mg OD. Ramipril 5mg OD. Home BP diary. Lifestyle: DASH diet, 30-min walk.",
    },
  },
  {
    caseId: "case-005", subjectHash: "SUBJECT-ANON-1204", ageBracket: "40–45", gender: "Male",
    primaryCondition: "Community-Acquired Pneumonia", icd10Code: "J18.9",
    prescribedMolecules: ["Ceftriaxone", "Azithromycin"],
    encounterCount: 2, regimenLengthDays: 10, outcome: "Resolved",
    soap: {
      subjective: "High-grade fever 39.1°C, rigors, productive cough brown sputum, pleuritic chest pain right side.",
      objective: "Dullness to percussion right base. CXR: right lower lobe consolidation. WBC 14.2×10³/µL.",
      assessment: "CAP right lower lobe (J18.9). Moderate severity — CURB-65 score 2. Admission warranted.",
      plan: "IV Ceftriaxone 1g OD × 5d then oral. Azithromycin 500mg OD × 5d. IV fluids. O₂ prn.",
    },
  },
  {
    caseId: "case-006", subjectHash: "SUBJECT-ANON-8840", ageBracket: "60–65", gender: "Female",
    primaryCondition: "Osteoarthritis — Knee Bilateral", icd10Code: "M17.1",
    prescribedMolecules: ["Celecoxib", "Paracetamol", "Glucosamine"],
    encounterCount: 5, regimenLengthDays: 240, outcome: "Maintenance",
    soap: {
      subjective: "Bilateral knee pain worsening on stairs. Morning stiffness < 30 min. Uses walking aid.",
      objective: "Crepitus bilateral knees. Limited flexion 110°. X-ray: joint space narrowing, osteophytes.",
      assessment: "Primary osteoarthritis bilateral knees (M17.1). Moderate functional impairment.",
      plan: "Celecoxib 200mg OD with food. Paracetamol 1g QID PRN. Physiotherapy referral. Weight management.",
    },
  },
];

export function getAnonymizedCaseById(caseId: string): AnonymizedCase | undefined {
  return MOCK_ANONYMIZED_CASES.find((c) => c.caseId === caseId);
}

export function getQueueForDoctor(): QueueItem[] {
  return MOCK_QUEUE_ITEMS;
}

export function getOnDutyDoctors(): HospitalStaff[] {
  return MOCK_HOSPITAL_STAFF.filter((s) => s.role === "doctor" && s.onDuty);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN — Hospital Licensing, Quorum, Platform Metrics
// ─────────────────────────────────────────────────────────────────────────────

export interface HospitalLicenseRequest {
  id: string;
  hospitalName: string;
  city: string;
  province: string;
  accreditationId: string;
  adminContact: string;
  adminEmail: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  bedCount: number;
  type: "Teaching" | "Private" | "Government";
}

export interface QuorumAction {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  signoffs: string[];
  requiredSignoffs: number;
  status: "pending" | "confirmed" | "cancelled";
  severity: "critical" | "high";
}

export interface SuperAdminMetrics {
  connectedHospitals: number;
  registeredPhysicians: number;
  activeConsents: number;
  researchExportsIssued: number;
  pendingLicenseRequests: number;
  quorumActionsOpen: number;
}

export const MOCK_SUPER_ADMIN_METRICS: SuperAdminMetrics = {
  connectedHospitals: 14,
  registeredPhysicians: 387,
  activeConsents: 1042,
  researchExportsIssued: 29,
  pendingLicenseRequests: 3,
  quorumActionsOpen: 1,
};

export const MOCK_HOSPITAL_LICENSES: HospitalLicenseRequest[] = [
  {
    id: "lic-001",
    hospitalName: "Aga Khan University Hospital",
    city: "Karachi",
    province: "Sindh",
    accreditationId: "AKUH-PKR-0012",
    adminContact: "Dr. Farrukh Qureshi",
    adminEmail: "admin@akuh.edu.pk",
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    bedCount: 700,
    type: "Teaching",
  },
  {
    id: "lic-002",
    hospitalName: "Services Hospital Lahore",
    city: "Lahore",
    province: "Punjab",
    accreditationId: "SHL-PKR-0087",
    adminContact: "Dr. Nadia Siddiqui",
    adminEmail: "hrd@serviceshospital.pk",
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    bedCount: 1500,
    type: "Government",
  },
  {
    id: "lic-003",
    hospitalName: "Hayatabad Medical Complex",
    city: "Peshawar",
    province: "KPK",
    accreditationId: "HMC-PKR-0043",
    adminContact: "Col. (r) Asif Durrani",
    adminEmail: "director@hmc.edu.pk",
    submittedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    bedCount: 1100,
    type: "Teaching",
  },
  {
    id: "lic-004",
    hospitalName: "Liaquat National Hospital",
    city: "Karachi",
    province: "Sindh",
    accreditationId: "LNH-PKR-0021",
    adminContact: "Prof. Zahid Farouk",
    adminEmail: "it@lnh.edu.pk",
    submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: "approved",
    bedCount: 800,
    type: "Teaching",
  },
];

export const MOCK_QUORUM_ACTIONS: QuorumAction[] = [
  {
    id: "qrm-001",
    title: "Purge Regional Database — KPK Node",
    description:
      "Force-purge of the Khyber Pakhtunkhwa regional patient ledger node following a critical data integrity audit finding. Action is irreversible and will require data re-ingestion from hospital backups.",
    requestedBy: "Super Admin (Session: SA-001)",
    requestedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    signoffs: ["Super Admin (Session: SA-001)"],
    requiredSignoffs: 2,
    status: "pending",
    severity: "critical",
  },
  {
    id: "qrm-002",
    title: "Revoke Facility License — Expired Accreditation",
    description:
      "Revoke SehatKosh platform access for a facility whose PMDC accreditation has expired. All linked physician accounts will be suspended until re-verification.",
    requestedBy: "Super Admin (Session: SA-002)",
    requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    signoffs: ["Super Admin (Session: SA-002)", "Super Admin (Session: SA-001)"],
    requiredSignoffs: 2,
    status: "confirmed",
    severity: "high",
  },
];

export interface ResearchClearinghouseRequest {
  id: string;
  caseRef: string;
  requestingDoctor: string;
  requestingDoctorId: string;
  department: string;
  purpose: string;
  submittedAt: string;
  status: "pending" | "forwarded" | "rejected";
  patientAgeRange: string;
  condition: string;
}

export const MOCK_CLEARINGHOUSE_REQUESTS: ResearchClearinghouseRequest[] = [
  {
    id: "req-001",
    caseRef: "SUBJECT-ANON-9042",
    requestingDoctor: "Dr. Tariq Khan",
    requestingDoctorId: "dr-001",
    department: "Cardiology",
    purpose: "Teaching case for final-year medical students on bronchitis management with allergy contraindication.",
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    patientAgeRange: "20–25",
    condition: "Acute Bacterial Bronchitis",
  },
  {
    id: "req-002",
    caseRef: "SUBJECT-ANON-3817",
    requestingDoctor: "Dr. Ayesha Malik",
    requestingDoctorId: "dr-002",
    department: "Endocrinology",
    purpose: "Longitudinal study on HbA1c management patterns in T2DM patients in Pakistan.",
    submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    status: "forwarded",
    patientAgeRange: "30–35",
    condition: "Type 2 Diabetes Mellitus",
  },
  {
    id: "req-003",
    caseRef: "SUBJECT-ANON-7291",
    requestingDoctor: "Dr. Usman Farooq",
    requestingDoctorId: "dr-003",
    department: "Pulmonology",
    purpose: "COPD GOLD staging treatment comparison for pulmonary rehabilitation research paper.",
    submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    patientAgeRange: "55–60",
    condition: "COPD GOLD Stage II",
  },
];
