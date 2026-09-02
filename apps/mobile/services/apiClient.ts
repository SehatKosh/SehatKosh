import { MedicationRequest, VitalSignObservation } from "@sehatkosh/types";
import { MOCK_MEDICATIONS, MOCK_VITALS, fetchMockResource } from "@sehatkosh/mock-data";

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK_DATA !== "false";
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
