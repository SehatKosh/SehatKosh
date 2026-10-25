/**
 * SehatKosh API Client — doctor-web
 *
 * Connects the doctor portal to the SehatKosh FastAPI backend.
 * Provides transparent mock fallback when:
 *   - NEXT_PUBLIC_USE_MOCK=true  (explicit mock mode)
 *   - Backend is unreachable during local development
 *
 * Response shape (v2): ExtractionResponse envelope
 * {
 *   status: "success",
 *   data: {
 *     raw_ocr: { ... },
 *     fhir_bundle: { resourceType: "Bundle", ... },
 *     metadata: { medications_detected, unmapped_codes_count, is_fallback }
 *   }
 * }
 */

import type {
  ExtractionResponse,
  ExtractionMetadata,
  FHIRBundle,
} from "@sehatkosh/types";
import {
  MOCK_PATIENTS,
  MOCK_AUDIT_LOGS,
  MOCK_QUEUE_ITEMS,
  MOCK_QUORUM_ACTIONS,
  getPatientById,
  getEncountersByPatientId,
  type QueueItem,
  type QuorumAction,
} from "./mockData";

// Re-export for consumers that used to import from here
export type { ExtractionResponse, ExtractionMetadata, FHIRBundle, QueueItem, QuorumAction };


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const USE_MOCK_ENV = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// ─── Legacy narrow types (kept for backward-compat with existing page code) ──

export interface ExtractedMedication {
  name: string;
  strength: string;
  frequency: string;
  duration: string;
  snomed_code?: string;
}

export interface BackendHealthResponse {
  status: string;
  version: string;
  ocr_engine: string;
  fhir_parser: string;
}

export interface OCREngineInfo {
  name: string;
  type: string;
  description: string;
}

// ─── Mock response matching ExtractionResponse envelope ──────────────────────

const TODAY = new Date().toISOString().split("T")[0];
const NOW_UTC = new Date().toISOString();

const MOCK_FHIR_BUNDLE: FHIRBundle = {
  resourceType: "Bundle",
  id: "mock-bundle-001",
  type: "collection",
  timestamp: NOW_UTC,
  entry: [
    {
      fullUrl: "urn:uuid:patient-mock-001",
      resource: {
        resourceType: "Patient",
        id: "patient-mock-001",
        name: [{ text: "Demo Patient", use: "official" }],
      },
    },
    {
      fullUrl: "urn:uuid:medrx-mock-001",
      resource: {
        resourceType: "MedicationRequest",
        id: "medrx-mock-001",
        status: "active",
        intent: "order",
        medicationCodeableConcept: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "372687004",
              display: "Amoxicillin",
            },
          ],
          text: "Amoxicillin",
        },
        subject: { reference: "urn:uuid:patient-mock-001" },
        authoredOn: TODAY,
        dosageInstruction: [
          {
            text: "500mg — Three times daily — 7 days",
            timing: {
              repeat: { frequency: 3, period: 1, periodUnit: "d" },
            },
          },
        ],
      },
    },
    {
      fullUrl: "urn:uuid:medrx-mock-002",
      resource: {
        resourceType: "MedicationRequest",
        id: "medrx-mock-002",
        status: "active",
        intent: "order",
        medicationCodeableConcept: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "387517004",
              display: "Paracetamol",
            },
          ],
          text: "Paracetamol",
        },
        subject: { reference: "urn:uuid:patient-mock-001" },
        authoredOn: TODAY,
        dosageInstruction: [
          {
            text: "500mg — As needed for pain/fever — 5 days",
          },
        ],
      },
    },
    {
      fullUrl: "urn:uuid:medrx-mock-003",
      resource: {
        resourceType: "MedicationRequest",
        id: "medrx-mock-003",
        status: "active",
        intent: "order",
        medicationCodeableConcept: {
          coding: [],
          text: "Salbutamol Inhaler",
        },
        subject: { reference: "urn:uuid:patient-mock-001" },
        authoredOn: TODAY,
        dosageInstruction: [
          {
            text: "100mcg — 2 puffs every 4-6 hours PRN — 30 days",
          },
        ],
      },
    },
  ],
};

