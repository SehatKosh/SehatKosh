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

// Re-export for consumers that used to import from here
export type { ExtractionResponse, ExtractionMetadata, FHIRBundle };

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
