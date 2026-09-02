import { useQuery } from "@tanstack/react-query";
import { Activity, Footprints, HeartPulse, Moon, Sparkles, Watch } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { getVitals } from "../../services/apiClient";

const colors = { primary: "#0284C7", text: "#0F172A", secondary: "#475569", muted: "#94A3B8", border: "#E2E8F0" };

function MetricCard({ icon, title, value, unit, footer }: { icon: React.ReactNode; title: string; value: string; unit?: string; footer: React.ReactNode }) {
  return (
    <View className="min-h-[170px] flex-1 rounded-2xl border bg-white p-4" style={{ borderColor: colors.border }}>
      <View className="mb-3 flex-row items-center gap-2">{icon}<Text className="text-xs font-semibold" style={{ color: colors.secondary }}>{title}</Text></View>
      <View className="flex-row items-baseline gap-1"><Text className="text-3xl font-bold" style={{ color: colors.text }}>{value}</Text>{unit ? <Text className="text-xs font-medium" style={{ color: colors.muted }}>{unit}</Text> : null}</View>
      <View className="mt-auto pt-4">{footer}</View>
    </View>
  );
}

export default function ActivityScreen() {
  const { data: vitals, isLoading } = useQuery({ queryKey: ["vitals"], queryFn: getVitals });
  const heartRate = vitals?.find((vital) => vital.code.text === "Heart Rate")?.valueQuantity.value ?? 72;

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 32 }}>
      <View className="mb-6 flex-row items-start justify-between"><View><Text className="text-3xl font-bold" style={{ color: colors.text }}>Hello, Ahsan</Text><Text className="mt-1 text-sm" style={{ color: colors.secondary }}>Wednesday, September 2</Text></View><TouchableOpacity className="flex-row items-center gap-2 rounded-full border bg-white px-3 py-2" style={{ borderColor: "#BBF7D0" }}><View className="h-2 w-2 rounded-full bg-emerald-500" /><Watch size={15} color="#10B981" /><Text className="text-xs font-semibold text-emerald-700">Synced 2m ago</Text></TouchableOpacity></View>
      <View className="mb-5 rounded-2xl border p-5" style={{ backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }}><View className="mb-3 flex-row items-center gap-2"><Sparkles size={17} color="#10B981" /><Text className="text-xs font-bold tracking-wider text-emerald-700">DAILY CLINICAL SUMMARY</Text></View><Text className="mb-2 text-sm leading-5 text-slate-700">Your latest readings are stable and your resting heart rate is within its usual range.</Text><Text className="text-sm leading-5 text-slate-700">Keep hydration steady today and continue your active regimen after meals.</Text><TouchableOpacity className="mt-4 self-end"><Text className="text-sm font-bold text-emerald-700">View Timeline  →</Text></TouchableOpacity></View>
      <Text className="mb-3 text-lg font-bold" style={{ color: colors.text }}>Today&apos;s vitals</Text>
      {isLoading ? <Text className="mb-4 text-sm" style={{ color: colors.muted }}>Syncing wearable data...</Text> : null}
      <View className="mb-6 flex-row gap-3"><MetricCard icon={<HeartPulse size={19} color="#EF4444" />} title="Heart Rate" value={String(heartRate)} unit="BPM" footer={<Text className="text-xs text-emerald-600">Within normal range</Text>} /><MetricCard icon={<Activity size={19} color={colors.primary} />} title="Blood Oxygen" value="98" unit="%" footer={<Text className="text-xs font-semibold text-emerald-600">Optimal</Text>} /></View>
      <View className="mb-6 flex-row gap-3"><MetricCard icon={<Footprints size={19} color={colors.secondary} />} title="Steps" value="6,420" footer={<View><View className="mb-2 h-2 rounded-full bg-slate-100"><View className="h-2 w-2/3 rounded-full bg-sky-600" /></View><Text className="text-xs text-slate-500">64% of 10,000 goal</Text></View>} /><MetricCard icon={<Moon size={19} color="#6366F1" />} title="Sleep" value="7h 24m" footer={<Text className="text-xs text-slate-500">85% deep / REM efficiency</Text>} /></View>
      <Text className="mb-3 text-lg font-bold" style={{ color: colors.text }}>Active regimen today</Text><View className="rounded-2xl border bg-white" style={{ borderColor: colors.border }}>{["08:00 AM  ·  Amoxicillin 500mg", "08:00 PM  ·  Amoxicillin 500mg"].map((dose) => <View key={dose} className="flex-row items-center border-b border-slate-100 px-4 py-4"><View className="mr-3 h-5 w-5 rounded-md border-2 border-slate-300" /><Text className="text-sm font-semibold text-slate-700">{dose}</Text></View>)}</View>
    </ScrollView>
  );
}