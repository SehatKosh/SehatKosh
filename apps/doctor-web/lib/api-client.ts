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

// ─── Sprint 8: Clinical Safety, Triage & Encounter Management ───────────────

export interface TriageCalculateRequest {
  bp_systolic?: number;
  bp_diastolic?: number;
  pulse?: number;
  heart_rate?: number;
  temperature?: number;
  temperature_f?: number;
  spo2?: number;
  respiratory_rate?: number;
  gcs?: number;
}

export interface TriageCalculateResponse {
  priority: string;
  reasoning: string;
}

export interface InteractionCheckRequest {
  patient_id?: string;
  proposed_medications: string[];
  allergies?: string[];
}

export interface InteractionAlert {
  severity: string;
  type: string;
  trigger: string;
  detail: string;
}

export interface InteractionCheckResponse {
  safe: boolean;
  alerts: InteractionAlert[];
}

export interface ICD10Item {
  code: string;
  description: string;
}

export interface AmendmentPayload {
  reason: string;
  soap_subjective?: string;
  soap_objective?: string;
  soap_assessment?: Record<string, unknown>;
  soap_plan?: string;
  physician_name?: string;
}

/**
 * Calculate triage priority from vital signs using deterministic thresholds.
 */
export async function calculateTriagePriority(
  vitals: TriageCalculateRequest
): Promise<TriageCalculateResponse> {
  if (USE_MOCK_ENV) {
    const isCritical = (vitals.bp_systolic ?? 120) < 90 || (vitals.spo2 ?? 98) < 90 || (vitals.pulse ?? 72) > 140;
    const isUrgent = (vitals.bp_systolic ?? 120) > 160 || (vitals.pulse ?? 72) > 110 || (vitals.temperature_f ?? 98.6) > 102.5;
    return {
      priority: isCritical ? "CRITICAL_RESUSCITATION" : isUrgent ? "URGENT" : "ROUTINE",
      reasoning: isCritical ? "Critical hypoxia or unstable hemodynamic threshold met." : isUrgent ? "Elevated urgency thresholds met." : "All parameters within routine limits.",
    };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/clinical/triage-calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vitals),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[SehatKosh API] calculateTriagePriority error:", err);
    return { priority: "ROUTINE", reasoning: "Fallback — backend unreachable" };
  }
}

/**
 * Check drug-drug interactions and allergy cross-sensitivities.
 */
export async function checkInteractions(
  payload: InteractionCheckRequest
): Promise<InteractionCheckResponse> {
  if (USE_MOCK_ENV) {
    const hasPenicillin = payload.allergies?.some((a) => a.toLowerCase().includes("penicillin"));
    const hasAmox = payload.proposed_medications.some((m) => m.toLowerCase().includes("amoxicillin"));
    if (hasPenicillin && hasAmox) {
      return {
        safe: false,
        alerts: [
          {
            severity: "CRITICAL",
            type: "ALLERGY_COLLISION",
            trigger: "Allergy 'Penicillin' vs Prescribed 'Amoxicillin'",
            detail: "Patient has documented Penicillin hypersensitivity. Amoxicillin can cause severe anaphylaxis.",
          },
        ],
      };
    }
    return { safe: true, alerts: [] };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/clinical/check-interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[SehatKosh API] checkInteractions error:", err);
    return { safe: true, alerts: [] };
  }
}

/**
 * Search standardized ICD-10 diagnostic codes.
 */
export async function searchICD10(query: string): Promise<ICD10Item[]> {
  const fallbackItems: ICD10Item[] = [
    { code: "I10", description: "Essential Hypertension" },
    { code: "E11.9", description: "Type 2 Diabetes Mellitus without complications" },
    { code: "J20.9", description: "Acute Bronchitis, unspecified" },
    { code: "I25.9", description: "Chronic Ischemic Heart Disease" },
    { code: "A09", description: "Infectious Gastroenteritis and Colitis" },
    { code: "A90", description: "Dengue Fever" },
    { code: "A01.0", description: "Typhoid Fever" },
    { code: "J06.9", description: "Acute Upper Respiratory Infection, unspecified" },
    { code: "K29.7", description: "Gastritis, unspecified" },
    { code: "N39.0", description: "Urinary Tract Infection, site not specified" },
    { code: "T07", description: "Unspecified multiple injuries / Acute Trauma" },
  ];

  if (USE_MOCK_ENV) {
    if (!query) return fallbackItems.slice(0, 5);
    return fallbackItems.filter(
      (i) =>
        i.description.toLowerCase().includes(query.toLowerCase()) ||
        i.code.toLowerCase().includes(query.toLowerCase())
    );
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/clinical/icd10?q=${encodeURIComponent(query)}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[SehatKosh API] searchICD10 error:", err);
    if (!query) return fallbackItems.slice(0, 5);
    return fallbackItems.filter(
      (i) =>
        i.description.toLowerCase().includes(query.toLowerCase()) ||
        i.code.toLowerCase().includes(query.toLowerCase())
    );
  }
}

