import { useQuery } from "@tanstack/react-query";
import {
  getPatientById,
  getEncountersByPatientId,
  getInteractionsByPatientId,
  fetchWithDelay,
  type Patient,
  type Encounter,
  type DrugInteraction,
} from "@/lib/mockData";

interface PatientDossier {
  patient: Patient;
  encounters: Encounter[];
  interactions: DrugInteraction[];
}

export function usePatient(patientId: string) {
  return useQuery<PatientDossier, Error>({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const patient = getPatientById(patientId);
      if (!patient) {
        throw new Error(`Patient ${patientId} not found`);
      }
      const encounters = getEncountersByPatientId(patientId);
      const interactions = getInteractionsByPatientId(patientId);
      return fetchWithDelay({ patient, encounters, interactions }, 350);
    },
    staleTime: 5 * 60 * 1000, // 5-minute cache as per spec
    enabled: Boolean(patientId),
    retry: false,
  });
}
