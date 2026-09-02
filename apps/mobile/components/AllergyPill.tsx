import { Text, View } from "react-native";

export function AllergyPill({ name, severity }: { name: string; severity: string }) { const severe = severity.toLowerCase().includes("severe"); return <View className={`rounded-full px-4 py-3 ${severe ? "bg-red-50" : "bg-amber-50"}`}><Text className={`text-sm font-semibold ${severe ? "text-red-700" : "text-amber-700"}`}>{name} · {severity}</Text></View>; }
