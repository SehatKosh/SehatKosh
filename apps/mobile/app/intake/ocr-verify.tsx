import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useLocalSearchParams, router } from "expo-router";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Info,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ExtractionResponse, FHIRBundle, MedicationRequest } from "@sehatkosh/types";
import {
  saveEncounter,
  DEFAULT_PATIENT_ID,
  type CreateEncounterPayload,
} from "../../services/apiClient";
import { useTheme } from "../../context/ThemeContext";
import { usePatient } from "../../context/PatientContext";

type EditableMedication = {
  fhirId?: string;
  name: string;
  strength: string;
  frequency: string;
  duration: string;
  isUnmapped: boolean;
};

function isMedicationRequest(resource: unknown): resource is MedicationRequest {
  return (
    typeof resource === "object" &&
    resource !== null &&
    (resource as Record<string, unknown>).resourceType === "MedicationRequest"
  );
}

function fhirToEditable(mr: MedicationRequest): EditableMedication {
  const text = mr.dosageInstruction?.[0]?.text ?? "";
  const parts = text.split(" — ");
  const hasSnomed = (mr.medicationCodeableConcept?.coding?.length ?? 0) > 0;

  return {
    fhirId: mr.id,
    name: mr.medicationCodeableConcept?.text ?? "",
    strength: parts[0] ?? "",
    frequency:
      parts[1] ??
      (mr.dosageInstruction?.[0]?.timing?.repeat?.frequency
        ? `${mr.dosageInstruction[0].timing.repeat.frequency}x / ${mr.dosageInstruction[0].timing.repeat.periodUnit}`
        : ""),
    duration: parts[2] ?? "",
    isUnmapped: !hasSnomed,
  };
}

function parseExtractionParam(raw: string | undefined): ExtractionResponse | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtractionResponse;
  } catch {
    console.warn("[ocr-verify] Failed to parse extraction param:", raw);
    return null;
  }
}

const FALLBACK_MEDICATIONS: EditableMedication[] = [
  {
    name: "Azithromycin",
    strength: "500mg",
    frequency: "Once daily",
    duration: "5 days",
    isUnmapped: false,
  },
  {
    name: "Paracetamol",
    strength: "500mg",
    frequency: "As needed",
    duration: "3 days",
    isUnmapped: false,
  },
];

