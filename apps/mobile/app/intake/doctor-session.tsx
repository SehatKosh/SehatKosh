import { useState } from "react";
import { router } from "expo-router";
import { ChevronRight, Mic, ScanLine, X } from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

export default function DoctorSessionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const topPadding = Math.max(insets.top, 16) + 8;

  const [doctorName, setDoctorName] = useState("");
  const [clinic, setClinic] = useState("");
  const [notes, setNotes] = useState("");

  const canProceed = doctorName.trim().length > 0;

  const handleSkip = () => {
    router.back();
  };

  const handleProceed = () => {
    router.push("/intake/scan-document");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.canvas }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding,
            paddingBottom: Math.max(insets.bottom, 16) + 120,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Nav ─────────────────────────────────────── */}
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.navBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.stepDots}>
            <View style={styles.stepDotActive} />
            <View
              style={[
                styles.stepDotInactive,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.15)"
                    : "#CBD5E1",
                },
              ]}
            />
          </View>
          <View style={styles.navBtnPlaceholder} />
        </View>

        {/* ── Step Label ──────────────────────────────────── */}
        <Text style={styles.stepLabel}>
          Step 1 of 2 · Consultation Intake
        </Text>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary },
          ]}
        >
          Log doctor visit
        </Text>

        {/* ── Doctor Name ─────────────────────────────────── */}
        <Text
          style={[
            styles.inputLabel,
            { color: colors.textPrimary },
          ]}
        >
          Doctor name <Text style={styles.asterisk}>*</Text>
        </Text>
        <TextInput
          value={doctorName}
          onChangeText={setDoctorName}
          placeholder="e.g. Dr. Tariq Khan"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
        />

        {/* ── Specialty / Clinic ──────────────────────────── */}
        <Text
          style={[
            styles.inputLabel,
            { color: colors.textPrimary, marginTop: 18 },
          ]}
        >
          Specialty / clinic
        </Text>
        <TextInput
          value={clinic}
          onChangeText={setClinic}
          placeholder="e.g. Internal Medicine, Shifa Hospital"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
        />

        {/* ── Discussion Notes ─────────────────────────────── */}
        <View
          style={[
            styles.notesCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.notesTitle,
              { color: colors.textPrimary },
            ]}
          >
            What was discussed?
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            placeholder="Tell us symptoms, diagnosis, and advice in plain words..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.notesInput,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.voiceBtn,
              {
                backgroundColor: isDark
                  ? "rgba(56, 189, 248, 0.1)"
                  : "#F0F9FF",
                borderColor: isDark
                  ? "rgba(56, 189, 248, 0.3)"
                  : "#BAE6FD",
              },
            ]}
          >
            <Mic size={18} color="#0284C7" />
            <Text style={styles.voiceBtnText}>
              Hold to record consultation notes
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Sticky Bottom CTAs ────────────────────────────── */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Primary: Proceed to scan */}
        <TouchableOpacity
          disabled={!canProceed}
          onPress={handleProceed}
          activeOpacity={0.8}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: canProceed
                ? "#0284C7"
                : isDark
                ? "rgba(255,255,255,0.08)"
                : "#E2E8F0",
            },
          ]}
        >
          <ScanLine
            size={18}
            color={canProceed ? "#FFFFFF" : colors.textMuted}
          />
          <Text
            style={[
              styles.primaryBtnText,
              {
                color: canProceed ? "#FFFFFF" : colors.textMuted,
              },
            ]}
          >
            Proceed to Attach Prescription
          </Text>
          <ChevronRight
            size={18}
            color={canProceed ? "#FFFFFF" : colors.textMuted}
          />
        </TouchableOpacity>

        {/* Secondary: Skip document */}
        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.7}
          style={[
            styles.secondaryBtn,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.secondaryBtnText,
              { color: colors.textSecondary },
            ]}
          >
            Save consultation without document
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  navBtnPlaceholder: {
    width: 44,
  },
  stepDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDotActive: {
    height: 8,
    width: 32,
    borderRadius: 4,
    backgroundColor: "#0284C7",
  },
  stepDotInactive: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#0284C7",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8,
  },
  asterisk: {
    color: "#EF4444",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  notesCard: {
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  notesInput: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  voiceBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
  },
  voiceBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0284C7",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
