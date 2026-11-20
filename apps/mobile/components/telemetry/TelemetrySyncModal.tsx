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
  ScrollView,
} from "react-native";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  Info,
  RefreshCw,
  Settings,
  ShieldCheck,
  Watch,
  X,
} from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { usePatient } from "../../context/PatientContext";
import {
  openHealthSettings,
  openAppSettings,
  isRunningInExpoGo,
} from "../../services/telemetryService";

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
  const inExpoGo = isRunningInExpoGo();

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
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollArea}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
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
                      ? `Last synchronized: ${telemetry.lastSyncedAt || "Today"}. Health vitals and activity trends are up-to-date.`
                      : `Connect SehatKosh to ${platformName} to automatically receive vitals from your smartwatch and phone sensors.`}
                  </Text>
                </View>

                {/* Expo Go Notice (when testing in Expo Go) */}
                {inExpoGo && (
                  <View
                    style={[
                      styles.expoNoticeBox,
                      {
                        backgroundColor: isDark
                          ? "rgba(245, 158, 11, 0.1)"
                          : "rgba(245, 158, 11, 0.08)",
                        borderColor: isDark
                          ? "rgba(245, 158, 11, 0.25)"
                          : "rgba(245, 158, 11, 0.3)",
                      },
                    ]}
                  >
                    <Info size={16} color="#F59E0B" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.expoNoticeTitle, { color: isDark ? "#FBBF24" : "#D97706" }]}>
                        Running in Expo Go Sandbox
                      </Text>
                      <Text style={[styles.expoNoticeText, { color: colors.textSecondary }]}>
                        Apple blocks native HealthKit entitlements inside the generic Expo Go app. To read physical watch data in real-time, build a development client (npx expo run:ios) or standalone app. Displaying verified simulated telemetry.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Detailed Step-by-Step Instructions */}
                <View
                  style={[
                    styles.instructionBox,
                    {
                      backgroundColor: isDark
                        ? "rgba(56, 189, 248, 0.06)"
                        : "rgba(2, 132, 199, 0.05)",
                      borderColor: isDark
                        ? "rgba(56, 189, 248, 0.2)"
                        : "rgba(2, 132, 199, 0.15)",
                    },
                  ]}
                >
                  <Text style={[styles.instructionTitle, { color: isDark ? "#38BDF8" : "#0284C7" }]}>
                    {Platform.OS === "ios"
                      ? "How to Sync Any Smartwatch on iPhone"
                      : "How to Sync Any Smartwatch on Android"}
                  </Text>

                  {Platform.OS === "ios" ? (
                    <View style={styles.stepsList}>
                      {/* Step 1 */}
                      <View style={styles.stepItem}>
                        <Text style={[styles.stepNumber, { color: isDark ? "#38BDF8" : "#0284C7" }]}>
                          1
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>
                            Link your Watch to Apple Health
                          </Text>
                          <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                            • <Text style={{ fontWeight: "700" }}>Samsung Galaxy Watch</Text> (Active 2, etc.): Open the <Text style={{ fontWeight: "600" }}>Samsung Health</Text> app on your iPhone → Settings (gear icon) → <Text style={{ fontWeight: "600" }}>Apple Health</Text> → Tap <Text style={{ fontWeight: "700", color: "#10B981" }}>Turn On All</Text>.{"\n"}
                            • <Text style={{ fontWeight: "700" }}>Apple Watch</Text>: Vitals sync to Apple Health automatically.{"\n"}
                            • <Text style={{ fontWeight: "700" }}>Fitbit / Garmin / Others</Text>: In their companion app → Settings → Connected Apps → Apple Health → Enable all.
                          </Text>
                        </View>
                      </View>

                      {/* Step 2 */}
                      <View style={styles.stepItem}>
                        <Text style={[styles.stepNumber, { color: isDark ? "#38BDF8" : "#0284C7" }]}>
                          2
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>
                            Allow SehatKosh in Apple Health
                          </Text>
                          <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                            Open iPhone <Text style={{ fontWeight: "600" }}>Settings</Text> → <Text style={{ fontWeight: "600" }}>Health</Text> → <Text style={{ fontWeight: "600" }}>Data Access & Devices</Text> → tap <Text style={{ fontWeight: "600" }}>SehatKosh</Text> → Tap <Text style={{ fontWeight: "700", color: "#10B981" }}>Turn All Categories On</Text> (Steps, Heart Rate, Active Calories, Sleep).
                          </Text>
                        </View>
                      </View>

                      {/* Step 3 */}
                      <View style={styles.stepItem}>
                        <Text style={[styles.stepNumber, { color: isDark ? "#38BDF8" : "#0284C7" }]}>
                          3
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>
                            Ensure Apple Health is Active
                          </Text>
                          <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                            Open the built-in <Text style={{ fontWeight: "600" }}>Health app</Text> (white icon with a pink heart) on your iPhone once to ensure your profile is initialized.
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.stepsList}>
                      {/* Android Step 1 */}
                      <View style={styles.stepItem}>
                        <Text style={[styles.stepNumber, { color: isDark ? "#38BDF8" : "#0284C7" }]}>
                          1
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>
                            Link Watch to Health Connect
                          </Text>
                          <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                            In <Text style={{ fontWeight: "600" }}>Samsung Health</Text> (or your watch companion app) → tap Settings → <Text style={{ fontWeight: "600" }}>Health Connect</Text> → Turn On All Permissions.
                          </Text>
                        </View>
                      </View>

                      {/* Android Step 2 */}
                      <View style={styles.stepItem}>
                        <Text style={[styles.stepNumber, { color: isDark ? "#38BDF8" : "#0284C7" }]}>
                          2
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>
                            Allow SehatKosh in Health Connect
                          </Text>
                          <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                            In the <Text style={{ fontWeight: "600" }}>Health Connect</Text> app → App permissions → <Text style={{ fontWeight: "600" }}>SehatKosh</Text> → Allow all categories.
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
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
                      Open {platformName} App
                    </Text>
                  </TouchableOpacity>

                  {Platform.OS === "ios" && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={openAppSettings}
                      style={[
                        styles.settingsBtn,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#CBD5E1",
                        },
                      ]}
                    >
                      <Settings size={15} color={colors.textSecondary} />
                      <Text style={[styles.settingsBtnText, { color: colors.textSecondary }]}>
                        Open iPhone Settings (Permissions)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
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
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 34,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 10,
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
  expoNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  expoNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  expoNoticeText: {
    fontSize: 12,
    lineHeight: 17,
  },
  instructionBox: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  stepsList: {
    gap: 14,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    lineHeight: 22,
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: "rgba(2, 132, 199, 0.12)",
  },
  stepHeading: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
  },
  stepText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 24,
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
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
  },
  settingsBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
