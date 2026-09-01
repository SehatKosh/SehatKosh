import { View, Text } from "react-native";

export default function RecordsScreen() {
  return (
    <View className="flex-1 bg-slate-50 p-6 pt-14">
      <Text className="text-2xl font-bold text-slate-900">FHIR Records</Text>
      <Text className="text-slate-500 mt-2">Patient history and structured medication records will appear here.</Text>
    </View>
  );
}
