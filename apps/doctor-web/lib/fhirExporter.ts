import type { Encounter, Patient, SoapNote } from "./mockData";

export interface FhirCoding {
  system: string;
  code: string;
  display: string;
}

export interface FhirBundle {
  resourceType: "Bundle";
  type: "document";
  timestamp: string;
  entry: Array<{ resource: Record<string, unknown> }>;
}

function buildPatientResource(patient: Patient) {
  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: [{ value: patient.medicalId }],
    name: [{ text: patient.name }],
    gender: patient.gender.toLowerCase(),
    telecom: [{ system: "phone", value: patient.phone }],
  };
}

function buildCompositionResource(patient: Patient, encounter: Encounter, soap: SoapNote) {
  return {
    resourceType: "Composition",
    id: `comp-${encounter.id}`,
    status: "final",
    type: {
      coding: [{ system: "http://loinc.org", code: "11488-4", display: "Consult note" }],
    },
    subject: { reference: `Patient/${patient.id}`, display: patient.name },
    date: encounter.date,
    author: [{ display: encounter.physician }],
    title: `Clinical Encounter — ${soap.assessment.primaryDiagnosis}`,
    section: [
      { title: "Subjective", text: { status: "generated", div: soap.subjective.chiefComplaints } },
      { title: "Objective", text: { status: "generated", div: soap.objective.observations } },
      { title: "Assessment", text: { status: "generated", div: soap.assessment.primaryDiagnosis } },
      { title: "Plan", text: { status: "generated", div: soap.plan.instructions } },
    ],
  };
}

function buildConditionResource(patient: Patient, encounter: Encounter, soap: SoapNote) {
  return {
    resourceType: "Condition",
    id: `cond-${encounter.id}`,
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
    code: {
      coding: [
        { system: "http://hl7.org/fhir/sid/icd-10", code: soap.assessment.icd10Code, display: soap.assessment.icd10Display },
        { system: "http://snomed.info/sct", code: soap.assessment.snomedCode, display: soap.assessment.snomedDisplay },
      ],
      text: soap.assessment.primaryDiagnosis,
    },
    subject: { reference: `Patient/${patient.id}` },
    recordedDate: encounter.date,
  };
}

function buildMedicationRequestResources(patient: Patient, encounter: Encounter, soap: SoapNote) {
  return soap.plan.medications.map((med, idx) => ({
    resourceType: "MedicationRequest",
    id: `medrx-${encounter.id}-${idx}`,
    status: "active",
    intent: "order",
    medicationCodeableConcept: { text: `${med.name} ${med.strength} ${med.form}` },
    subject: { reference: `Patient/${patient.id}` },
    authoredOn: encounter.date.split("T")[0],
    dosageInstruction: [{ text: `${med.frequency} for ${med.duration}` }],
  }));
}

/**
 * Converts a patient encounter with a SOAP note into a valid FHIR R4 Bundle
 * and triggers a browser download.
 */
export function exportAsFhirBundle(patient: Patient, encounter: Encounter): void {
  if (!encounter.soap) {
    console.warn("No SOAP note available for FHIR export");
    return;
  }

  const soap = encounter.soap;

  const bundle: FhirBundle = {
    resourceType: "Bundle",
    type: "document",
    timestamp: new Date().toISOString(),
    entry: [
      { resource: buildPatientResource(patient) as Record<string, unknown> },
      { resource: buildCompositionResource(patient, encounter, soap) as Record<string, unknown> },
      { resource: buildConditionResource(patient, encounter, soap) as Record<string, unknown> },
      ...buildMedicationRequestResources(patient, encounter, soap).map((r) => ({
        resource: r as Record<string, unknown>,
      })),
    ],
  };

  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: "application/fhir+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fhir-bundle-${patient.medicalId}-${encounter.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