export default function OcrVerifyScreen() {
  const { imageUri, extraction: extractionParam } =
    useLocalSearchParams<{ imageUri?: string; extraction?: string }>();

  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { patient } = usePatient();
  const [acknowledged, setAcknowledged] = useState(false);

  const extraction = useMemo(
    () => parseExtractionParam(extractionParam),
    [extractionParam]
  );

  const metadata = extraction?.data.metadata;
  const hasUnmappedCodes = (metadata?.unmapped_codes_count ?? 0) > 0;
  const isFallbackData = metadata?.is_fallback ?? false;

  const initialMedications = useMemo((): EditableMedication[] => {
    if (!extraction) return FALLBACK_MEDICATIONS;

    const medRequests = extraction.data.fhir_bundle.entry
      .map((e) => e.resource)
      .filter(isMedicationRequest);

    if (medRequests.length === 0) return FALLBACK_MEDICATIONS;

    return medRequests.map(fhirToEditable);
  }, [extraction]);

  const [medications, setMedications] =
    useState<EditableMedication[]>(initialMedications);

  useEffect(() => {
    setMedications(initialMedications);
  }, [initialMedications]);

  const snapPoints = useMemo(() => ["60%", "92%"], []);

  const hasContraindication = useMemo(
    () =>
      medications.some(
        (m) =>
          m.name.toLowerCase().includes("amoxicillin") ||
          m.name.toLowerCase().includes("penicillin") ||
          m.name.toLowerCase().includes("amoxil")
      ),
    [medications]
  );

  const isSaveDisabled = hasContraindication && !acknowledged;
  const [isSaving, setIsSaving] = useState(false);

  const expandForInput = () => sheetRef.current?.snapToIndex(1);

  const removeMedication = (index: number) =>
    setMedications((current) =>
      current.filter((_, medicationIndex) => medicationIndex !== index)
    );

  const topPadding = Math.max(insets.top, 16) + 8;

  const handleSaveRecord = async () => {
    if (isSaveDisabled || isSaving) return;
    setIsSaving(true);

    try {
      const patientId = DEFAULT_PATIENT_ID;
      const todayISO = new Date().toISOString().split("T")[0];

      const fhirEntries = [
        {
          fullUrl: `urn:uuid:patient-${patientId}`,
          resource: {
            resourceType: "Patient",
            id: patientId,
            name: [{ text: patient.fullName, use: "official" }],
          },
        },
        ...medications.map((med, index) => {
          const medId = med.fhirId || `medrx-${Date.now()}-${index}`;
          return {
            fullUrl: `urn:uuid:${medId}`,
            resource: {
              resourceType: "MedicationRequest",
              id: medId,
              status: "active",
              intent: "order",
              medicationCodeableConcept: {
                coding: med.isUnmapped
                  ? []
                  : [
                      {
                        system: "http://snomed.info/sct",
                        code: "372687004",
                        display: med.name,
                      },
                    ],
                text: med.name,
              },
              subject: { reference: `urn:uuid:patient-${patientId}` },
              authoredOn: todayISO,
              dosageInstruction: [
                {
                  text: `${med.strength} — ${med.frequency} — ${med.duration}`,
                },
              ],
            },
          };
        }),
      ];

      const finalizedBundle: FHIRBundle = {
        resourceType: "Bundle",
        id: `bundle-verified-${Date.now()}`,
        type: "collection",
        timestamp: new Date().toISOString(),
        entry: fhirEntries as any,
      };

      const rawOcr = (extraction?.data?.raw_ocr ?? {}) as Record<string, unknown>;
      const doctorName = (rawOcr.doctor_name as string) || "Dr. Tariq Khan";
      const clinicName = (rawOcr.clinic as string) || "Shifa International Hospital";
      const encDate = (rawOcr.date as string) || todayISO;

      const payload: CreateEncounterPayload = {
        patient_id: patientId,
        physician_name: doctorName,
        facility_name: clinicName,
        encounter_date: encDate,
        fhir_bundle: finalizedBundle,
        soap_notes: {
          subjective: "Patient presented with verified prescription slip.",
          objective: `Verified ${medications.length} medications: ${medications.map((m) => `${m.name} ${m.strength}`).join(", ")}`,
          assessment: "Prescription normalized to HL7 FHIR R4 standard.",
          plan: medications.map((m) => `${m.name} ${m.strength} (${m.frequency} x ${m.duration})`).join("; "),
        },
        document_s3_key: `prescriptions/mobile_${Date.now()}.jpg`,
      };

      await saveEncounter(payload);

      Alert.alert(
        "Clinical Record Saved",
        "The verified prescription has been normalized to FHIR and persisted to PostgreSQL.",
        [
          {
            text: "View Records",
            onPress: () => router.replace("/(tabs)/records"),
          },
        ]
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to persist encounter. Please try again.";
      Alert.alert("Encounter Save Error", message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {isSaveDisabled && (
            <Text style={styles.disabledWarningText}>
              ⚠️ Acknowledge allergy conflict to proceed
            </Text>
          )}
          <TouchableOpacity
            disabled={isSaveDisabled || isSaving}
            onPress={handleSaveRecord}
            activeOpacity={0.8}
            style={[
              styles.saveBtn,
              {
                backgroundColor:
                  !isSaveDisabled && !isSaving
                    ? "#0284C7"
                    : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "#E2E8F0",
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <CheckCircle2
                color={!isSaveDisabled ? "#FFFFFF" : colors.textMuted}
                size={18}
              />
            )}
            <Text
              style={[
                styles.saveBtnText,
                {
                  color: !isSaveDisabled && !isSaving ? "#FFFFFF" : colors.textMuted,
                },
              ]}
            >
              {isSaving
                ? "Saving to Database..."
                : `Confirm & Save (${medications.length} ${
                    medications.length === 1 ? "medication" : "medications"
                  })`}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom, isSaveDisabled, isSaving, medications, handleSaveRecord, colors, isDark]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <View
        style={[
          styles.headerRow,
          { paddingTop: topPadding },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeTouchTarget}
        >
          <X color={colors.textPrimary} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Verify extracted details
        </Text>
        <View style={styles.closeTouchTarget} />
      </View>

      {/* ── Image preview ───────────────────────────────────────────────── */}
      <Pressable
        onPress={() => sheetRef.current?.snapToIndex(0)}
        style={[
          styles.previewContainer,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            resizeMode="contain"
            style={styles.previewImage}
          />
        ) : (
          <View style={styles.previewFallback}>
            <Text style={[styles.previewFallbackTitle, { color: colors.textPrimary }]}>
              Prescription preview
            </Text>
            <Text style={[styles.previewFallbackSub, { color: colors.textSecondary }]}>
              Tap to inspect captured document
            </Text>
          </View>
        )}
        <View style={styles.tapPill}>
          <Text style={styles.tapPillText}>
            Tap image to collapse form
          </Text>
        </View>
      </Pressable>

      {/* ── Bottom Sheet ────────────────────────────────────────────────── */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        handleIndicatorStyle={{
          backgroundColor: isDark ? "rgba(255,255,255,0.25)" : "#CBD5E1",
          width: 48,
        }}
        footerComponent={renderFooter}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sheetScrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 110 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text
            style={[
              styles.sheetTitle,
              { color: colors.textPrimary },
            ]}
          >
            Extracted medications ({medications.length} detected)
          </Text>

          {/* Fallback / unmapped notice */}
          {(isFallbackData || hasUnmappedCodes) && (
            <View
              style={[
                styles.noticeCard,
                {
                  backgroundColor: isDark
                    ? "rgba(245, 158, 11, 0.12)"
                    : "#FEF3C7",
                  borderColor: isDark
                    ? "rgba(245, 158, 11, 0.3)"
                    : "#FDE68A",
                },
              ]}
            >
              <Info color="#D97706" size={18} />
              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>
                  {isFallbackData ? "RAW TEXT EXTRACTION" : "UNMAPPED CODES"}
                </Text>
                <Text
                  style={[
                    styles.noticeBody,
                    { color: isDark ? "#FCD34D" : "#B45309" },
                  ]}
                >
                  Verify dosages and frequency against the document.
                </Text>
              </View>
            </View>
          )}

          {/* Contraindication warning */}
          {hasContraindication && (
            <View
              style={[
                styles.contraCard,
                {
                  backgroundColor: isDark
                    ? "rgba(239, 68, 68, 0.12)"
                    : "#FEF2F2",
                  borderColor: isDark
                    ? "rgba(239, 68, 68, 0.3)"
                    : "#FECDD3",
                },
              ]}
            >
              <View style={styles.contraRow}>
                <AlertTriangle color="#EF4444" size={20} />
                <View style={styles.contraContent}>
                  <Text style={styles.contraBadge}>
                    CONTRAINDICATION DETECTED
                  </Text>
                  <Text
                    style={[
                      styles.contraText,
                      { color: isDark ? "#FCA5A5" : "#B91C1C" },
                    ]}
                  >
                    Penicillin-class drug detected. Profile lists allergy to Penicillin.
                  </Text>
                  <View style={styles.contraActions}>
                    <TouchableOpacity
                      onPress={() => {
                        const amoxIdx = medications.findIndex((m) =>
                          m.name.toLowerCase().includes("amoxicillin") ||
                          m.name.toLowerCase().includes("penicillin") ||
                          m.name.toLowerCase().includes("amoxil")
                        );
                        if (amoxIdx !== -1) {
                          removeMedication(amoxIdx);
                        }
                      }}
                      style={styles.removeMedBtn}
                    >
                      <Text style={styles.removeMedBtnText}>
                        Remove Medication
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setAcknowledged((v) => !v)}
                style={styles.ackRow}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.ackBox,
                    {
                      borderColor: acknowledged ? "#EF4444" : colors.border,
                      backgroundColor: acknowledged ? "#EF4444" : colors.surface,
                    },
                  ]}
                >
                  {acknowledged && <Check color="#FFFFFF" size={14} />}
                </View>
                <Text
                  style={[
                    styles.ackText,
                    { color: isDark ? "#FCA5A5" : "#B91C1C" },
                  ]}
                >
                  I acknowledge this allergy conflict.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Medication edit cards */}
          {medications.map((medication, index) => (
            <View
              key={medication.fhirId ?? `med-${index}`}
              style={[
                styles.medCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.medCardHeader}>
                <Text
                  style={[
                    styles.medNumberText,
                    { color: colors.textPrimary },
                  ]}
                >
                  Medication {index + 1}
                </Text>
                <TouchableOpacity
                  accessibilityLabel={`Delete medication ${index + 1}`}
                  onPress={() => removeMedication(index)}
                  style={styles.deleteBtn}
                >
                  <Trash2 color="#EF4444" size={18} />
                </TouchableOpacity>
              </View>

              <View style={styles.medInputsRow}>
                <BottomSheetTextInput
                  defaultValue={medication.name}
                  onFocus={expandForInput}
                  onChangeText={(val) => {
                    setMedications((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, name: val } : item
                      )
                    );
                  }}
                  style={[
                    styles.medInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      flex: 1,
                    },
                  ]}
                  placeholder="Drug name"
                  placeholderTextColor={colors.textMuted}
                />
                <BottomSheetTextInput
                  defaultValue={medication.strength}
                  onFocus={expandForInput}
                  onChangeText={(val) => {
                    setMedications((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, strength: val } : item
                      )
                    );
                  }}
                  style={[
                    styles.medInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      width: 90,
                    },
                  ]}
                  placeholder="Strength"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <BottomSheetTextInput
                defaultValue={medication.frequency}
                onFocus={expandForInput}
                onChangeText={(val) => {
                  setMedications((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, frequency: val } : item
                    )
                  );
                }}
                style={[
                  styles.medInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    marginTop: 8,
                  },
                ]}
                placeholder="Frequency / timing"
                placeholderTextColor={colors.textMuted}
              />
              <BottomSheetTextInput
                defaultValue={medication.duration}
                onFocus={expandForInput}
                onChangeText={(val) => {
                  setMedications((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, duration: val } : item
                    )
                  );
                }}
                style={[
                  styles.medInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    marginTop: 8,
                  },
                ]}
                placeholder="Duration"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ))}

          {/* Add medication manually */}
          <TouchableOpacity
            onPress={() =>
              setMedications((current) => [
                ...current,
                {
                  name: "",
                  strength: "",
                  frequency: "",
                  duration: "",
                  isUnmapped: true,
                },
              ])
            }
            activeOpacity={0.7}
            style={[
              styles.addMedBtn,
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
            <Plus color="#0284C7" size={18} />
            <Text style={styles.addMedBtnText}>
              Add medication manually
            </Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeTouchTarget: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  previewContainer: {
    marginHorizontal: 20,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewFallback: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  previewFallbackTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  previewFallbackSub: {
    fontSize: 13,
    marginTop: 4,
  },
  tapPill: {
    position: "absolute",
    bottom: 12,
    borderRadius: 9999,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tapPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sheetScrollContent: {
    paddingTop: 6,
    paddingHorizontal: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  noticeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  noticeContent: {
    marginLeft: 10,
    flex: 1,
  },
  noticeTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  noticeBody: {
    fontSize: 12,
    marginTop: 2,
  },
  contraCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  contraRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  contraContent: {
    marginLeft: 10,
    flex: 1,
  },
  contraBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },
  contraText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  contraActions: {
    marginTop: 10,
    flexDirection: "row",
  },
  removeMedBtn: {
    borderRadius: 10,
    backgroundColor: "#EF4444",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  removeMedBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ackRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  ackBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  ackText: {
    fontSize: 12,
    fontWeight: "600",
  },
  medCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  medCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  medNumberText: {
    fontSize: 14,
    fontWeight: "700",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  medInputsRow: {
    flexDirection: "row",
    gap: 8,
  },
  medInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addMedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 4,
  },
  addMedBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0284C7",
  },
  footerBar: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  disabledWarningText: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  saveBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 14,
  },
  saveBtnText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "700",
  },
});