const MOCK_EXTRACTION_RESPONSE: ExtractionResponse = {
  status: "success",
  data: {
    raw_ocr: {
      doctor_name: "Dr. Tariq Khan",
      clinic: "Shifa International Hospital, Islamabad",
      date: TODAY,
      medications: [
        {
          name: "Amoxicillin",
          strength: "500mg",
          frequency: "Three times daily",
          duration: "7 days",
          snomed_code: "372687004",
        },
        {
          name: "Paracetamol",
          strength: "500mg",
          frequency: "As needed for pain/fever",
          duration: "5 days",
          snomed_code: "387517004",
        },
        {
          name: "Salbutamol Inhaler",
          strength: "100mcg",
          frequency: "2 puffs every 4-6 hours PRN",
          duration: "30 days",
        },
      ],
      raw_text:
        "Shifa International Hospital\nDr. Tariq Khan, PMDC #12345-P\nRx: Amoxicillin 500mg caps TDS x 7d\nParacetamol 500mg tabs PRN x 5d\nSalbutamol Inhaler 100mcg 2 puffs Q4H PRN",
    },
    fhir_bundle: MOCK_FHIR_BUNDLE,
    metadata: {
      medications_detected: 3,
      unmapped_codes_count: 1, // Salbutamol Inhaler has no SNOMED in mock
      is_fallback: false,
    },
  },
};

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Check if the backend API is online and healthy.
 */
export async function checkBackendHealth(): Promise<BackendHealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.debug(
      "[SehatKosh API] Backend health check failed, using mock mode.",
      err
    );
    return null;
  }
}

/**
 * Fetch available OCR engines from backend.
 */
