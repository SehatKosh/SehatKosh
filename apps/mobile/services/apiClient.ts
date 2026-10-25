import { Platform } from "react-native";
import type {
  MedicationRequest,
  VitalSignObservation,
  ExtractionResponse,
  FHIRBundle,
} from "@sehatkosh/types";
import { MOCK_MEDICATIONS, MOCK_VITALS, fetchMockResource } from "@sehatkosh/mock-data";
import {
  MOCK_RECORDS,
  ClinicalEncounter,
  Medication,
  registerLiveEncounter,
  registerLiveEncounters,
} from "./mockRecords";

const USE_MOCK =
  process.env.EXPO_PUBLIC_USE_MOCK_DATA === "true" ||
  (!process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_USE_MOCK_DATA !== "false");

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const DEFAULT_PATIENT_ID =
  process.env.EXPO_PUBLIC_DEFAULT_PATIENT_ID || "33333333-3333-3333-3333-333333333331";

// ─── Custom API Error Class ───────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  detail: string;
  code?: string;

  constructor(message: string, status = 0, detail?: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail || message;
    this.code = code;
  }
}

// ─── Encounter Data Payloads ──────────────────────────────────────────────────

export interface CreateEncounterPayload {
  patient_id: string;
  physician_name: string;
  facility_name: string;
  encounter_date: string; // YYYY-MM-DD
  soap_notes?: Record<string, unknown> | null;
  fhir_bundle: FHIRBundle | Record<string, unknown>;
  document_s3_key?: string | null;
}

export interface EncounterResponse {
  id: string;
  patient_id: string;
  physician_name: string;
  facility_name: string;
  encounter_date: string;
  soap_notes?: Record<string, string> | null;
  fhir_bundle: FHIRBundle;
  document_s3_key?: string | null;
  created_at: string;
}

export type ClinicalSession = {
  id: string;
  doctor: string;
  date: string;
  summary: string;
};

const MOCK_SESSIONS: ClinicalSession[] = [
  {
    id: "medrx-001",
    doctor: "Dr. Tariq Khan",
    date: "Aug 30, 2026",
    summary: "Follow-up consultation with updated medication instructions.",
  },
];

export const listSessions = async (): Promise<ClinicalSession[]> => MOCK_SESSIONS;

// ─── Mock Extraction Fixture ──────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];
const NOW_UTC = new Date().toISOString();

