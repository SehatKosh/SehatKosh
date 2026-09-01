import { View, Text } from "react-native";

export default function ConsentScreen() {
  return (
    <View className="flex-1 bg-slate-50 p-6 pt-14">
      <Text className="text-2xl font-bold text-slate-900">Consent</Text>
      <Text className="text-slate-500 mt-2">Access and sharing preferences for clinicians will be managed here.</Text>
    </View>
  );
}
