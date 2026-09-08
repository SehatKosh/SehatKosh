import { useRef, useState } from "react";
import {
  Plus,
  Search,
  ChevronRight,
  Activity,
  Droplets,
  Ruler,
  Weight,
  ShieldCheck,
  Clock,
} from "lucide-react-native";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import BottomSheet from "@gorhom/bottom-sheet";
import { MOCK_RECORDS, groupByMonth, type ClinicalEncounter } from "../../services/mockRecords";
import { AllergyModal, type Allergy } from "../../components/AllergyModal";

// ── Specialty badge colors ─────────────────────────────────────────────────
const SPECIALTY_COLOR: Record<string, string> = {
  Cardiology: "text-red-700 bg-red-50 border-red-200",
  Pulmonology: "text-sky-700 bg-sky-50 border-sky-200",
  "Internal Medicine": "text-violet-700 bg-violet-50 border-violet-200",
  Dermatology: "text-amber-700 bg-amber-50 border-amber-200",
};

const TAG_COLOR: Record<string, string> = {
  sky: "bg-sky-50 text-sky-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  violet: "bg-violet-50 text-violet-700",
};

// ── Encounter Card ──────────────────────────────────────────────────────────
function EncounterCard({ encounter }: { encounter: ClinicalEncounter }) {
  const specialtyStyle =
    SPECIALTY_COLOR[encounter.specialty] ??
    "text-slate-700 bg-slate-100 border-slate-200";

  return (
    <TouchableOpacity
      onPress={() =>
        router.push({ pathname: "/sessions/[id]", params: { id: encounter.id } })
      }
      activeOpacity={0.75}
      className="mb-3 rounded-2xl border border-slate-200 bg-white p-4"
    >
      {/* Top row */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-slate-900">
            {encounter.doctor}
          </Text>
          <Text className="mt-0.5 text-sm text-slate-500">
            {encounter.facility}
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text className="text-xs text-slate-400">{encounter.date}</Text>
          <View className={`rounded-full border px-2 py-0.5 ${specialtyStyle}`}>
            <Text className="text-xs font-semibold">{encounter.specialty}</Text>
          </View>
        </View>
      </View>

      {/* Tags */}
      <View className="mt-3 flex-row flex-wrap gap-2">
        {encounter.tags.map((tag) => (
          <View
            key={tag.label}
            className={`rounded-full px-3 py-1 ${TAG_COLOR[tag.color]}`}
          >
            <Text className="text-xs font-semibold">{tag.label}</Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <Text className="mt-3 text-sm leading-5 text-slate-600" numberOfLines={2}>
        {encounter.summary}
      </Text>

      {/* Navigate chevron */}
      <View className="mt-3 flex-row items-center justify-end">
        <Text className="mr-1 text-xs font-semibold text-sky-600">
          View full record
        </Text>
        <ChevronRight size={14} color="#0284C7" />
      </View>
    </TouchableOpacity>
  );
}

// ── Vitals Grid Card ────────────────────────────────────────────────────────
function VitalTile({
  icon,
  label,
  value,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: { text: string; color: string };
}) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="mb-2">{icon}</View>
      <Text className="text-xs font-semibold text-slate-500">{label}</Text>
      <Text className="mt-1 text-lg font-bold text-slate-900">{value}</Text>
      {badge && (
        <View
          className={`mt-1.5 self-start rounded-full px-2 py-0.5 ${badge.color}`}
        >
          <Text className="text-xs font-semibold">{badge.text}</Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────
export default function RecordsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"history" | "profile">("history");
  const [search, setSearch] = useState("");
  const allergyModalRef = useRef<BottomSheet>(null);

  const topPadding = Math.max(insets.top, 16) + 8;

  // Allergy state — initialised with existing profile allergies
  const [allergies, setAllergies] = useState<(Allergy & { id: string })[]>([
    { id: "a1", allergen: "Penicillin", reaction: "Anaphylaxis", severity: "Severe" },
    { id: "a2", allergen: "NSAIDs", reaction: "Skin Rash", severity: "Mild" },
  ]);

  const handleAddAllergy = (allergy: Allergy) => {
    setAllergies((prev) => [
      ...prev,
      { ...allergy, id: String(Date.now()) },
    ]);
  };

  const groupedRecords = groupByMonth(MOCK_RECORDS);

  const filteredGroups = search.trim()
    ? groupedRecords.map(({ month, encounters }) => ({
        month,
        encounters: encounters.filter(
          (e) =>
            e.doctor.toLowerCase().includes(search.toLowerCase()) ||
            e.specialty.toLowerCase().includes(search.toLowerCase()) ||
            e.facility.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(({ encounters }) => encounters.length > 0)
    : groupedRecords;

  const allergyChipStyle: Record<Allergy["severity"], string> = {
    Severe: "bg-red-50 border-red-200",
    Moderate: "bg-orange-50 border-orange-200",
    Mild: "bg-amber-50 border-amber-200",
  };
  const allergyTextStyle: Record<Allergy["severity"], string> = {
    Severe: "text-red-700",
    Moderate: "text-orange-700",
    Mild: "text-amber-700",
  };

  return (
    <>
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingHorizontal: 20,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page Header ─────────────────────────────────── */}
        <Text className="text-3xl font-bold text-slate-900">Records</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Your clinical history and health profile
        </Text>

        {/* ── Segment Control ──────────────────────────────── */}
        <View className="mt-6 flex-row rounded-xl bg-slate-200 p-1">
          <TouchableOpacity
            onPress={() => setActiveTab("history")}
            className={`flex-1 rounded-lg py-3 ${
              activeTab === "history" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text className="text-center text-sm font-semibold text-slate-700">
              Clinical History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("profile")}
            className={`flex-1 rounded-lg py-3 ${
              activeTab === "profile" ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text className="text-center text-sm font-semibold text-slate-700">
              Health Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════
            TAB 1: Clinical History
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <>
            {/* Search bar */}
            <View className="mt-5 flex-row items-center rounded-xl border border-slate-200 bg-white px-3">
              <Search size={19} color="#94A3B8" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search doctor, specialty, facility..."
                placeholderTextColor="#94A3B8"
                className="flex-1 px-3 py-3 text-sm text-slate-800"
              />
            </View>

            {/* Encounter groups */}
            {filteredGroups.map(({ month, encounters }) => (
              <View key={month}>
                <Text className="mb-3 mt-6 text-lg font-bold text-slate-900">
                  {month}
                </Text>
                {encounters.map((encounter) => (
                  <EncounterCard key={encounter.id} encounter={encounter} />
                ))}
              </View>
            ))}

            {filteredGroups.length === 0 && (
              <View className="mt-12 items-center">
                <ShieldCheck size={32} color="#CBD5E1" />
                <Text className="mt-3 text-center text-sm text-slate-400">
                  No records match your search.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════
            TAB 2: Health Profile
        ═══════════════════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <>
            {/* ── Physiological Vitals 2×2 Grid ──────────── */}
            <Text className="mb-3 mt-7 text-lg font-bold text-slate-900">
              Physiological Baseline
            </Text>
            <View className="gap-3">
              <View className="flex-row gap-3">
                <VitalTile
                  icon={<Ruler size={20} color="#0284C7" />}
                  label="Height"
                  value="178 cm"
                />
                <VitalTile
                  icon={<Weight size={20} color="#7C3AED" />}
                  label="Weight"
                  value="74.5 kg"
                />
              </View>
              <View className="flex-row gap-3">
                <VitalTile
                  icon={<Activity size={20} color="#10B981" />}
                  label="BMI"
                  value="23.5"
                  badge={{ text: "Normal Range", color: "bg-emerald-50 text-emerald-700" }}
                />
                <VitalTile
                  icon={<Droplets size={20} color="#EF4444" />}
                  label="Blood Group"
                  value="O Positive"
                />
              </View>
            </View>

            {/* ── Allergies & Sensitivities ───────────────── */}
            <View className="mb-3 mt-8 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">
                Allergies & Sensitivities
              </Text>
              <TouchableOpacity
                onPress={() => allergyModalRef.current?.snapToIndex(0)}
                className="flex-row items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5"
              >
                <Plus size={14} color="#0284C7" />
                <Text className="text-xs font-bold text-sky-700">
                  Add Allergy
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-3">
              {allergies.map((allergy) => (
                <View
                  key={allergy.id}
                  className={`rounded-full border px-4 py-2.5 ${allergyChipStyle[allergy.severity]}`}
                >
                  <Text
                    className={`text-sm font-semibold ${allergyTextStyle[allergy.severity]}`}
                  >
                    {allergy.allergen}
                    {" "}
                    <Text className="font-normal opacity-70">·</Text>
                    {" "}
                    {allergy.severity}
                    {allergy.severity === "Severe" && " ⚠"}
                  </Text>
                  {allergy.reaction ? (
                    <Text
                      className={`mt-0.5 text-xs ${allergyTextStyle[allergy.severity]} opacity-70`}
                    >
                      {allergy.reaction}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>

            {/* ── Active Chronic Conditions ───────────────── */}
            <Text className="mb-3 mt-8 text-lg font-bold text-slate-900">
              Active Conditions
            </Text>
            <View className="gap-2">
              {[
                { condition: "Hypertension", status: "Stage 1 — Managed", color: "bg-red-50 border-red-200", dot: "bg-red-500" },
                { condition: "Reactive Airway", status: "Mild — PRN Inhaler", color: "bg-sky-50 border-sky-200", dot: "bg-sky-500" },
              ].map((item) => (
                <View
                  key={item.condition}
                  className={`flex-row items-center rounded-2xl border px-4 py-3 ${item.color}`}
                >
                  <View className={`mr-3 h-2.5 w-2.5 rounded-full ${item.dot}`} />
                  <View>
                    <Text className="text-sm font-bold text-slate-900">
                      {item.condition}
                    </Text>
                    <Text className="text-xs text-slate-500">{item.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Allergy Bottom Sheet Modal ─────────────────────── */}
      <AllergyModal ref={allergyModalRef} onSave={handleAddAllergy} />
    </>
  );
}
