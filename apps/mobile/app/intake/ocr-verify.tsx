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
import { Alert, Image, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ExtractionResponse, MedicationRequest } from "@sehatkosh/types";

// ─── Local editable medication type ──────────────────────────────────────────

type EditableMedication = {
  /** FHIR MedicationRequest.id — used as a stable React key */
  fhirId?: string;
  name: string;
  strength: string;
  frequency: string;
  duration: string;
  /** Whether this entry has an unmapped SNOMED-CT code */
  isUnmapped: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isMedicationRequest(resource: unknown): resource is MedicationRequest {
  return (
    typeof resource === "object" &&
    resource !== null &&
    (resource as Record<string, unknown>).resourceType === "MedicationRequest"
  );
}

/**
 * Convert a FHIR MedicationRequest to a flat editable form object.
 * Parses the dosageInstruction.text field to extract strength, frequency,
 * and duration segments (separated by " — " as produced by the backend).
 */
function fhirToEditable(mr: MedicationRequest): EditableMedication {
  const text = mr.dosageInstruction?.[0]?.text ?? "";
  const parts = text.split(" — ");

  const hasSnomed = mr.medicationCodeableConcept.coding.length > 0;

  return {
    fhirId: mr.id,
    name: mr.medicationCodeableConcept.text ?? "",
    strength: parts[0] ?? "",
    frequency: parts[1] ?? mr.dosageInstruction?.[0]?.timing?.repeat?.frequency
      ? `${mr.dosageInstruction[0].timing?.repeat?.frequency}x / ${mr.dosageInstruction[0].timing?.repeat?.periodUnit}`
      : "",
    duration: parts[2] ?? "",
    isUnmapped: !hasSnomed,
  };
}

/**
 * Parse the serialised ExtractionResponse from the route param.
 * Returns null if the param is absent or malformed.
 */
function parseExtractionParam(raw: string | undefined): ExtractionResponse | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtractionResponse;
  } catch {
    console.warn("[ocr-verify] Failed to parse extraction param:", raw);
    return null;
  }
}

// ─── Default fallback medications used when no extraction data is available ──

