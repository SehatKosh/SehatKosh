// ─── FHIR R4 Primitives ──────────────────────────────────────────────────────

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface CodeableConcept {
  coding: Coding[];
  text: string;
}

export interface Repeat {
  frequency?: number;
  period?: number;
  periodUnit?: "d" | "wk" | "mo" | "h";
}

export interface Timing {
  repeat?: Repeat;
  code?: CodeableConcept;
}

export interface DosageInstruction {
  text: string;
  timing?: Timing;
}

export interface Reference {
  reference: string;
  display?: string;
}

// ─── FHIR R4 Resources ───────────────────────────────────────────────────────

export interface MedicationRequest {
  resourceType: "MedicationRequest";
  id: string;
  /** active | completed | cancelled | draft | unknown */
  status: "active" | "completed" | "cancelled" | "draft" | "unknown";
  intent: "order" | "proposal" | "plan";
  medicationCodeableConcept: CodeableConcept;
  subject: Reference;
  authoredOn?: string;
  dosageInstruction: DosageInstruction[];
}

export interface PatientName {
  text: string;
  use?: string;
}

export interface Patient {
  resourceType: "Patient";
  id: string;
  name: PatientName[];
}

export interface PractitionerName {
  text: string;
  use?: string;
}

export interface Practitioner {
  resourceType: "Practitioner";
  id: string;
  name: PractitionerName[];
}

// ─── FHIR R4 Bundle ──────────────────────────────────────────────────────────

export interface FHIRBundleEntry {
  fullUrl: string;
  resource: MedicationRequest | Patient | Practitioner | Record<string, unknown>;
}

export interface FHIRBundle {
  resourceType: "Bundle";
  id: string;
  type: "collection" | "transaction" | "document";
  timestamp: string;
  entry: FHIRBundleEntry[];
}

// ─── Extraction API Envelope ─────────────────────────────────────────────────

export interface ExtractionMetadata {
  /** Number of MedicationRequest entries in the FHIR bundle */
  medications_detected: number;
  /** Medications without a known SNOMED-CT code (shown as coding=[]) */
  unmapped_codes_count: number;
  /** true when the normalizer fell back to raw-text or heuristic parsing */
  is_fallback: boolean;
}

/**
 * Response envelope emitted by POST /api/v1/prescriptions/extract.
 *
 * {
 *   status: "success",
 *   data: {
 *     raw_ocr: { ... },
 *     fhir_bundle: { resourceType: "Bundle", ... },
 *     metadata: { medications_detected, unmapped_codes_count, is_fallback }
 *   }
 * }
 */
export interface ExtractionResponse {
  status: "success" | "error";
  data: {
    raw_ocr: Record<string, unknown>;
    fhir_bundle: FHIRBundle;
    metadata: ExtractionMetadata;
  };
}

// ─── Vital Signs ─────────────────────────────────────────────────────────────

export interface VitalSignObservation {
  resourceType: "Observation";
  id: string;
  status: "final" | "amended";
  category: "vital-signs";
  code: CodeableConcept;
  valueQuantity: {
    value: number;
    unit: string;
    system: "http://unitsofmeasure.org";
    code: string;
  };
  effectiveDateTime: string;
}

// ─── Consent ─────────────────────────────────────────────────────────────────

export interface DoctorAccessConsent {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  status: "active" | "pending" | "revoked";
  grantedAt: string;
  expiresAt: string;
}
