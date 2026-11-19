import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Watch,
  X,
} from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { usePatient } from "../../context/PatientContext";
import { openHealthSettings } from "../../services/telemetryService";

interface TelemetrySyncModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TelemetrySyncModal({ visible, onClose }: TelemetrySyncModalProps) {
  const { colors, isDark } = useTheme();
  const { telemetry, isHealthConnected, isSyncing, connectHealth, syncTelemetryNow } =
    usePatient();

  const handleSyncPress = async () => {
    if (!isHealthConnected) {
      await connectHealth();
    } else {
      await syncTelemetryNow();
    }
  };

  const platformName = Platform.OS === "android" ? "Google Health Connect" : "Apple Health";
  const watchBrand = Platform.OS === "android" ? "Galaxy Watch / Wear OS" : "Apple Watch";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#CBD5E1",
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isHealthConnected
                          ? "rgba(16, 185, 129, 0.12)"
                          : "rgba(245, 158, 11, 0.12)",
                      },
                    ]}
                  >
                    <Watch
                      size={20}
                      color={isHealthConnected ? "#10B981" : "#F59E0B"}
                    />
                  </View>
                  <View>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                      Wearable Telemetry
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      {isHealthConnected ? `Synced with ${platformName}` : "Not Connected"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Status Banner */}
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0",
                  },
                ]}
              >
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isHealthConnected ? "#10B981" : "#F59E0B" },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: colors.textPrimary }]}>
                    {isHealthConnected ? "Live Telemetry Active" : "Pair Your Smartwatch"}
                  </Text>
                </View>
                <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
                  {isHealthConnected
                    ? `Last synchronized: ${telemetry.lastSyncedAt || "Today"}. Readings ground Avi AI and populate your activity dashboard.`
                    : `Connect SehatKosh to ${platformName} to automatically receive vitals from your ${watchBrand} and phone sensors.`}
                </Text>
              </View>

              {/* Samsung Health / Smartwatch Instruction Note */}
              <View
                style={[
                  styles.instructionBox,
                  {
                    backgroundColor: isDark ? "rgba(56, 189, 248, 0.08)" : "rgba(2, 132, 199, 0.06)",
                    borderColor: isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(2, 132, 199, 0.15)",
                  },
                ]}
              >
                <Text style={[styles.instructionTitle, { color: isDark ? "#38BDF8" : "#0284C7" }]}>
                  {Platform.OS === "android" ? "Samsung Health & Wearables Setup" : "Apple Watch Setup"}
                </Text>
                <Text style={[styles.instructionStep, { color: colors.textSecondary }]}>
                  {Platform.OS === "android"
                    ? "1. In Samsung Health, tap Settings → Health Connect → Turn on all permissions.\n2. In Health Connect, allow SehatKosh to read your steps, heart rate, and sleep."
                    : "1. Ensure Apple Health is enabled.\n2. Allow SehatKosh to read your activity, heart rate, and sleep."}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSyncPress}
                  disabled={isSyncing}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: isHealthConnected ? "#10B981" : "#0284C7" },
                  ]}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      {isHealthConnected ? (
                        <RefreshCw size={17} color="#FFFFFF" />
                      ) : (
                        <CheckCircle2 size={17} color="#FFFFFF" />
                      )}
                      <Text style={styles.primaryBtnText}>
                        {isHealthConnected ? "Sync Telemetry Now" : "Connect Health Hub"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openHealthSettings}
                  style={[
                    styles.secondaryBtn,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#CBD5E1",
                    },
                  ]}
                >
                  <ExternalLink size={16} color={colors.textPrimary} />
                  <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
                    Open {platformName} Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
  },
  statusDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  instructionBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  instructionStep: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 25,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
