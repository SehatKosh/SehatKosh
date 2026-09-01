import { MedicationRequest, VitalSignObservation, DoctorAccessConsent } from "@sehatkosh/types";

export const MOCK_MEDICATIONS: MedicationRequest[] = [
  {
    resourceType: "MedicationRequest",
    id: "medrx-001",
    status: "active",
    intent: "order",
    medicationCodeableConcept: {
      coding: [{ system: "http://snomed.info/sct", code: "376255008", display: "Amoxicillin 500mg capsule" }],
      text: "Amoxicillin 500mg",
    },
    subject: { reference: "Patient/pat-001", display: "Muhammad Ahsan" },
    authoredOn: "2026-08-30",
    dosageInstruction: [{ text: "1 capsule 3 times daily after meals" }],
  },
  {
    resourceType: "MedicationRequest",
    id: "medrx-002",
    status: "active",
    intent: "order",
    medicationCodeableConcept: {
      coding: [{ system: "http://snomed.info/sct", code: "322241003", display: "Panadol 500mg tablet" }],
      text: "Panadol (Paracetamol 500mg)",
    },
    subject: { reference: "Patient/pat-001", display: "Muhammad Ahsan" },
    authoredOn: "2026-08-28",
    dosageInstruction: [{ text: "1-2 tablets every 6 hours as needed for pain" }],
  },
];

export const MOCK_VITALS: VitalSignObservation[] = [
  {
    resourceType: "Observation",
    id: "obs-001",
    status: "final",
    category: "vital-signs",
    code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }], text: "Heart Rate" },
    valueQuantity: { value: 72, unit: "beats/min", system: "http://unitsofmeasure.org", code: "/min" },
    effectiveDateTime: "2026-08-31T08:30:00Z",
  },
  {
    resourceType: "Observation",
    id: "obs-002",
    status: "final",
    category: "vital-signs",
    code: { coding: [{ system: "http://loinc.org", code: "2708-6", display: "Oxygen saturation" }], text: "SpO2" },
    valueQuantity: { value: 98, unit: "%", system: "http://unitsofmeasure.org", code: "%" },
    effectiveDateTime: "2026-08-31T08:30:00Z",
  },
];

export const MOCK_CONSENTS: DoctorAccessConsent[] = [
  {
    id: "cst-001",
    doctorId: "doc-101",
    doctorName: "Dr. Tariq Khan",
    specialty: "Internal Medicine",
    hospital: "Shifa International Hospital",
    status: "active",
    grantedAt: "2026-08-15T10:00:00Z",
    expiresAt: "2026-09-15T10:00:00Z",
  },
];

export const fetchMockResource = async <T>(data: T, delayMs: number = 350): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
};
