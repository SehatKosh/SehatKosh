import React, { createContext, useContext, useState } from "react";

export interface PatientRecord {
  id: string;
  fullName: string;
  greetingName: string;
  initials: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  uhid: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  activeMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    timeOfDay?: string;
  }>;
}

export interface PatientTelemetry {
  steps: number;
  stepGoal: number;
  distanceKm: number;
  activeKcal: number;
  kcalGoal: number;
  restingHr: number;
  spo2: number;
  bloodPressure: string;
  sleepDuration: string;
  glucoseMgDl: number;
  medicationsTaken: number;
  medicationsTotal: number;
  medsTaken: number;
  medsTotal: number;
}

export interface PatientContextType {
  patient: PatientRecord;
  telemetry: PatientTelemetry;
  updateTelemetry: (partial: Partial<PatientTelemetry>) => void;
}

export const UNIFIED_PATIENT: PatientRecord = {
  id: "patient-ahsan-01",
  fullName: "Muhammad Ahsan",
  greetingName: "Ahsan",
  initials: "MA",
  age: 22,
  gender: "Male",
  uhid: "SK-2026-0553",
  bloodGroup: "O+",
  allergies: ["Penicillin", "Sulfa Drugs"],
  chronicConditions: [
    "Stage 1 Essential Hypertension (ICD-10: I10)",
    "Reactive Airway Component (Mild)",
  ],
  activeMedications: [
    {
      name: "Atenolol",
      dosage: "50mg",
      frequency: "Once daily",
      timeOfDay: "Morning",
    },
    {
      name: "Salbutamol Inhaler",
      dosage: "100mcg",
      frequency: "2 puffs PRN as needed",
      timeOfDay: "PRN",
    },
  ],
};

export const UNIFIED_TELEMETRY: PatientTelemetry = {
  steps: 6420,
  stepGoal: 8000,
  distanceKm: 4.8,
  activeKcal: 285,
  kcalGoal: 400,
  restingHr: 72,
  spo2: 98,
  bloodPressure: "118/76",
  sleepDuration: "7h 24m",
  glucoseMgDl: 94,
  medicationsTaken: 2,
  medicationsTotal: 2,
  medsTaken: 2,
  medsTotal: 2,
};

const PatientContext = createContext<PatientContextType>({
  patient: UNIFIED_PATIENT,
  telemetry: UNIFIED_TELEMETRY,
  updateTelemetry: () => {},
});

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patient] = useState<PatientRecord>(UNIFIED_PATIENT);
  const [telemetry, setTelemetry] = useState<PatientTelemetry>(UNIFIED_TELEMETRY);

  const updateTelemetry = (partial: Partial<PatientTelemetry>) => {
    setTelemetry((prev) => ({ ...prev, ...partial }));
  };

  return (
    <PatientContext.Provider value={{ patient, telemetry, updateTelemetry }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient(): PatientContextType {
  return useContext(PatientContext);
}
