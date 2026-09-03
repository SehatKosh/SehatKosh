import { useQuery } from "@tanstack/react-query";
import { MOCK_VITALS_HISTORY, fetchWithDelay, type VitalsPoint } from "@/lib/mockData";

export function usePatientVitals(patientId: string) {
  return useQuery<VitalsPoint[], Error>({
    queryKey: ["patient-vitals", patientId],
    queryFn: async () => {
      const data = MOCK_VITALS_HISTORY[patientId] ?? [];
      return fetchWithDelay(data, 300);
    },
    staleTime: 5 * 60 * 1000, // 5-minute cache
    enabled: Boolean(patientId),
    retry: false,
  });
}
