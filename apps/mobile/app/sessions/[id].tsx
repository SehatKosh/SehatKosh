import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  FileCode2,
  FileText,
  Stethoscope,
  Pill,
  ClipboardList,
  Heart,
  Microscope,
} from "lucide-react-native";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getEncounterById } from "../../services/mockRecords";

// ── SOAP section label → icon mapping ──────────────────────────────────────
const SOAP_CONFIG = [
  {
    key: "subjective" as const,
    code: "S",
    label: "Subjective",
    sublabel: "Chief Complaints & Symptoms",
    color: "text-sky-700 bg-sky-50 border-sky-200",
    codeColor: "bg-sky-600",
    icon: <Stethoscope size={16} color="#0284C7" />,
  },
  {
    key: "objective" as const,
    code: "O",
    label: "Objective",
    sublabel: "Vitals & Clinical Observations",
    color: "text-violet-700 bg-violet-50 border-violet-200",
    codeColor: "bg-violet-600",
    icon: <Heart size={16} color="#7C3AED" />,
  },
  {
    key: "assessment" as const,
    code: "A",
    label: "Assessment",
    sublabel: "Diagnosis (ICD-10)",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    codeColor: "bg-amber-500",
    icon: <Microscope size={16} color="#D97706" />,
  },
  {
    key: "plan" as const,
    code: "P",
    label: "Plan",
    sublabel: "Treatment & Follow-up Instructions",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    codeColor: "bg-emerald-600",
    icon: <ClipboardList size={16} color="#059669" />,
  },
] as const;

// ── Encounter type badge color ──────────────────────────────────────────────
const ENCOUNTER_BADGE: Record<string, string> = {
  "Follow-up Consultation": "bg-sky-100 text-sky-700",
  "Acute Consultation": "bg-red-100 text-red-700",
  "Routine Health Checkup": "bg-emerald-100 text-emerald-700",
  "Specialist Consultation": "bg-violet-100 text-violet-700",
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 16) + 8;

  const encounter = getEncounterById(id);

  // ── 404 fallback ────────────────────────────────────────────────────────
  if (!encounter) {
    return (
      <View
        className="flex-1 items-center justify-center bg-slate-50 px-8"
        style={{ paddingTop: topPadding }}
      >
        <Text className="text-center text-lg font-bold text-slate-700">
          Record not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-sky-600 px-6 py-3"
        >
          <Text className="font-bold text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badgeStyle =
    ENCOUNTER_BADGE[encounter.encounterType] ?? "bg-slate-100 text-slate-700";

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{
        paddingTop: topPadding,
        paddingHorizontal: 20,
        paddingBottom: Math.max(insets.bottom, 16) + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Back Button ─────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-white border border-slate-200"
      >
        <ArrowLeft color="#475569" size={22} />
      </TouchableOpacity>

      {/* ── Encounter Header ─────────────────────────────── */}
      <View className={`self-start rounded-full px-3 py-1 mb-3 ${badgeStyle}`}>
        <Text className="text-xs font-bold">{encounter.encounterType}</Text>
      </View>
      <Text className="text-3xl font-bold text-slate-900">
        {encounter.doctor}
      </Text>
      <Text className="mt-1 text-sm text-slate-500">
        {encounter.facility} · {encounter.specialty}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-400">{encounter.date}</Text>

      {/* ── SOAP Note Card ───────────────────────────────── */}
      <View className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <View className="px-5 py-4 border-b border-slate-100">
          <Text className="text-base font-bold text-slate-900">
            Clinical SOAP Record
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            Structured clinical note from this encounter
          </Text>
        </View>

        {SOAP_CONFIG.map((section, idx) => (
          <View
            key={section.key}
            className={`px-5 py-4 ${
              idx < SOAP_CONFIG.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <View className="flex-row items-center gap-2 mb-2">
              <View
                className={`h-6 w-6 rounded-full items-center justify-center ${section.codeColor}`}
              >
                <Text className="text-xs font-black text-white">
                  {section.code}
                </Text>
              </View>
              <View>
                <Text className="text-sm font-bold text-slate-900">
                  {section.label}
                </Text>
                <Text className="text-xs text-slate-400">
                  {section.sublabel}
                </Text>
              </View>
            </View>
            <Text className="text-sm leading-6 text-slate-700">
              {encounter.soap[section.key]}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Prescribed Medications ───────────────────────── */}
      {encounter.medications.length > 0 && (
        <>
          <Text className="mb-3 mt-7 text-lg font-bold text-slate-900">
            Prescribed Medications
          </Text>
          {encounter.medications.map((med, idx) => (
            <View
              key={`${med.name}-${idx}`}
              className="mb-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="h-10 w-10 rounded-xl bg-sky-50 items-center justify-center">
                    <Pill size={18} color="#0284C7" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">
                      {med.name}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {med.form} · {med.strength}
                    </Text>
                  </View>
                </View>
              </View>
              <View className="mt-3 gap-1.5">
                <View className="flex-row items-center gap-2">
                  <Text className="w-20 text-xs font-semibold text-slate-500">
                    Frequency
                  </Text>
                  <Text className="flex-1 text-sm text-slate-800">
                    {med.frequency}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="w-20 text-xs font-semibold text-slate-500">
                    Duration
                  </Text>
                  <Text className="flex-1 text-sm text-slate-800">
                    {med.duration}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </>
      )}

      {/* ── Attached Document ────────────────────────────── */}
      {encounter.attachedDocument && (
        <>
          <Text className="mb-3 mt-7 text-lg font-bold text-slate-900">
            Attached Document
          </Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Document Preview",
                "Tap to view the full-size scanned document."
              )
            }
            className="flex-row items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
            activeOpacity={0.7}
          >
            <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <FileText size={22} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-emerald-900">
                Prescription / Report Scan
              </Text>
              <Text className="mt-0.5 text-xs text-emerald-700">
                Tap to preview · Pinch to zoom
              </Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      {/* ── HL7 FHIR Export Button ───────────────────────── */}
      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            "Export HL7 FHIR Standard",
            `Preparing encounter ${id} as an HL7 FHIR R4 JSON bundle compatible with hospital EHR systems.`,
            [{ text: "Cancel" }, { text: "Export & Share" }]
          )
        }
        className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-4"
        activeOpacity={0.7}
      >
        <FileCode2 size={18} color="#0284C7" />
        <Text className="font-bold text-sky-700">
          Export HL7 FHIR Standard (JSON)
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
