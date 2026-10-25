import { useQuery } from "@tanstack/react-query";
import { getPatientDossier } from "@/lib/api-client";
import {
  getPatientById,
  getEncountersByPatientId,
  getInteractionsByPatientId,
  type Patient,
  type Encounter,
  type DrugInteraction,
} from "@/lib/mockData";

export interface PatientDossier {
  patient: Patient;
  encounters: Encounter[];
  interactions: DrugInteraction[];
  locked?: boolean;
  reason?: string;
}

export function usePatient(patientId: string, physicianId: string = "dr-001") {
  return useQuery<PatientDossier, Error>({
    queryKey: ["patient", patientId, physicianId],
    queryFn: async () => {
      // Fetch live dossier through API client
      const dossierRes = await getPatientDossier(patientId, physicianId);

      // Fallback base patient object to preserve UI metrics
      const fallbackPatient = getPatientById(patientId) || {
        id: patientId,
        name: dossierRes.patient?.name || "Patient",
        initials: "PT",
        age: dossierRes.patient?.age || 30,
        gender: (dossierRes.patient?.gender === "Female" ? "Female" : "Male") as "Male" | "Female",
        bloodGroup: dossierRes.patient?.blood_group || "O+",
        medicalId: dossierRes.patient?.mrn || `MRN-${patientId.slice(0, 8)}`,
        phone: dossierRes.patient?.phone_masked || "+92 300 0000000",
        allergies: [],
        chronicConditions: [],
        lastEncounterDate: new Date().toISOString().split("T")[0],
        lastEncounterReason: "Clinical Consultation",
        activeDrugCount: 1,
        hasContraindication: false,
        accessStatus: (dossierRes.consent?.status as any) || (dossierRes.locked ? "expired" : "active"),
        accessExpiresAt: dossierRes.consent?.expires_at || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        vitalsStatus: "normal",
        lastHR: 76,
        lastSpO2: 98,
      };

      if (dossierRes.locked) {
        return {
          patient: {
            ...fallbackPatient,
            accessStatus: "expired",
          },
          encounters: [],
          interactions: [],
          locked: true,
          reason: dossierRes.reason || "Consent session expired",
        };
      }

      // If encounters were returned from live backend, map or merge
      const liveEncounters = (dossierRes.encounters && dossierRes.encounters.length > 0)
        ? dossierRes.encounters.map((enc: any, idx: number) => ({
            id: enc.id || `live-enc-${idx}`,
            patientId,
            type: "prescription" as const,
            date: enc.encounter_date || enc.created_at || new Date().toISOString(),
            physician: enc.physician_name || "Treating Physician",
            clinic: enc.facility_name || "Hospital Facility",
            summary: enc.soap_notes?.assessment || "Clinical encounter recorded",
            drugs: enc.fhir_bundle?.entry?.map((e: any) => e.resource?.medicationCodeableConcept?.text).filter(Boolean) || [],
            soap: enc.soap_notes,
          }))
        : getEncountersByPatientId(patientId);

      const interactions = getInteractionsByPatientId(patientId);

      return {
        patient: {
          ...fallbackPatient,
          name: dossierRes.patient?.name || fallbackPatient.name,
          medicalId: dossierRes.patient?.mrn || fallbackPatient.medicalId,
          bloodGroup: dossierRes.patient?.blood_group || fallbackPatient.bloodGroup,
          accessStatus: dossierRes.consent?.status === "active" ? "active" : fallbackPatient.accessStatus,
          accessExpiresAt: dossierRes.consent?.expires_at || fallbackPatient.accessExpiresAt,
        },
        encounters: liveEncounters,
        interactions,
        locked: false,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(patientId),
    retry: false,
  });
}