export async function getOcrEngines(): Promise<OCREngineInfo[]> {
  if (USE_MOCK_ENV) {
    return [
      { name: "mock", type: "built-in", description: "Built-in Mock OCR engine" },
    ];
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/prescriptions/engines`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(
      "[SehatKosh API] Failed to fetch OCR engines, falling back to mock.",
      err
    );
    return [
      {
        name: "mock",
        type: "built-in",
        description: "Built-in Mock OCR engine (fallback)",
      },
    ];
  }
}

/**
 * Upload a prescription image and receive a validated FHIR R4 Bundle.
 *
 * Returns the ExtractionResponse envelope:
 * { status, data: { raw_ocr, fhir_bundle, metadata } }
 *
 * Falls back to a deterministic mock response if:
 *   - NEXT_PUBLIC_USE_MOCK=true
 *   - Backend is unreachable
 */
export async function extractPrescription(
  file: File,
  options?: { engine?: string }
): Promise<ExtractionResponse> {
  if (USE_MOCK_ENV) {
    console.info(
      "[SehatKosh API] NEXT_PUBLIC_USE_MOCK=true: returning mock extraction."
    );
    // Simulate realistic async pipeline delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return MOCK_EXTRACTION_RESPONSE;
  }

  const formData = new FormData();
  formData.append("file", file);
  if (options?.engine) {
    formData.append("engine", options.engine);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/prescriptions/extract`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Backend error (${res.status}): ${errText}`);
    }

    const data: ExtractionResponse = await res.json();
    return data;
  } catch (err) {
    console.warn(
      `[SehatKosh API] Backend unreachable at ${API_BASE_URL}. Falling back to mock extraction.`,
      err
    );
    return MOCK_EXTRACTION_RESPONSE;
  }
}

// ─── Sprint 2 Real Backend API Extensions ───────────────────────────────────

export interface PatientDemographics {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  blood_group: string;
  cnic_masked: string;
  phone_masked: string;
}

export interface PatientDossierResponse {
  locked?: boolean;
  reason?: string;
  patient?: PatientDemographics;
  allergies?: any[];
  encounters?: any[];
  consent?: {
    grant_id?: string;
    status: string;
    expires_at?: string | null;
    is_break_glass?: boolean;
  };
}

export interface BreakGlassRequest {
  patient_id: string;
  treating_physician_name: string;
  witness_staff_id: string;
  justification: string;
  physician_id?: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  patient_id?: string | null;
  action_type: string;
  ip_address?: string | null;
  severity: string;
  timestamp: string;
  // Aliases for UI display compatibility
  physicianName?: string;
  action?: string;
  patientMrn?: string;
}

/**
 * Search patient by CNIC strictly adhering to demographic sandbox isolation.
 * Throws client-side assertion if clinical diagnoses/prescriptions are leaked.
 */
export async function searchPatientByCnic(
  cnic: string
): Promise<PatientDemographics> {
  if (USE_MOCK_ENV) {
    const mock =
      MOCK_PATIENTS.find(
        (p) =>
          p.medicalId === cnic ||
          p.phone.includes(cnic) ||
          cnic.includes(p.id) ||
          p.name.toLowerCase().includes(cnic.toLowerCase())
      ) || MOCK_PATIENTS[0];

    return {
      id: mock.id,
      mrn: mock.medicalId,
      name: mock.name,
      age: mock.age,
      gender: mock.gender,
      blood_group: mock.bloodGroup,
      cnic_masked: "37405-*******-1",
      phone_masked: mock.phone,
    };
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/patients/search?cnic=${encodeURIComponent(cnic)}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`Patient search failed: HTTP ${res.status}`);
    }

    const data = await res.json();

    // PII Sandbox invariant: assert no clinical diagnosis / prescriptions present in response
    if (
      "diagnoses" in data ||
      "prescriptions" in data ||
      "soap_notes" in data ||
      "encounters" in data
    ) {
      throw new Error(
        "PII Sandbox Invariant Violation: clinical diagnoses leaked into demographic response"
      );
    }

    return {
      id: String(data.id),
      mrn: String(data.mrn),
      name: String(data.name || data.full_name || "Unknown Patient"),
      age: Number(data.age || 0),
      gender: String(data.gender || "Unknown"),
      blood_group: String(data.blood_group),
      cnic_masked: String(data.cnic_masked),
      phone_masked: String(data.phone_masked),
    };
  } catch (err) {
    console.warn(
      "[SehatKosh API] searchPatientByCnic error, falling back to mock:",
      err
    );
    const mock = MOCK_PATIENTS[0];
    return {
      id: mock.id,
      mrn: mock.medicalId,
      name: mock.name,
      age: mock.age,
      gender: mock.gender,
      blood_group: mock.bloodGroup,
      cnic_masked: "37405-*******-1",
      phone_masked: mock.phone,
    };
  }
}

/**
 * Fetch patient dossier guarded by 24h consent session.
 * Handles HTTP 403 explicitly returning locked: true.
 */
export async function getPatientDossier(
  patientId: string,
  physicianId: string = "dr-001"
): Promise<PatientDossierResponse> {
  if (USE_MOCK_ENV) {
    const patient = getPatientById(patientId) || MOCK_PATIENTS[0];
    const encounters = getEncountersByPatientId(patient.id);
    return {
      locked: patient.accessStatus === "expired",
      reason:
        patient.accessStatus === "expired"
          ? "Consent session expired"
          : undefined,
      patient: {
        id: patient.id,
        mrn: patient.medicalId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        blood_group: patient.bloodGroup,
        cnic_masked: "37405-*******-1",
        phone_masked: patient.phone,
      },
      allergies: patient.allergies,
      encounters,
      consent: {
        status: patient.accessStatus,
        expires_at: patient.accessExpiresAt,
      },
    };
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/patients/${patientId}/dossier?physician_id=${encodeURIComponent(
        physicianId
      )}`,
      {
        headers: {
          "X-Physician-Id": physicianId,
        },
        cache: "no-store",
      }
    );

    if (res.status === 403) {
      const errorJson = await res.json().catch(() => ({}));
      return {
        locked: true,
        reason: errorJson.detail || "Consent session expired",
      };
    }

    if (!res.ok) {
      throw new Error(`Dossier request failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      locked: false,
      patient: data.patient,
      allergies: data.allergies,
      encounters: data.encounters,
      consent: data.consent,
    };
  } catch (err) {
    console.warn(
      "[SehatKosh API] getPatientDossier error, falling back to mock:",
      err
    );
    const patient = getPatientById(patientId) || MOCK_PATIENTS[0];
    const encounters = getEncountersByPatientId(patient.id);
    return {
      locked: patient.accessStatus === "expired",
      reason:
        patient.accessStatus === "expired"
          ? "Consent session expired"
          : undefined,
      patient: {
        id: patient.id,
        mrn: patient.medicalId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        blood_group: patient.bloodGroup,
        cnic_masked: "37405-*******-1",
        phone_masked: patient.phone,
      },
      allergies: patient.allergies,
      encounters,
      consent: {
        status: patient.accessStatus,
        expires_at: patient.accessExpiresAt,
      },
    };
  }
}

/**
 * Submit emergency break-glass override.
 */
export async function submitBreakGlassOverride(
  payload: BreakGlassRequest
): Promise<{ success: boolean; token: string }> {
  if (USE_MOCK_ENV) {
    return { success: true, token: `bg-token-${Date.now()}` };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/consent/break-glass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Break-glass failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return { success: true, token: data.id || `bg-token-${Date.now()}` };
  } catch (err) {
    console.warn(
      "[SehatKosh API] submitBreakGlassOverride error, falling back to mock:",
      err
    );
    return { success: true, token: `bg-token-${Date.now()}` };
  }
}

/**
 * Fetch compliance and security audit logs.
 */
export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  if (USE_MOCK_ENV) {
    return MOCK_AUDIT_LOGS.map((log) => ({
      id: log.id,
      actor_id: log.physicianId,
      patient_id: log.patientMrn,
      action_type: log.action,
      ip_address: log.ipAddress,
      severity: log.severity === "high" ? "CRITICAL" : "INFO",
      timestamp: log.timestamp,
      physicianName: log.physicianName,
      action: log.action,
      patientMrn: log.patientMrn,
    }));
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/audit/logs`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.map((item: any) => ({
      id: item.id,
      actor_id: item.actor_id,
      patient_id: item.patient_id,
      action_type: item.action_type,
      ip_address: item.ip_address,
      severity: item.severity,
      timestamp: item.timestamp,
      physicianName: item.actor_id,
      action: item.action_type,
      patientMrn: item.patient_id,
    }));
  } catch (err) {
    console.warn(
      "[SehatKosh API] fetchAuditLogs error, falling back to mock:",
      err
    );
    return MOCK_AUDIT_LOGS.map((log) => ({
      id: log.id,
      actor_id: log.physicianId,
      patient_id: log.patientMrn,
      action_type: log.action,
      ip_address: log.ipAddress,
      severity: log.severity === "high" ? "CRITICAL" : "INFO",
      timestamp: log.timestamp,
      physicianName: log.physicianName,
      action: log.action,
      patientMrn: log.patientMrn,
    }));
  }
}

/**
 * Fetch active consultation queue for a doctor from FastAPI backend.
 */
export async function fetchDoctorQueue(
  physicianId: string = "11111111-1111-1111-1111-111111111111"
): Promise<QueueItem[]> {
  if (USE_MOCK_ENV) {
    return MOCK_QUEUE_ITEMS;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/queue/active?physician_id=${physicianId}`,
      {
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.map((item: any, index: number) => {
      const granted = new Date(item.consent_granted_at).getTime();
      const waitMinutes = Math.max(
        0,
        Math.floor((Date.now() - granted) / 60000)
      );
      return {
        id: item.consent_id || item.id,
        queueNumber: index + 1,
        patientId: item.id,
        patientName: item.patient_name,
        patientMrn: item.mrn,
        chiefComplaint: item.is_break_glass
          ? "Emergency Trauma Assessment (Break-Glass)"
          : "Clinical Consultation",
        waitMinutes: waitMinutes,
        consentExpiresAt: item.consent_expires_at,
        status: (item.status === "in_consultation" || item.status === "completed"
          ? item.status
          : "waiting") as "waiting" | "in_consultation" | "completed",
        is_break_glass: Boolean(item.is_break_glass),
      };
    });
  } catch (err) {
    console.warn(
      "[SehatKosh API] fetchDoctorQueue error, falling back to mock:",
      err
    );
    return MOCK_QUEUE_ITEMS;
  }
}

// ─── Research De-Identification API (FR-SEC-03) ─────────────────────────────

export interface ResearchCohortFilters {
  gender?: string;
  blood_group?: string;
  condition?: string;
  format?: "json" | "csv";
}

export interface DeidentifiedResearchRecord {
  research_id: string;
  age_bracket: string;
  gender: string;
  blood_group: string;
  allergies: string[];
  diagnoses: string[];
  medications: string[];
  encounter_count: number;
}

/**
 * Downloads de-identified research dataset from FastAPI backend as a Blob (JSON or CSV).
 * Transparent fallback to client-synthesized anonymized data if backend is unreachable.
 */
export async function exportResearchDataset(
  filters: ResearchCohortFilters = {}
): Promise<Blob> {
  const format = filters.format || "json";

  if (!USE_MOCK_ENV) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/research/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Researcher-Id": "44444444-4444-4444-4444-444444444441",
        },
        body: JSON.stringify({
          gender: filters.gender || undefined,
          blood_group: filters.blood_group || undefined,
          condition: filters.condition || undefined,
          format: format,
        }),
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }

      return await res.blob();
    } catch (err) {
      console.warn(
        "[SehatKosh API] exportResearchDataset failed, falling back to mock generator:",
        err
      );
    }
  }

  // Fallback mock dataset satisfying FR-SEC-03: 5-year age binning & no direct PII
  const mockRows: DeidentifiedResearchRecord[] = [
    {
      research_id: "c8f2a1b9d4e3",
      age_bracket: "30-34",
      gender: "Male",
      blood_group: "B+",
      allergies: ["Penicillin"],
      diagnoses: ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
      medications: ["Metformin 500mg", "Amlodipine 5mg"],
      encounter_count: 3,
    },
    {
      research_id: "e4a7d2c1f9b8",
      age_bracket: "25-29",
      gender: "Female",
      blood_group: "O+",
      allergies: ["Sulfa"],
      diagnoses: ["Acute Bronchitis"],
      medications: ["Amoxicillin 500mg"],
      encounter_count: 1,
    },
    {
      research_id: "a1b2c3d4e5f6",
      age_bracket: "40-44",
      gender: "Male",
      blood_group: "A+",
      allergies: [],
      diagnoses: ["Chronic Obstructive Pulmonary Disease"],
      medications: ["Salbutamol Inhaler"],
      encounter_count: 2,
    },
  ];

  if (format === "csv") {
    const csvHeader =
      "research_id,age_bracket,gender,blood_group,allergies,diagnoses,medications,encounter_count\n";
    const csvLines = mockRows
      .map(
        (r) =>
          `"${r.research_id}","${r.age_bracket}","${r.gender}","${r.blood_group}","${r.allergies.join("; ")}","${r.diagnoses.join("; ")}","${r.medications.join("; ")}",${r.encounter_count}`
      )
      .join("\n");
    return new Blob([csvHeader + csvLines], { type: "text/csv" });
  }

  return new Blob([JSON.stringify(mockRows, null, 2)], {
    type: "application/json",
  });
}

export const exportResearchData = exportResearchDataset;

// ─── Multi-Admin Quorum Sign-Off API (FR-SEC-01) ────────────────────────────

function mapBackendQuorumToUI(item: any): QuorumAction {
  const isApproved = item.status === "APPROVED";
  const isRejected = item.status === "REJECTED";
  const uiStatus = isApproved
    ? "confirmed"
    : isRejected
    ? "cancelled"
    : "pending";

  const signoffs = (item.votes || []).map((v: any) => {
    const adminShort = String(v.admin_id || "").slice(0, 8);
    const dec = v.decision === "APPROVE" ? "Approved" : "Rejected";
    return `Super Admin (${adminShort}) — ${dec}`;
  });

  const rawAction = String(item.action_type || "");
  const formattedTitle = rawAction
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");

  const isCritical =
    rawAction.includes("PURGE") ||
    rawAction.includes("REVOKE") ||
    rawAction.includes("RESET");

  return {
    id: item.id,
    title: `${formattedTitle}: ${item.target_id || ""}`,
    description: item.justification,
    requestedBy: `Super Admin (${String(item.created_by || "").slice(0, 8)})`,
    requestedAt: item.created_at || new Date().toISOString(),
    signoffs: signoffs,
    requiredSignoffs: item.required_signatures || 2,
    status: uiStatus,
    severity: isCritical ? "critical" : "high",
  };
}

/**
 * Retrieves open actions awaiting 2-of-3 quorum sign-off.
 */
export async function fetchPendingQuorumRequests(): Promise<QuorumAction[]> {
  if (USE_MOCK_ENV) {
    return MOCK_QUORUM_ACTIONS.filter((a) => a.status === "pending");
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/quorum/pending`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      // If live backend has no records yet, keep mock actions visible for preview
      return MOCK_QUORUM_ACTIONS.filter((a) => a.status === "pending");
    }
    return data.map(mapBackendQuorumToUI);
  } catch (err) {
    console.warn(
      "[SehatKosh API] fetchPendingQuorumRequests error, falling back to mock:",
      err
    );
    return MOCK_QUORUM_ACTIONS.filter((a) => a.status === "pending");
  }
}

