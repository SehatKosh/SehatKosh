import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import {
  AlertTriangle,
  ChevronRight,
  ScanLine,
  Stethoscope,
  X,
} from "lucide-react-native";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IntakeActions = { openIntakeActionSheet: () => void };
const IntakeActionsContext = createContext<IntakeActions | null>(null);

export function useIntakeActions() {
  const context = useContext(IntakeActionsContext);
  if (!context)
    throw new Error("useIntakeActions must be used inside GlobalOverlays");
  return context;
}

export function GlobalOverlays({ children }: PropsWithChildren) {
  const intakeSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const [consentVisible, setConsentVisible] = useState(false);

  useEffect(() => {
    const mockRequest = setTimeout(() => setConsentVisible(true), 2500);
    return () => clearTimeout(mockRequest);
  }, []);

  const chooseIntake = (
    destination: "/intake/doctor-session" | "/intake/scan-document"
  ) => {
    intakeSheetRef.current?.dismiss();
    router.push(destination);
  };

  return (
    <IntakeActionsContext.Provider
      value={{ openIntakeActionSheet: () => intakeSheetRef.current?.present() }}
    >
      {children}

      {/* ── Doctor Access Request Toast ──────────────────── */}
      {consentVisible && (
        <View
          className="absolute left-4 right-4 z-50 rounded-2xl bg-red-600 p-4 shadow-lg"
          style={{ top: insets.top + 12 }}
        >
          <View className="flex-row items-start">
            <AlertTriangle color="#FFFFFF" size={22} strokeWidth={2.5} />
            <View className="ml-3 flex-1">
              <Text className="text-xs font-bold tracking-wide text-white">
                DOCTOR ACCESS REQUEST
              </Text>
              <Text className="mt-1 text-base font-bold text-white">
                Dr. Ayesha Malik wants to view your records
              </Text>
              <Text className="mt-1 text-sm leading-5 text-red-100">
                Cardiology at PIMS Hospital · Full history · 24 hours
              </Text>
              <View className="mt-4 flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setConsentVisible(false)}
                  className="flex-1 rounded-xl bg-white/15 px-3 py-3"
                >
                  <Text className="text-center text-sm font-semibold text-white">
                    Reject
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setConsentVisible(false);
                    Alert.alert(
                      "Access approved",
                      "Dr. Ayesha Malik can view your records for 24 hours."
                    );
                  }}
                  className="flex-1 rounded-xl bg-white px-3 py-3"
                >
                  <Text className="text-center text-sm font-bold text-red-600">
                    Approve
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              accessibilityLabel="Dismiss doctor access request"
              onPress={() => setConsentVisible(false)}
              className="ml-2 h-11 w-11 items-center justify-center"
            >
              <X color="#FFFFFF" size={19} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Intake Action Sheet ──────────────────────────── */}
      <BottomSheetModal
        ref={intakeSheetRef}
        snapPoints={["48%"]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#FFFFFF", borderRadius: 24 }}
        handleIndicatorStyle={{ backgroundColor: "#CBD5E1", width: 48 }}
      >
        <BottomSheetView
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          className="px-5 pt-2"
        >
          {/* Header */}
          <Text className="text-xl font-bold text-slate-900">
            New Clinical Encounter
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            Log today's doctor consultation and link medical documents.
          </Text>

          {/* Primary Action — Log Doctor Consultation (80% visual emphasis) */}
          <TouchableOpacity
            onPress={() => chooseIntake("/intake/doctor-session")}
            className="mt-5 w-full flex-row items-center justify-between rounded-2xl bg-sky-600 p-4 shadow-sm"
            activeOpacity={0.8}
          >
            <View className="flex-1 flex-row items-center pr-4">
              <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <Stethoscope size={24} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-base font-bold text-white">
                  Log Doctor Consultation
                </Text>
                <Text className="text-sm text-white/80">
                  Record discussion, advice & attach prescription
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Secondary Action — Quick Scan Only */}
          <TouchableOpacity
            onPress={() => chooseIntake("/intake/scan-document")}
            className="mt-3 w-full flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
            activeOpacity={0.7}
          >
            <View className="flex-1 flex-row items-center pr-4">
              <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-slate-200">
                <ScanLine size={24} color="#475569" />
              </View>
              <View>
                <Text className="text-base font-semibold text-slate-800">
                  Quick Scan Document Only
                </Text>
                <Text className="text-sm text-slate-500">
                  Digitize lab report or past prescription image
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    </IntakeActionsContext.Provider>
  );
}
