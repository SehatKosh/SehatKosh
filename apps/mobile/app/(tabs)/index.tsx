import { View, Text, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getVitals } from "../../services/apiClient";
import { Heart, Activity } from "lucide-react-native";

export default function VitalsScreen() {
  const { data: vitals, isLoading } = useQuery({
    queryKey: ["vitals"],
    queryFn: getVitals,
  });

  return (
    <ScrollView className="flex-1 bg-slate-50 p-6 pt-14">
      <Text className="text-2xl font-bold text-slate-900">Health Telemetry</Text>
      <Text className="text-slate-500 mb-6">Continuous Baseline Monitoring</Text>

      {isLoading ? (
        <Text className="text-slate-500">Syncing telemetry data...</Text>
      ) : (
        <View className="gap-4">
          {vitals?.map((vital) => (
            <View key={vital.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-row items-center justify-between">
              <View className="flex-row items-center gap-4">
                <View className="bg-blue-50 p-3 rounded-xl">
                  {vital.code.text === "Heart Rate" ? (
                    <Heart size={24} color="#2563eb" />
                  ) : (
                    <Activity size={24} color="#2563eb" />
                  )}
                </View>
                <View>
                  <Text className="text-base font-semibold text-slate-800">{vital.code.text}</Text>
                  <Text className="text-xs text-slate-400">{new Date(vital.effectiveDateTime).toLocaleTimeString()}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-2xl font-bold text-slate-900">{vital.valueQuantity.value}</Text>
                <Text className="text-xs font-medium text-slate-500">{vital.valueQuantity.unit}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