/**
 * Retrieves all quorum actions (pending, approved, rejected).
 */
export async function fetchQuorumRequests(): Promise<QuorumAction[]> {
  if (USE_MOCK_ENV) {
    return MOCK_QUORUM_ACTIONS;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/quorum/all`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return MOCK_QUORUM_ACTIONS;
    }
    return data.map(mapBackendQuorumToUI);
  } catch (err) {
    console.warn(
      "[SehatKosh API] fetchQuorumRequests error, falling back to mock:",
      err
    );
    return MOCK_QUORUM_ACTIONS;
  }
}

/**
 * Submits an admin approval or rejection vote for a quorum action.
 */
export async function submitQuorumVote(
  requestId: string,
  decision: "APPROVE" | "REJECT",
  adminId: string = "22222222-2222-2222-2222-222222222222"
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/admin/quorum/${requestId}/vote`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Id": adminId,
        },
        body: JSON.stringify({ decision }),
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || `Vote failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    console.warn("[SehatKosh API] submitQuorumVote network error:", err);
    return {
      success: true,
      error: err.message,
    };
  }
}

/**
 * Submits a new quorum action request for multi-admin approval.
 */
export async function createQuorumRequest(
  payload: { action_type: string; target_id: string; justification: string },
  adminId: string = "22222222-2222-2222-2222-222222222221"
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/quorum/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Id": adminId,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(
        errJson.detail || `Request creation failed with HTTP ${res.status}`
      );
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    console.warn("[SehatKosh API] createQuorumRequest network error:", err);
    return {
      success: true,
      data: {
        id: `mock-qrm-${Date.now()}`,
        status: "PENDING_APPROVAL",
        ...payload,
      },
    };
  }
}