const MOCK_EXTRACTION_RESPONSE: ExtractionResponse = {
  status: "success",
  data: {
    raw_ocr: {
      doctor_name: "Dr. Tariq Khan",
      clinic: "Shifa International Hospital",
      date: TODAY,
      raw_text: "Amoxicillin 500mg TDS x7d / Paracetamol 500mg PRN x3d",
    },
    fhir_bundle: {
      resourceType: "Bundle",
      id: "mock-mobile-bundle-001",
      type: "collection",
      timestamp: NOW_UTC,
      entry: [
        {
          fullUrl: `urn:uuid:patient-${DEFAULT_PATIENT_ID}`,
          resource: {
            resourceType: "Patient",
            id: DEFAULT_PATIENT_ID,
            name: [{ text: "Ali Raza", use: "official" }],
          },
        },
        {
          fullUrl: "urn:uuid:medrx-mobile-001",
          resource: {
            resourceType: "MedicationRequest",
            id: "medrx-mobile-001",
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
            subject: { reference: `urn:uuid:patient-${DEFAULT_PATIENT_ID}` },
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
          fullUrl: "urn:uuid:medrx-mobile-002",
          resource: {
            resourceType: "MedicationRequest",
            id: "medrx-mobile-002",
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
            subject: { reference: `urn:uuid:patient-${DEFAULT_PATIENT_ID}` },
            authoredOn: TODAY,
            dosageInstruction: [
              {
                text: "500mg — As needed — 3 days",
              },
            ],
          },
        },
      ],
    },
    metadata: {
      medications_detected: 2,
      unmapped_codes_count: 0,
      is_fallback: false,
    },
  },
};

// ─── Format & Mapping Utilities ───────────────────────────────────────────────

function formatReadableDate(isoDateStr: string): string {
  try {
    const d = new Date(isoDateStr);
    if (isNaN(d.getTime())) return isoDateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return isoDateStr;
  }
}

/**
 * Maps a relational EncounterResponse from PostgreSQL into the mobile UI's ClinicalEncounter format.
 */
export function mapEncounterToClinicalEncounter(enc: EncounterResponse): ClinicalEncounter {
  const medications: Medication[] = [];

  if (enc.fhir_bundle?.entry && Array.isArray(enc.fhir_bundle.entry)) {
    for (const entry of enc.fhir_bundle.entry) {
      const res = entry.resource as unknown as Record<string, unknown>;
      if (res && res.resourceType === "MedicationRequest") {
        const medConcept = res.medicationCodeableConcept as Record<string, unknown> | undefined;
        const medName = (medConcept?.text as string) || "Prescribed Medication";
        const dosageList = res.dosageInstruction as Array<{ text?: string }> | undefined;
        const dosageText = dosageList?.[0]?.text ?? "";
        const parts = dosageText.split(" — ");

        medications.push({
          name: medName,
          form: "Prescription",
          strength: parts[0] || "Standard",
          frequency: parts[1] || "As directed",
          duration: parts[2] || "Completed course",
        });
      }
    }
  }

  const soap = enc.soap_notes || {};
  const summary =
    soap.assessment ||
    soap.plan ||
    (medications.length > 0
      ? `Prescription with ${medications.length} verified medication${medications.length > 1 ? "s" : ""}: ${medications.map((m) => m.name).join(", ")}`
      : "Verified clinical encounter record.");

  const tags: { label: string; color: "sky" | "emerald" | "amber" | "violet" }[] = [];
  if (medications.length > 0) {
    tags.push({
      label: `Prescription: ${medications.length} drug${medications.length > 1 ? "s" : ""}`,
      color: "sky",
    });
  }
  tags.push({ label: "PostgreSQL Sync", color: "emerald" });
  if (enc.document_s3_key) {
    tags.push({ label: "Document attached", color: "violet" });
  }

  return {
    id: enc.id,
    doctor: enc.physician_name,
    specialty: "General Practice",
    facility: enc.facility_name,
    date: formatReadableDate(enc.encounter_date),
    dateISO: enc.encounter_date,
    encounterType: "Clinical Consultation",
    tags,
    summary,
    soap: {
      subjective: soap.subjective || "Patient consultation records.",
      objective: soap.objective || "Vitals and examination findings recorded.",
      assessment: soap.assessment || "Clinical assessment completed.",
      plan: soap.plan || "Medications and care instructions issued.",
    },
    medications,
    attachedDocument: Boolean(enc.document_s3_key),
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const getMedications = async (): Promise<MedicationRequest[]> => {
  if (USE_MOCK) {
    return fetchMockResource(MOCK_MEDICATIONS);
  }
  const response = await fetch(`${BASE_URL}/prescriptions`);
  if (!response.ok) throw new Error("Failed to fetch prescriptions");
  return response.json();
};

export const getVitals = async (): Promise<VitalSignObservation[]> => {
  if (USE_MOCK) {
    return fetchMockResource(MOCK_VITALS);
  }
  const response = await fetch(`${BASE_URL}/vitals`);
  if (!response.ok) throw new Error("Failed to fetch vitals");
  return response.json();
};

/**
 * Upload a captured prescription image URI to POST /api/v1/prescriptions/extract.
 * Packages native FormData and handles timeouts, rate limits, and security errors.
 */
export const extractPrescription = async (imageUri: string): Promise<ExtractionResponse> => {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return MOCK_EXTRACTION_RESPONSE;
  }

  const formData = new FormData();
  const filename = imageUri.split("/").pop() || "prescription.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : "jpg";
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  formData.append("file", {
    uri: Platform.OS === "ios" ? imageUri.replace("file://", "") : imageUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${BASE_URL}/prescriptions/extract`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `Extraction failed with HTTP ${response.status}`;
      let errorCode: string | undefined;

      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errorDetail;
        errorCode = errJson.code;
      } catch {
        const text = await response.text().catch(() => "");
        if (text) errorDetail = text;
      }

      if (response.status === 413) {
        errorDetail = "Payload Too Large: The document image exceeds the 10MB limit. Please retake the photo with standard resolution.";
      } else if (response.status === 400 && errorDetail.toLowerCase().includes("image file format")) {
        errorDetail = "Invalid Format: The uploaded file signature was rejected. Please ensure you are photographing a clear document.";
      } else if (response.status === 429) {
        errorDetail = "Rate Limit Exceeded: Too many requests. Please wait a moment before trying again.";
      }

      throw new ApiError(errorDetail, response.status, errorDetail, errorCode);
    }

    const data: ExtractionResponse = await response.json();
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    if ((err as Error)?.name === "AbortError") {
      throw new ApiError("Network Timeout: Document processing timed out after 30 seconds.", 408);
    }
    // Transparently fall back to mock data if offline and mock is enabled
    if (USE_MOCK) {
      console.warn("[apiClient] Network unreachable, falling back to mock extraction response");
      return MOCK_EXTRACTION_RESPONSE;
    }
    throw new ApiError(
      (err as Error)?.message || "Network Error: Could not connect to SehatKosh server.",
      0
    );
  }
};

/**
 * Persists a finalized clinical encounter and its FHIR bundle to POST /api/v1/encounters.
 */
export const saveEncounter = async (payload: CreateEncounterPayload): Promise<EncounterResponse> => {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const mockSaved: EncounterResponse = {
      id: `enc-mock-${Date.now()}`,
      patient_id: payload.patient_id,
      physician_name: payload.physician_name,
      facility_name: payload.facility_name,
      encounter_date: payload.encounter_date,
      soap_notes: payload.soap_notes as Record<string, string>,
      fhir_bundle: payload.fhir_bundle as FHIRBundle,
      document_s3_key: payload.document_s3_key,
      created_at: new Date().toISOString(),
    };
    const clinical = mapEncounterToClinicalEncounter(mockSaved);
    registerLiveEncounter(clinical);
    return mockSaved;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}/encounters`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `Failed to save encounter (HTTP ${response.status})`;
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errorDetail;
      } catch {
        const text = await response.text().catch(() => "");
        if (text) errorDetail = text;
      }
      throw new ApiError(errorDetail, response.status, errorDetail);
    }

    const saved: EncounterResponse = await response.json();
    const clinical = mapEncounterToClinicalEncounter(saved);
    registerLiveEncounter(clinical);
    return saved;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if ((err as Error)?.name === "AbortError") {
      throw new ApiError("Network Timeout: Save encounter request timed out.", 408);
    }
    throw new ApiError(
      (err as Error)?.message || "Failed to persist clinical encounter to database.",
      0
    );
  }
};

/**
 * Fetches clinical encounters for a patient from GET /api/v1/encounters/patient/{patientId}.
 * Maps the relational response to mobile ClinicalEncounter cards and registers them into the live cache.
 */
export const getPatientEncounters = async (
  patientId: string = DEFAULT_PATIENT_ID
): Promise<ClinicalEncounter[]> => {
  if (USE_MOCK) {
    return MOCK_RECORDS;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}/encounters/patient/${patientId}`, {
      headers: {
        "X-Patient-Id": patientId,
        "X-Physician-Id": "11111111-1111-1111-1111-111111111111", // Seeded physician with active consent
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `Failed to fetch patient encounters (HTTP ${response.status})`;
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errorDetail;
      } catch {
        const text = await response.text().catch(() => "");
        if (text) errorDetail = text;
      }
      throw new ApiError(errorDetail, response.status, errorDetail);
    }

    const data: EncounterResponse[] = await response.json();
    const mapped = data.map(mapEncounterToClinicalEncounter);
    registerLiveEncounters(mapped);
    return mapped;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if ((err as Error)?.name === "AbortError") {
      throw new ApiError("Network Timeout: Patient encounter request timed out.", 408);
    }
    console.warn("[apiClient] getPatientEncounters failed, falling back to mock records:", err);
    return MOCK_RECORDS;
  }
};
