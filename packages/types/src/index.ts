export interface Coding {
  system: string;
  code: string;
  display: string;
}

export interface CodeableConcept {
  coding: Coding[];
  text: string;
}

export interface MedicationRequest {
  resourceType: "MedicationRequest";
  id: string;
  status: "active" | "completed" | "cancelled" | "draft";
  intent: "order" | "proposal" | "plan";
  medicationCodeableConcept: CodeableConcept;
  subject: {
    reference: string;
    display: string;
  };
  authoredOn: string;
  dosageInstruction: Array<{
    text: string;
    timing?: {
      repeat?: {
        frequency: number;
        period: number;
        periodUnit: "d" | "wk" | "mo";
      };
    };
  }>;
}

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
