import { useState } from "react";
import { router } from "expo-router";
import { ChevronRight, Mic, ScanLine, X } from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DoctorSessionScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 16) + 8;

  const [doctorName, setDoctorName] = useState("");
  const [clinic, setClinic] = useState("");
  const [notes, setNotes] = useState("");

  const canProceed = doctorName.trim().length > 0;

  const handleSkip = () => {
    // Save consultation only and navigate back
    router.back();
  };

  const handleProceed = () => {
    router.push("/intake/scan-document");
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingTop: topPadding,
          paddingBottom: Math.max(insets.bottom, 16) + 100,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Nav ─────────────────────────────────────── */}
        <View className="mb-6 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-white border border-slate-200"
          >
            <X size={20} color="#475569" />
          </TouchableOpacity>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2 w-8 rounded-full bg-sky-600" />
            <View className="h-2 w-2 rounded-full bg-slate-200" />
          </View>
          <View className="w-11" />
        </View>

        {/* ── Step Label ──────────────────────────────────── */}
        <Text className="text-xs font-bold uppercase tracking-wider text-sky-600">
          Step 1 of 2 · Consultation Intake
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">
          Log doctor visit
        </Text>
        <Text className="mt-2 text-sm leading-5 text-slate-500">
          Capture the important details while they are still fresh.
        </Text>

        {/* ── Doctor Name ─────────────────────────────────── */}
        <Text className="mb-2 mt-8 text-sm font-semibold text-slate-700">
          Doctor name <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          value={doctorName}
          onChangeText={setDoctorName}
          placeholder="e.g. Dr. Tariq Khan"
          placeholderTextColor="#94A3B8"
          autoCapitalize="words"
          className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900"
        />

        {/* ── Specialty / Clinic ──────────────────────────── */}
        <Text className="mb-2 mt-4 text-sm font-semibold text-slate-700">
          Specialty / clinic
        </Text>
        <TextInput
          value={clinic}
          onChangeText={setClinic}
          placeholder="e.g. Internal Medicine, Shifa Hospital"
          placeholderTextColor="#94A3B8"
          className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900"
        />

        {/* ── Discussion Notes ─────────────────────────────── */}
        <View className="mt-7 rounded-2xl border border-slate-200 bg-white p-4">
          <Text className="text-lg font-bold text-slate-900">
            What was discussed?
          </Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">
            Mention symptoms, the diagnosis, and any medication changes.
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            placeholder="Tell us in plain words..."
            placeholderTextColor="#94A3B8"
            className="mt-4 h-44 rounded-xl bg-slate-50 p-4 text-sm text-slate-900"
          />
          <TouchableOpacity className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-sky-200 py-3">
            <Mic size={18} color="#0284C7" />
            <Text className="text-sm font-semibold text-sky-700">
              Hold to record consultation notes
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Sticky Bottom CTAs ────────────────────────────── */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-5 pt-4"
      >
        {/* Primary: Proceed to scan */}
        <TouchableOpacity
          disabled={!canProceed}
          onPress={handleProceed}
          className={`flex-row items-center justify-center gap-2 rounded-xl py-4 ${
            canProceed ? "bg-sky-600" : "bg-slate-200"
          }`}
        >
          <ScanLine size={18} color={canProceed ? "#FFFFFF" : "#94A3B8"} />
          <Text
            className={`font-bold text-base ${
              canProceed ? "text-white" : "text-slate-400"
            }`}
          >
            Proceed to Attach Prescription
          </Text>
          <ChevronRight size={18} color={canProceed ? "#FFFFFF" : "#94A3B8"} />
        </TouchableOpacity>

        {/* Secondary: Skip document */}
        <TouchableOpacity
          onPress={handleSkip}
          className="mt-2 py-3"
        >
          <Text className="text-center text-sm font-semibold text-slate-500">
            Skip Document & Save Consultation Only
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}