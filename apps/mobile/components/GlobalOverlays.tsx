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
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

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
  const { colors, isDark } = useTheme();
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
          style={[
            styles.toastContainer,
            { top: insets.top + 12 },
          ]}
        >
          <View style={styles.toastRow}>
            <AlertTriangle color="#FFFFFF" size={22} strokeWidth={2.5} />
            <View style={styles.toastContent}>
              <Text style={styles.toastBadge}>
                DOCTOR ACCESS REQUEST
              </Text>
              <Text style={styles.toastTitle}>
                Dr. Ayesha Malik wants to view your records
              </Text>
              <Text style={styles.toastSub}>
                Cardiology at PIMS Hospital · Full history · 24 hours
              </Text>
              <View style={styles.toastActionRow}>
                <TouchableOpacity
                  onPress={() => setConsentVisible(false)}
                  style={styles.toastRejectBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toastRejectText}>
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
                  style={styles.toastApproveBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toastApproveText}>
                    Approve
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              accessibilityLabel="Dismiss doctor access request"
              onPress={() => setConsentVisible(false)}
              style={styles.toastCloseBtn}
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
      >
        <BottomSheetView
          style={[
            styles.sheetContent,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Header */}
          <Text
            style={[
              styles.sheetTitle,
              { color: colors.textPrimary },
            ]}
          >
            New Clinical Encounter
          </Text>
          <Text
            style={[
              styles.sheetSub,
              { color: colors.textSecondary },
            ]}
          >
            Log doctor consultation and link medical documents.
          </Text>

          {/* Primary Action — Log Doctor Consultation */}
          <TouchableOpacity
            onPress={() => chooseIntake("/intake/doctor-session")}
            style={styles.primaryActionBtn}
            activeOpacity={0.8}
          >
            <View style={styles.actionLeft}>
              <View style={styles.primaryIconBox}>
                <Stethoscope size={24} color="#FFFFFF" />
              </View>
              <View style={styles.actionMeta}>
                <Text style={styles.primaryActionTitle}>
                  Log Doctor Consultation
                </Text>
                <Text style={styles.primaryActionSub}>
                  Record discussion, advice & attach prescription
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Secondary Action — Quick Scan Only */}
          <TouchableOpacity
            onPress={() => chooseIntake("/intake/scan-document")}
            style={[
              styles.secondaryActionBtn,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View
                style={[
                  styles.secondaryIconBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "#E2E8F0",
                  },
                ]}
              >
                <ScanLine
                  size={24}
                  color={isDark ? "#38BDF8" : "#475569"}
                />
              </View>
              <View style={styles.actionMeta}>
                <Text
                  style={[
                    styles.secondaryActionTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Quick Scan Document Only
                </Text>
                <Text
                  style={[
                    styles.secondaryActionSub,
                    { color: colors.textSecondary },
                  ]}
                >
                  Digitize lab report or past prescription image
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    </IntakeActionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 50,
    borderRadius: 20,
    backgroundColor: "#DC2626",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  toastRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  toastContent: {
    marginLeft: 12,
    flex: 1,
  },
  toastBadge: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#FFFFFF",
  },
  toastTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  toastSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.85)",
  },
  toastActionRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  toastRejectBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    alignItems: "center",
  },
  toastRejectText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  toastApproveBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    alignItems: "center",
  },
  toastApproveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  toastCloseBtn: {
    marginLeft: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sheetSub: {
    marginTop: 4,
    fontSize: 13,
  },
  primaryActionBtn: {
    marginTop: 18,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    backgroundColor: "#0284C7",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  actionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  primaryIconBox: {
    marginRight: 14,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  actionMeta: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  primaryActionSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  secondaryActionBtn: {
    marginTop: 12,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  secondaryIconBox: {
    marginRight: 14,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  secondaryActionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryActionSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
