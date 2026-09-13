import BottomSheet, {
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Check } from "lucide-react-native";
import { forwardRef, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type Allergy = {
  allergen: string;
  reaction: string;
  severity: "Mild" | "Moderate" | "Severe";
};

type Props = {
  onSave: (allergy: Allergy) => void;
};

const AUTOCOMPLETE_CHIPS = ["Penicillin", "Sulfa", "Aspirin", "Peanuts", "Latex", "Shellfish"];

const SEVERITY_CONFIG: {
  label: Allergy["severity"];
  bg: string;
  activeBg: string;
  activeTxt: string;
  dot: string;
}[] = [
  {
    label: "Mild",
    bg: "bg-slate-100",
    activeBg: "bg-amber-100 border border-amber-400",
    activeTxt: "text-amber-700",
    dot: "bg-amber-400",
  },
  {
    label: "Moderate",
    bg: "bg-slate-100",
    activeBg: "bg-orange-100 border border-orange-400",
    activeTxt: "text-orange-700",
    dot: "bg-orange-500",
  },
  {
    label: "Severe",
    bg: "bg-slate-100",
    activeBg: "bg-red-100 border border-red-500",
    activeTxt: "text-red-700",
    dot: "bg-red-500",
  },
];

export const AllergyModal = forwardRef<BottomSheet, Props>(
  ({ onSave }, ref) => {
    const insets = useSafeAreaInsets();
    const snapPoints = useMemo(() => ["60%", "80%"], []);

    const [allergen, setAllergen] = useState("");
    const [reaction, setReaction] = useState("");
    const [severity, setSeverity] = useState<Allergy["severity"]>("Mild");

    const reset = () => {
      setAllergen("");
      setReaction("");
      setSeverity("Mild");
    };

    const handleSave = () => {
      if (!allergen.trim()) return;
      onSave({ allergen: allergen.trim(), reaction: reaction.trim(), severity });
      reset();
      (ref as React.RefObject<BottomSheet>).current?.close();
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
        }}
        handleIndicatorStyle={{ backgroundColor: "#CBD5E1", width: 48 }}
      >
        <BottomSheetView
          style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {/* Header */}
          <View className="px-5 pb-2 pt-1">
            <Text className="text-xl font-bold text-slate-900">
              Add Allergy
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              Record an allergen and its reaction severity.
            </Text>
          </View>

          <View className="flex-1 px-5">
            {/* Allergen Name */}
            <Text className="mb-2 mt-5 text-sm font-semibold text-slate-700">
              Allergen Name
            </Text>
            <BottomSheetTextInput
              value={allergen}
              onChangeText={setAllergen}
              placeholder="e.g. Penicillin"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            />

            {/* Autocomplete chips */}
            <View className="mt-3 flex-row flex-wrap gap-2">
              {AUTOCOMPLETE_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip}
                  onPress={() => setAllergen(chip)}
                  className={`rounded-full border px-3 py-1.5 ${
                    allergen === chip
                      ? "border-sky-400 bg-sky-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      allergen === chip ? "text-sky-700" : "text-slate-600"
                    }`}
                  >
                    {chip}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reaction Description */}
            <Text className="mb-2 mt-5 text-sm font-semibold text-slate-700">
              Reaction Description
            </Text>
            <BottomSheetTextInput
              value={reaction}
              onChangeText={setReaction}
              placeholder="e.g. Hives, Breathing difficulty, Skin rash"
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            />

            {/* Severity Selector */}
            <Text className="mb-3 mt-5 text-sm font-semibold text-slate-700">
              Severity
            </Text>
            <View className="flex-row gap-2">
              {SEVERITY_CONFIG.map((s) => {
                const isActive = severity === s.label;
                return (
                  <TouchableOpacity
                    key={s.label}
                    onPress={() => setSeverity(s.label)}
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
                      isActive ? s.activeBg : s.bg
                    }`}
                  >
                    {isActive && (
                      <View
                        className={`h-2.5 w-2.5 rounded-full ${s.dot}`}
                      />
                    )}
                    <Text
                      className={`text-sm font-semibold ${
                        isActive ? s.activeTxt : "text-slate-500"
                      }`}
                    >
                      {s.label}
                    </Text>
                    {isActive && <Check size={14} color={isActive ? "#374151" : "#94A3B8"} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={!allergen.trim()}
              className={`mt-6 rounded-xl py-4 ${
                allergen.trim() ? "bg-sky-600" : "bg-slate-200"
              }`}
            >
              <Text
                className={`text-center text-sm font-bold ${
                  allergen.trim() ? "text-white" : "text-slate-400"
                }`}
              >
                Save Allergy
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

AllergyModal.displayName = "AllergyModal";
