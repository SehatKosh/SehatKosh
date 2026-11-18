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
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getEncounterById } from "../../services/mockRecords";
import { useTheme } from "../../context/ThemeContext";

const SOAP_CONFIG = [
  {
    key: "subjective" as const,
    code: "S",
    label: "Subjective",
    sublabel: "Chief Complaints & Symptoms",
    color: "#0284C7",
    icon: <Stethoscope size={16} color="#0284C7" />,
  },
  {
    key: "objective" as const,
    code: "O",
    label: "Objective",
    sublabel: "Vitals & Clinical Observations",
    color: "#7C3AED",
    icon: <Heart size={16} color="#7C3AED" />,
  },
  {
    key: "assessment" as const,
    code: "A",
    label: "Assessment",
    sublabel: "Diagnosis (ICD-10)",
    color: "#D97706",
    icon: <Microscope size={16} color="#D97706" />,
  },
  {
    key: "plan" as const,
    code: "P",
    label: "Plan",
    sublabel: "Treatment & Follow-up Instructions",
    color: "#059669",
    icon: <ClipboardList size={16} color="#059669" />,
  },
] as const;

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const topPadding = Math.max(insets.top, 16) + 8;

  const encounter = getEncounterById(id);

  if (!encounter) {
    return (
      <View
        style={[
          styles.fallbackRoot,
          { backgroundColor: colors.canvas, paddingTop: topPadding },
        ]}
      >
        <Text style={[styles.fallbackTitle, { color: colors.textPrimary }]}>
          Record not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.fallbackBtn}
        >
          <Text style={styles.fallbackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding,
            paddingBottom: Math.max(insets.bottom, 16) + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back Button ─────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ArrowLeft color={colors.textPrimary} size={22} />
        </TouchableOpacity>

        {/* ── Encounter Header ─────────────────────────────── */}
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark
                ? "rgba(56, 189, 248, 0.15)"
                : "#E0F2FE",
              borderColor: isDark
                ? "rgba(56, 189, 248, 0.3)"
                : "#BAE6FD",
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: isDark ? "#38BDF8" : "#0284C7" },
            ]}
          >
            {encounter.encounterType}
          </Text>
        </View>

        <Text style={[styles.doctorTitle, { color: colors.textPrimary }]}>
          {encounter.doctor}
        </Text>
        <Text style={[styles.facilitySub, { color: colors.textSecondary }]}>
          {encounter.facility} · {encounter.specialty}
        </Text>
        <Text style={[styles.dateSub, { color: colors.textMuted }]}>
          {encounter.date}
        </Text>

        {/* ── SOAP Note Card ───────────────────────────────── */}
        <View
          style={[
            styles.soapCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.soapHeader,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.soapTitle, { color: colors.textPrimary }]}>
              Clinical SOAP Record
            </Text>
          </View>

          {SOAP_CONFIG.map((section, idx) => (
            <View
              key={section.key}
              style={[
                styles.soapSection,
                idx < SOAP_CONFIG.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.soapSectionHeader}>
                <View
                  style={[
                    styles.soapCodeBadge,
                    { backgroundColor: section.color },
                  ]}
                >
                  <Text style={styles.soapCodeText}>{section.code}</Text>
                </View>
                <View>
                  <Text
                    style={[
                      styles.soapSectionLabel,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {section.label}
                  </Text>
                  <Text
                    style={[
                      styles.soapSectionSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {section.sublabel}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.soapSectionBody,
                  { color: colors.textPrimary },
                ]}
              >
                {encounter.soap[section.key]}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Prescribed Medications ───────────────────────── */}
        {encounter.medications.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.textPrimary },
              ]}
            >
              Prescribed Medications
            </Text>
            {encounter.medications.map((med, idx) => (
              <View
                key={`${med.name}-${idx}`}
                style={[
                  styles.medCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.medHeaderRow}>
                  <View
                    style={[
                      styles.medIconBox,
                      {
                        backgroundColor: isDark
                          ? "rgba(56, 189, 248, 0.15)"
                          : "#E0F2FE",
                      },
                    ]}
                  >
                    <Pill
                      size={18}
                      color={isDark ? "#38BDF8" : "#0284C7"}
                    />
                  </View>
                  <View style={styles.medMeta}>
                    <Text
                      style={[
                        styles.medName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {med.name}
                    </Text>
                    <Text
                      style={[
                        styles.medForm,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {med.form} · {med.strength}
                    </Text>
                  </View>
                </View>

                <View style={styles.medDetailRow}>
                  <Text
                    style={[
                      styles.medDetailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Frequency
                  </Text>
                  <Text
                    style={[
                      styles.medDetailVal,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {med.frequency}
                  </Text>
                </View>
                <View style={styles.medDetailRow}>
                  <Text
                    style={[
                      styles.medDetailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Duration
                  </Text>
                  <Text
                    style={[
                      styles.medDetailVal,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {med.duration}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Attached Document ────────────────────────────── */}
        {encounter.attachedDocument && (
          <>
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.textPrimary },
              ]}
            >
              Attached Document
            </Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Document Preview",
                  "Tap to view the full-size scanned document."
                )
              }
              activeOpacity={0.7}
              style={[
                styles.docCard,
                {
                  backgroundColor: isDark
                    ? "rgba(16, 185, 129, 0.12)"
                    : "#ECFDF5",
                  borderColor: isDark
                    ? "rgba(16, 185, 129, 0.3)"
                    : "#A7F3D0",
                },
              ]}
            >
              <View
                style={[
                  styles.docIconBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(16, 185, 129, 0.2)"
                      : "#D1FAE5",
                  },
                ]}
              >
                <FileText size={22} color="#10B981" />
              </View>
              <View style={styles.docMeta}>
                <Text
                  style={[
                    styles.docTitle,
                    { color: isDark ? "#6EE7B7" : "#065F46" },
                  ]}
                >
                  Prescription / Report Scan
                </Text>
                <Text
                  style={[
                    styles.docSub,
                    { color: isDark ? "#A7F3D0" : "#047857" },
                  ]}
                >
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
          activeOpacity={0.7}
          style={[
            styles.exportBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <FileCode2 size={18} color="#0284C7" />
          <Text style={styles.exportBtnText}>
            Export HL7 FHIR Standard (JSON)
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  fallbackRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  fallbackBtn: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "#0284C7",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fallbackBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 16,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  doctorTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  facilitySub: {
    fontSize: 14,
    marginTop: 4,
  },
  dateSub: {
    fontSize: 12,
    marginTop: 2,
  },
  soapCard: {
    marginTop: 22,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  soapHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  soapTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  soapSection: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  soapSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  soapCodeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  soapCodeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  soapSectionLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  soapSectionSub: {
    fontSize: 11,
  },
  soapSectionBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 10,
  },
  medCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  medHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  medIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  medMeta: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: "700",
  },
  medForm: {
    fontSize: 12,
    marginTop: 1,
  },
  medDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  medDetailLabel: {
    width: 80,
    fontSize: 12,
    fontWeight: "500",
  },
  medDetailVal: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  docMeta: {
    flex: 1,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  docSub: {
    fontSize: 12,
    marginTop: 2,
  },
  exportBtn: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284C7",
  },
});
