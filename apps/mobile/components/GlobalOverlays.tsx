import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { AlertTriangle, Camera, Stethoscope, X } from "lucide-react-native";
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IntakeActions = { openIntakeActionSheet: () => void };
const IntakeActionsContext = createContext<IntakeActions | null>(null);

export function useIntakeActions() {
  const context = useContext(IntakeActionsContext);
  if (!context) throw new Error("useIntakeActions must be used inside GlobalOverlays");
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

  const chooseIntake = (destination: "/intake/doctor-session" | "/intake/scan-document") => {
    intakeSheetRef.current?.dismiss();
    router.push(destination);
  };

  return (
    <IntakeActionsContext.Provider value={{ openIntakeActionSheet: () => intakeSheetRef.current?.present() }}>
      {children}
      {consentVisible && (
        <View className="absolute left-4 right-4 z-50 rounded-2xl bg-red-600 p-4 shadow-lg" style={{ top: insets.top + 12 }}>
          <View className="flex-row items-start"><AlertTriangle color="#FFFFFF" size={22} strokeWidth={2.5} /><View className="ml-3 flex-1"><Text className="text-xs font-bold tracking-wide text-white">DOCTOR ACCESS REQUEST</Text><Text className="mt-1 text-base font-bold text-white">Dr. Ayesha Malik wants to view your records</Text><Text className="mt-1 text-sm leading-5 text-red-100">Cardiology at PIMS Hospital · Full history · 24 hours</Text><View className="mt-4 flex-row gap-2"><TouchableOpacity onPress={() => setConsentVisible(false)} className="flex-1 rounded-xl bg-white/15 px-3 py-3"><Text className="text-center text-sm font-semibold text-white">Reject</Text></TouchableOpacity><TouchableOpacity onPress={() => { setConsentVisible(false); Alert.alert("Access approved", "Dr. Ayesha Malik can view your records for 24 hours."); }} className="flex-1 rounded-xl bg-white px-3 py-3"><Text className="text-center text-sm font-bold text-red-600">Approve</Text></TouchableOpacity></View></View><TouchableOpacity accessibilityLabel="Dismiss doctor access request" onPress={() => setConsentVisible(false)} className="ml-2 h-11 w-11 items-center justify-center"><X color="#FFFFFF" size={19} /></TouchableOpacity></View>
        </View>
      )}
      <BottomSheetModal ref={intakeSheetRef} snapPoints={["38%"]} enablePanDownToClose backgroundStyle={{ backgroundColor: "#FFFFFF", borderRadius: 24 }} handleIndicatorStyle={{ backgroundColor: "#CBD5E1", width: 48 }}><BottomSheetView className="px-5 pb-8"><Text className="text-2xl font-bold text-slate-900">New clinical intake</Text><Text className="mt-1 text-sm text-slate-500">Add a visit or prescription to your health ledger.</Text><TouchableOpacity onPress={() => chooseIntake("/intake/doctor-session")} className="mt-5 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4"><View className="mr-4 rounded-xl bg-sky-50 p-3"><Stethoscope size={23} color="#0284C7" /></View><View><Text className="text-base font-bold text-slate-900">Log Doctor Visit</Text><Text className="mt-1 text-sm text-slate-500">Describe what happened in your own words</Text></View></TouchableOpacity><TouchableOpacity onPress={() => chooseIntake("/intake/scan-document")} className="mt-3 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4"><View className="mr-4 rounded-xl bg-emerald-50 p-3"><Camera size={23} color="#10B981" /></View><View><Text className="text-base font-bold text-slate-900">Scan Document</Text><Text className="mt-1 text-sm text-slate-500">Capture a prescription or lab report</Text></View></TouchableOpacity></BottomSheetView></BottomSheetModal>
    </IntakeActionsContext.Provider>
  );
}