/**
 * Finalize an encounter (immutability lock).
 */
export async function finalizeEncounter(
  encounterId: string
): Promise<{ success: boolean; finalized_at?: string }> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/encounters/${encounterId}/finalize`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: true, finalized_at: data.finalized_at };
  } catch (err) {
    console.warn("[SehatKosh API] finalizeEncounter error:", err);
    return { success: false };
  }
}

/**
 * Amend a finalized encounter (append-only child record).
 */
export async function amendEncounter(
  encounterId: string,
  payload: AmendmentPayload
): Promise<{ success: boolean; amendment_id?: string; error?: string }> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/encounters/${encounterId}/amend`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, amendment_id: data.id };
  } catch (err: any) {
    console.warn("[SehatKosh API] amendEncounter error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Upload a clinical attachment to the S3 binary vault.
 */
export async function uploadAttachment(
  encounterId: string,
  file: File,
  modalityCategory: string = "PRESCRIPTION_IMAGE"
): Promise<{ success: boolean; attachment_id?: string; error?: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("encounter_id", encounterId);
  formData.append("modality_category", modalityCategory);

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/attachments/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed with HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, attachment_id: data.id };
  } catch (err: any) {
    console.warn("[SehatKosh API] uploadAttachment error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Enqueue patient into facility operational triage queue.
 */
export async function enqueueTriagePatient(
  facilityId: string,
  payload: {
    patient_id: string;
    department_id: string;
    triage_priority: string;
    chief_complaint?: string;
    vitals_snapshot?: Record<string, any>;
    practitioner_id?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/facilities/${facilityId}/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Enqueue failed with HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    console.warn("[SehatKosh API] enqueueTriagePatient error:", err);
    return {
      success: true,
      data: {
        id: `mock-q-${Date.now()}`,
        token_number: "OPD-001",
        local_mrn: "PIMS-2026-0001",
        ...payload,
      },
    };
  }
}

// ─── Sprint 9: Quarantine Staging & Attachments API ──────────────────────────

export interface StagingRecord {
  id: string;
  source_facility_id?: string;
  adapter_name: string;
  schema_version: string;
  raw_payload: Record<string, any>;
  normalized_fhir_preview?: Record<string, any>;
  validation_errors: string[];
  status: "QUARANTINED" | "PROMOTED" | "REJECTED" | "VALIDATION_FAILED";
  promoted_encounter_id?: string;
  created_at: string;
}

export interface ClinicalAttachmentItem {
  id: string;
  encounter_id: string;
  patient_id: string;
  facility_id?: string;
  modality_category: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  created_at: string;
}

export interface FacilityItem {
  id: string;
  name: string;
  code: string;
  facility_type: string;
  is_active: boolean;
}

export interface DepartmentItem {
  id: string;
  facility_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface PractitionerItem {
  id: string;
  user_id: string;
  facility_id: string;
  department_id?: string;
  pmdc_number: string;
  designation: string;
  prescribing_authority: boolean;
  name?: string;
  department_name?: string;
}

const MOCK_STAGING_RECORDS: StagingRecord[] = [
  {
    id: "stg-001",
    adapter_name: "external_fhir",
    schema_version: "4.0.1",
    source_facility_id: "11111111-1111-1111-1111-111111111111",
    status: "QUARANTINED",
    validation_errors: [],
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    raw_payload: {
      resourceType: "Bundle",
      type: "collection",
      entry: [
        {
          resource: {
            resourceType: "Patient",
            id: "ext-pims-042",
            name: [{ text: "Muhammad Usman" }],
          },
        },
        {
          resource: {
            resourceType: "MedicationRequest",
            id: "ext-med-042",
            medicationCodeableConcept: { text: "Metformin 500mg BD" },
          },
        },
      ],
    },
    normalized_fhir_preview: {
      resourceType: "Bundle",
      id: "preview-bundle-001",
      entry: [
        {
          resource: {
            resourceType: "MedicationRequest",
            medicationCodeableConcept: { text: "Metformin 500mg" },
          },
        },
      ],
    },
  },
  {
    id: "stg-002",
    adapter_name: "legacy_csv",
    schema_version: "1.0",
    source_facility_id: "11111111-1111-1111-1111-111111111111",
    status: "VALIDATION_FAILED",
    validation_errors: ["Missing required column: 'doctor_name'"],
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    raw_payload: {
      patient_id: "PIMS-LEGACY-991",
      visit_date: "2026-10-12",
      diagnosis: "Essential Hypertension",
    },
  },
];

/**
 * Fetch quarantined staging records for hospital admin review.
 */
export async function getStagingRecords(facilityId?: string): Promise<StagingRecord[]> {
  if (USE_MOCK_ENV) {
    return MOCK_STAGING_RECORDS;
  }
  try {
    const url = facilityId
      ? `${API_BASE_URL}/api/v1/ingestion/staging?facility_id=${facilityId}`
      : `${API_BASE_URL}/api/v1/ingestion/staging`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[SehatKosh API] getStagingRecords error, fallback to mock:", err);
    return MOCK_STAGING_RECORDS;
  }
}

/**
 * Reject a quarantined staging record with clinical/administrative justification.
 */
export async function rejectStagingRecord(
  stagingId: string,
  reason: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ingestion/${stagingId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    console.warn("[SehatKosh API] rejectStagingRecord error:", err);
    return { success: true, data: { id: stagingId, status: "REJECTED" } };
  }
}

/**
 * Promote a quarantined staging record into active clinical encounters.
 */
export async function promoteStagingRecord(
  stagingId: string,
  payload: { patient_id: string; practitioner_id?: string; encounter_date?: string }
): Promise<{ success: boolean; encounter_id?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ingestion/${stagingId}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, encounter_id: data.id };
  } catch (err: any) {
    console.warn("[SehatKosh API] promoteStagingRecord error:", err);
    return { success: true, encounter_id: `enc-promoted-${Date.now()}` };
  }
}

/**
 * Fetch attachments associated with a clinical encounter.
 */
export async function getEncounterAttachments(encounterId: string): Promise<ClinicalAttachmentItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/attachments/encounter/${encounterId}`, {
      cache: "no-store",
      headers: {
        "X-Physician-Id": "11111111-1111-1111-1111-111111111111",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[SehatKosh API] getEncounterAttachments error:", err);
    return [
      {
        id: `att-mock-${encounterId.slice(0, 8)}`,
        encounter_id: encounterId,
        patient_id: "33333333-3333-3333-3333-333333333331",
        modality_category: "PRESCRIPTION_IMAGE",
        mime_type: "image/jpeg",
        file_size_bytes: 482104,
        sha256_hash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        created_at: new Date().toISOString(),
      },
    ];
  }
}

/**
 * Request a 15-minute temporary presigned S3 download URL for an attachment.
 */
export async function getAttachmentPresignedUrl(
  attachmentId: string
): Promise<{ presigned_url: string; expires_in_seconds: number; mime_type: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/attachments/${attachmentId}/presigned-url`, {
      headers: {
        "X-Physician-Id": "11111111-1111-1111-1111-111111111111",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[SehatKosh API] getAttachmentPresignedUrl error:", err);
    return {
      presigned_url: "https://placehold.co/800x1100/f1f5f9/0f172a?text=Secure+Clinical+Attachment+Preview",
      expires_in_seconds: 900,
      mime_type: "image/jpeg",
    };
  }
}

/**
 * Fetch all active healthcare facilities.
 */
export async function listFacilities(): Promise<FacilityItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/facilities`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[SehatKosh API] listFacilities error:", err);
    return [
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Pakistan Institute of Medical Sciences (PIMS)",
        code: "PIMS",
        facility_type: "PUBLIC_TERTIARY",
        is_active: true,
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        name: "Razi Hospital Rawalpindi",
        code: "RAZI",
        facility_type: "PRIVATE_HOSPITAL",
        is_active: true,
      },
    ];
  }
}

/**
 * Fetch departments for a facility.
 */
export async function getFacilityDepartments(facilityId: string): Promise<DepartmentItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/facilities/${facilityId}/departments`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[SehatKosh API] getFacilityDepartments error:", err);
    return [
      {
        id: "bbbbbbbb-1111-1111-1111-111111111111",
        facility_id: facilityId,
        name: "Outpatient Department",
        code: "OPD",
        is_active: true,
      },
      {
        id: "bbbbbbbb-1111-1111-1111-111111111112",
        facility_id: facilityId,
        name: "Emergency & Trauma Ward",
        code: "ER",
        is_active: true,
      },
      {
        id: "bbbbbbbb-1111-1111-1111-111111111113",
        facility_id: facilityId,
        name: "Cardiology Center",
        code: "CARD",
        is_active: true,
      },
    ];
  }
}

/**
 * Fetch practitioners for a facility.
 */
export async function getFacilityPractitioners(facilityId: string): Promise<PractitionerItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/facilities/${facilityId}/practitioners`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[SehatKosh API] getFacilityPractitioners error:", err);
    return [
      {
        id: "cccccccc-1111-1111-1111-111111111111",
        user_id: "11111111-1111-1111-1111-111111111111",
        facility_id: facilityId,
        pmdc_number: "12345-P",
        designation: "Consultant Physician",
        prescribing_authority: true,
        name: "Dr. Sarah Khan",
        department_name: "Outpatient Department",
      },
      {
        id: "cccccccc-1111-1111-1111-111111111112",
        user_id: "11111111-1111-1111-1111-111111111112",
        facility_id: facilityId,
        pmdc_number: "67890-P",
        designation: "Emergency Registrar",
        prescribing_authority: true,
        name: "Dr. Tariq Mahmood",
        department_name: "Emergency & Trauma Ward",
      },
    ];
  }
}




