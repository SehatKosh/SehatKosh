import { MedicationRequest, VitalSignObservation, ExtractionResponse } from "@sehatkosh/types";
import { MOCK_MEDICATIONS, MOCK_VITALS, fetchMockResource } from "@sehatkosh/mock-data";

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK_DATA !== "false";
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ─── Mock Extraction Response ─────────────────────────────────────────────────

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
          fullUrl: "urn:uuid:patient-mobile-001",
          resource: {
            resourceType: "Patient",
            id: "patient-mobile-001",
            name: [{ text: "Ahsan Ali", use: "official" }],
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
            subject: { reference: "urn:uuid:patient-mobile-001" },
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
            subject: { reference: "urn:uuid:patient-mobile-001" },
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

// ─── ClinicalSession ──────────────────────────────────────────────────────────

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

// ─── API functions ────────────────────────────────────────────────────────────

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

export const listSessions = async (): Promise<ClinicalSession[]> => MOCK_SESSIONS;

/**
 * Upload a captured prescription image URI and receive a validated FHIR R4 Bundle.
 *
 * When EXPO_PUBLIC_USE_MOCK_DATA !== "false", returns deterministic mock data so
 * the app works without a running backend (Expo Go / CI).
 *
 * When live, the imageUri is packaged into FormData and POST-ed to
 * /prescriptions/extract. The backend returns the ExtractionResponse envelope:
 * { status, data: { raw_ocr, fhir_bundle, metadata } }
 */
export const extractPrescription = async (
  imageUri: string
): Promise<ExtractionResponse> => {
  if (USE_MOCK) {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 900));
    return MOCK_EXTRACTION_RESPONSE;
  }

  // Package the local file URI as a multipart upload
  const formData = new FormData();
  // React Native FormData accepts { uri, name, type } objects
  formData.append("file", {
    uri: imageUri,
    name: "prescription.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const response = await fetch(`${BASE_URL}/prescriptions/extract`, {
    method: "POST",
    body: formData,
    headers: {
      // Content-Type is set automatically by fetch when body is FormData
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`extractPrescription failed (${response.status}): ${errText}`);
  }

  const data: ExtractionResponse = await response.json();
  return data;
};