const FALLBACK_MEDICATIONS: EditableMedication[] = [
  {
    name: "Amoxicillin",
    strength: "500mg",
    frequency: "3 times daily",
    duration: "7 days",
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OcrVerifyScreen() {
  const { imageUri, extraction: extractionParam } =
    useLocalSearchParams<{ imageUri?: string; extraction?: string }>();

  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const [acknowledged, setAcknowledged] = useState(false);

  // ── Parse extraction result from route param ────────────────────────────
  const extraction = useMemo(
    () => parseExtractionParam(extractionParam),
    [extractionParam]
  );

  const metadata = extraction?.data.metadata;
  const hasUnmappedCodes = (metadata?.unmapped_codes_count ?? 0) > 0;
  const isFallbackData = metadata?.is_fallback ?? false;

  // ── Build initial editable medication list from FHIR bundle ────────────
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

  // Re-initialise if extraction param changes (e.g. hot-reload during dev)
  useEffect(() => {
    setMedications(initialMedications);
  }, [initialMedications]);

  const snapPoints = useMemo(() => ["60%", "92%"], []);

  const hasContraindication = useMemo(
    () => medications.some((m) => m.name.toLowerCase().includes("amoxicillin")),
    [medications]
  );

  const isSaveDisabled = hasContraindication && !acknowledged;

  const expandForInput = () => sheetRef.current?.snapToIndex(1);

  const removeMedication = (index: number) =>
    setMedications((current) =>
      current.filter((_, medicationIndex) => medicationIndex !== index)
    );

  const topPadding = Math.max(insets.top, 16) + 8;

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          className="border-t border-slate-200 bg-white px-5 pt-3 shadow-lg"
        >
          {isSaveDisabled && (
            <Text className="mb-2 text-center text-xs font-semibold text-red-600">
              ⚠️ Please acknowledge the allergy conflict above to save
            </Text>
          )}
          <TouchableOpacity
            disabled={isSaveDisabled}
            onPress={() =>
              Alert.alert(
                "Saved",
                "The verified medication list was added to your records.",
                [
                  {
                    text: "OK",
                    onPress: () => router.replace("/(tabs)/records"),
                  },
                ]
              )
            }
            className={`w-full flex-row items-center justify-center rounded-xl py-4 ${
              !isSaveDisabled ? "bg-sky-600 active:bg-sky-700" : "bg-slate-200"
            }`}
          >
            <CheckCircle2
              color={!isSaveDisabled ? "#FFFFFF" : "#94A3B8"}
              size={18}
            />
            <Text
              className={`ml-2 text-center text-sm font-bold ${
                !isSaveDisabled ? "text-white" : "text-slate-400"
              }`}
            >
              Save Clinical Record ({medications.length}{" "}
              {medications.length === 1 ? "medication" : "medications"})
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom, isSaveDisabled, medications.length]
  );

  return (
    <View className="flex-1 bg-slate-950">
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <View
        style={{ paddingTop: topPadding }}
        className="flex-row items-center justify-between px-5 pb-4"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center"
        >
          <X color="#FFFFFF" size={22} />
        </TouchableOpacity>
        <Text className="text-base font-bold text-white">
          Verify extracted details
        </Text>
        <View className="w-11" />
      </View>

      {/* ── Image preview ───────────────────────────────────────────────── */}
      <Pressable
        onPress={() => sheetRef.current?.snapToIndex(0)}
        className="mx-5 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900"
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            resizeMode="contain"
            className="h-full w-full"
          />
        ) : (
          <View className="items-center px-8">
            <Text className="text-center text-lg font-semibold text-white">
              Prescription preview
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-400">
              Tap and pinch to inspect the captured document.
            </Text>
          </View>
        )}
        <View className="absolute bottom-4 rounded-full bg-black/70 px-4 py-2">
          <Text className="text-xs font-semibold text-white">
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
        backgroundStyle={{ backgroundColor: "#FFFFFF", borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: "#CBD5E1", width: 48 }}
        footerComponent={renderFooter}
      >
        {/* Scrollable content — paddingBottom clears the floating save bar */}
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingTop: 4,
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 16) + 110,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text className="text-xl font-bold text-slate-900">
            Extracted medications ({medications.length} detected)
          </Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">
            Review every field against the document before saving.
          </Text>

          {/* ── Fallback / unmapped notice ──────────────────────────────── */}
          {(isFallbackData || hasUnmappedCodes) && (
            <View className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 flex-row items-start">
              <Info color="#D97706" size={18} />
              <View className="ml-2.5 flex-1">
                {isFallbackData && (
                  <Text className="text-xs font-bold tracking-wide text-amber-800">
                    RAW TEXT EXTRACTION
                  </Text>
                )}
                {hasUnmappedCodes && (
                  <Text className="text-xs font-bold tracking-wide text-amber-800">
                    {isFallbackData ? " · " : ""}UNMAPPED BRAND NAMES
                  </Text>
                )}
                <Text className="mt-0.5 text-xs leading-4 text-amber-700">
                  {isFallbackData
                    ? "Data was parsed from raw text — please verify carefully. "
                    : ""}
                  {hasUnmappedCodes
                    ? `${metadata!.unmapped_codes_count} medication${
                        metadata!.unmapped_codes_count > 1 ? "s" : ""
                      } could not be matched to a SNOMED-CT code.`
                    : ""}
                </Text>
              </View>
            </View>
          )}

          {/* ── Contraindication warning ─────────────────────────────────── */}
          {hasContraindication && (
            <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <View className="flex-row items-start">
                <AlertTriangle color="#DC2626" size={21} />
                <View className="ml-3 flex-1">
                  <Text className="text-xs font-bold tracking-wide text-red-700">
                    CONTRAINDICATION DETECTED
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-red-700">
                    <Text className="font-bold">Amoxicillin</Text> is a
                    penicillin-class antibiotic. Your profile lists a severe
                    allergy to Penicillin.
                  </Text>
                  <View className="mt-3 flex-row gap-2">
                    <TouchableOpacity className="flex-1 rounded-xl border border-red-300 px-2 py-2">
                      <Text className="text-center text-xs font-bold text-red-700">
                        Flag to Doctor
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const amoxicillinIndex = medications.findIndex((m) =>
                          m.name.toLowerCase().includes("amoxicillin")
                        );
                        if (amoxicillinIndex !== -1) {
                          removeMedication(amoxicillinIndex);
                        }
                      }}
                      className="flex-1 rounded-xl bg-red-600 px-2 py-2"
                    >
                      <Text className="text-center text-xs font-bold text-white">
                        Remove Medication
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setAcknowledged((v) => !v)}
                className="mt-3 flex-row items-center"
              >
                <View
                  className={`mr-2 h-5 w-5 items-center justify-center rounded border ${
                    acknowledged
                      ? "border-red-600 bg-red-600"
                      : "border-red-400 bg-white"
                  }`}
                >
                  {acknowledged && <Check color="#FFFFFF" size={14} />}
                </View>
                <Text className="flex-1 text-xs font-medium text-red-700">
                  I acknowledge this allergy conflict.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Medication edit cards ─────────────────────────────────────── */}
          {medications.map((medication, index) => (
            <View
              key={medication.fhirId ?? `med-${index}`}
              className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-slate-900">
                    Medication {index + 1}
                  </Text>
                  {medication.isUnmapped && (
                    <View className="rounded-full bg-amber-100 px-2 py-0.5">
                      <Text className="text-[10px] font-bold text-amber-700">
                        unmapped
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  accessibilityLabel={`Delete medication ${index + 1}`}
                  onPress={() => removeMedication(index)}
                  className="h-11 w-11 items-center justify-center"
                >
                  <Trash2 color="#EF4444" size={18} />
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2">
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
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900"
                  placeholder="Drug name"
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
                  className="w-24 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900"
                  placeholder="Strength"
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
                className="mt-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900"
                placeholder="Frequency / timing"
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
                className="mt-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900"
                placeholder="Duration"
              />
            </View>
          ))}

          {/* Add medication button */}
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
            className="mt-4 flex-row items-center justify-center rounded-xl border border-sky-200 bg-sky-50/50 py-3.5"
          >
            <Plus color="#0284C7" size={18} />
            <Text className="ml-2 text-sm font-bold text-sky-700">
              Add medication manually
            </Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
