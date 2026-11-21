import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  Footprints,
  Heart,
  Info,
  Moon,
  RefreshCw,
  Settings,
  ShieldCheck,
  Stethoscope,
  Watch,
  X,
} from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { usePatient } from "../../context/PatientContext";
import {
  isRunningInExpoGo,
  openAppSettings,
  openHealthSettings,
} from "../../services/telemetryService";

interface TelemetrySyncModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TelemetrySyncModal({
  visible,
  onClose,
}: TelemetrySyncModalProps) {
  const { colors, isDark } = useTheme();
  const {
    telemetry,
    isHealthConnected,
    isSyncing,
    useDemoData,
    setUseDemoData,
    diagnostics,
    connectHealth,
    syncTelemetryNow,
  } = usePatient();

  const [diagExpanded, setDiagExpanded] = useState(false);

  const handleSyncPress = async () => {
    if (!isHealthConnected) {
      await connectHealth();
    } else {
      await syncTelemetryNow(false);
    }
  };

  const platformName =
    Platform.OS === "android" ? "Google Health Connect" : "Apple Health";
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
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.12)"
                    : "#CBD5E1",
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
                    <Text
                      style={[styles.subtitle, { color: colors.textSecondary }]}
                    >
                      {isHealthConnected
                        ? `Synced with ${platformName}`
                        : "Not Connected"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
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
                      borderColor: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "#E2E8F0",
                    },
                  ]}
                >
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: isHealthConnected
                            ? "#10B981"
                            : "#F59E0B",
                        },
                      ]}
                    />
                    <Text
                      style={[styles.statusText, { color: colors.textPrimary }]}
                    >
                      {isHealthConnected
                        ? "Live Telemetry Active"
                        : "Pair Your Smartwatch"}
                    </Text>
                  </View>
                  <Text
                    style={[styles.statusDesc, { color: colors.textSecondary }]}
                  >
                    {isHealthConnected
                      ? `Last synchronized: ${
                          telemetry.lastSyncedAt || "Today"
                        }. Readings ground Avi AI and populate your activity dashboard.`
                      : `Connect SehatKosh to ${platformName} to automatically receive vitals from your smartwatch and phone sensors.`}
                  </Text>
                </View>

                {/* ── Demo Baseline Mode Switch ────────────────────────────── */}
                <View
                  style={[
                    styles.demoToggleBox,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "#E2E8F0",
                    },
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={[
                        styles.demoToggleTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Demo Baseline Mode
                    </Text>
                    <Text
                      style={[
                        styles.demoToggleDesc,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Show verified baseline data for presentations when watch is
                      offline or off-wrist.
                    </Text>
                  </View>
                  <Switch
                    value={useDemoData}
                    onValueChange={(val) => setUseDemoData(val)}
                    thumbColor={useDemoData ? "#38BDF8" : "#94A3B8"}
                    trackColor={{
                      false: isDark ? "#334155" : "#CBD5E1",
                      true: isDark ? "#0369A1" : "#BAE6FD",
                    }}
                  />
                </View>

                {/* ── Collapsible Health Connect Diagnostics Accordion ──────── */}
                {Platform.OS === "android" && (
                  <View
                    style={[
                      styles.diagContainer,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: isDark
                          ? "rgba(255, 255, 255, 0.08)"
                          : "#E2E8F0",
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setDiagExpanded(!diagExpanded)}
                      style={styles.diagHeader}
                    >
                      <View style={styles.diagHeaderLeft}>
                        <ShieldCheck size={16} color="#38BDF8" />
                        <Text
                          style={[
                            styles.diagHeaderTitle,
                            { color: colors.textPrimary },
                          ]}
                        >
                          Health Connect Diagnostics
                        </Text>
                      </View>
                      {diagExpanded ? (
                        <ChevronUp size={16} color={colors.textSecondary} />
                      ) : (
                        <ChevronDown size={16} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>

                    {diagExpanded && (
                      <View style={styles.diagBody}>
                        {/* Permissions Count */}
                        <View style={styles.diagRow}>
                          <Text
                            style={[
                              styles.diagLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            Granted Permissions
                          </Text>
                          <Text
                            style={[
                              styles.diagValue,
                              {
                                color:
                                  (diagnostics?.grantedPermissions.length || 0) >
                                  0
                                    ? "#10B981"
                                    : "#F59E0B",
                              },
                            ]}
                          >
                            {diagnostics?.grantedPermissions.length || 0} / 8 Granted
                          </Text>
                        </View>

                        {/* Record Counts Grid */}
                        <Text
                          style={[
                            styles.diagSectionSub,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Synchronized Health Connect Records:
                        </Text>

                        <View style={styles.recordGrid}>
                          <View
                            style={[
                              styles.recordBadge,
                              { backgroundColor: isDark ? "#0D1117" : "#F1F5F9" },
                            ]}
                          >
                            <Footprints size={12} color="#38BDF8" />
                            <Text
                              style={[
                                styles.recordBadgeText,
                                { color: colors.textPrimary },
                              ]}
                            >
                              Steps: {diagnostics?.recordCounts.Steps ?? 0}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.recordBadge,
                              { backgroundColor: isDark ? "#0D1117" : "#F1F5F9" },
                            ]}
                          >
                            <Activity size={12} color="#38BDF8" />
                            <Text
                              style={[
                                styles.recordBadgeText,
                                { color: colors.textPrimary },
                              ]}
                            >
                              Dist: {diagnostics?.recordCounts.Distance ?? 0}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.recordBadge,
                              { backgroundColor: isDark ? "#0D1117" : "#F1F5F9" },
                            ]}
                          >
                            <Heart size={12} color="#FA114F" />
                            <Text
                              style={[
                                styles.recordBadgeText,
                                { color: colors.textPrimary },
                              ]}
                            >
                              HR: {diagnostics?.recordCounts.HeartRate ?? 0}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.recordBadge,
                              { backgroundColor: isDark ? "#0D1117" : "#F1F5F9" },
                            ]}
                          >
                            <Flame size={12} color="#FB923C" />
                            <Text
                              style={[
                                styles.recordBadgeText,
                                { color: colors.textPrimary },
                              ]}
                            >
                              Kcal:{" "}
                              {diagnostics?.recordCounts.ActiveCaloriesBurned ?? 0}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.recordBadge,
                              { backgroundColor: isDark ? "#0D1117" : "#F1F5F9" },
                            ]}
                          >
                            <Activity size={12} color="#0284C7" />
                            <Text
                              style={[
                                styles.recordBadgeText,
                                { color: colors.textPrimary },
                              ]}
                            >
                              SpO2:{" "}
                              {diagnostics?.recordCounts.OxygenSaturation ?? 0}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.recordBadge,
                              { backgroundColor: isDark ? "#0D1117" : "#F1F5F9" },
                            ]}
                          >
                            <Moon size={12} color="#818CF8" />
                            <Text
                              style={[
                                styles.recordBadgeText,
                                { color: colors.textPrimary },
                              ]}
                            >
                              Sleep: {diagnostics?.recordCounts.SleepSession ?? 0}
                            </Text>
                          </View>
                        </View>

                        {/* Error Message if any */}
                        {diagnostics?.lastError ? (
                          <View style={styles.errorBox}>
                            <Text style={styles.errorText}>
                              Notice: {diagnostics.lastError}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                )}

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
                      <Text
                        style={[
                          styles.expoNoticeTitle,
                          { color: isDark ? "#FBBF24" : "#D97706" },
                        ]}
                      >
                        Running in Expo Go Sandbox
                      </Text>
                      <Text
                        style={[
                          styles.expoNoticeText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Health Connect and HealthKit native APIs require a compiled
                        standalone app or development build. Displaying verified
                        simulated telemetry.
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
                  <Text
                    style={[
                      styles.instructionTitle,
                      { color: isDark ? "#38BDF8" : "#0284C7" },
                    ]}
                  >
                    {Platform.OS === "ios"
                      ? "How to Sync Any Smartwatch on iPhone"
                      : "Pixel & Samsung Smartwatch Sync"}
                  </Text>

                  {Platform.OS === "ios" ? (
                    <View style={styles.stepsList}>
                      <View style={styles.stepItem}>
                        <Text
                          style={[
                            styles.stepNumber,
                            { color: isDark ? "#38BDF8" : "#0284C7" },
                          ]}
                        >
                          1
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.stepHeading,
                              { color: colors.textPrimary },
                            ]}
                          >
                            Link your Watch to Apple Health
                          </Text>
                          <Text
                            style={[
                              styles.stepText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            • In your watch companion app (Samsung Health, Garmin,
                            Fitbit) → Settings → Apple Health → Turn On All.
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.stepsList}>
                      {/* Android Step 1 */}
                      <View style={styles.stepItem}>
                        <Text
                          style={[
                            styles.stepNumber,
                            { color: isDark ? "#38BDF8" : "#0284C7" },
                          ]}
                        >
                          1
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.stepHeading,
                              { color: colors.textPrimary },
                            ]}
                          >
                            Link Watch to Health Connect
                          </Text>
                          <Text
                            style={[
                              styles.stepText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            In <Text style={{ fontWeight: "600" }}>Samsung Health</Text>{" "}
                            (or Google Fit / Pixel Watch app) → Settings →{" "}
                            <Text style={{ fontWeight: "600" }}>Health Connect</Text>{" "}
                            → Allow all permissions. Pull down to refresh your
                            vitals.
                          </Text>
                        </View>
                      </View>

                      {/* Android Step 2 */}
                      <View style={styles.stepItem}>
                        <Text
                          style={[
                            styles.stepNumber,
                            { color: isDark ? "#38BDF8" : "#0284C7" },
                          ]}
                        >
                          2
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.stepHeading,
                              { color: colors.textPrimary },
                            ]}
                          >
                            Allow SehatKosh in Health Connect
                          </Text>
                          <Text
                            style={[
                              styles.stepText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            In phone <Text style={{ fontWeight: "600" }}>Settings</Text>{" "}
                            → Security & Privacy →{" "}
                            <Text style={{ fontWeight: "600" }}>Health Connect</Text>{" "}
                            → App permissions → <Text style={{ fontWeight: "600" }}>SehatKosh</Text>{" "}
                            → Allow all categories.
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
                      {
                        backgroundColor: isHealthConnected
                          ? "#10B981"
                          : "#0284C7",
                      },
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
                          {isHealthConnected
                            ? "Sync Telemetry Now"
                            : "Connect Health Hub"}
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
                        borderColor: isDark
                          ? "rgba(255, 255, 255, 0.12)"
                          : "#CBD5E1",
                      },
                    ]}
                  >
                    <ExternalLink size={16} color={colors.textPrimary} />
                    <Text
                      style={[
                        styles.secondaryBtnText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Open {platformName} Settings
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={openAppSettings}
                    style={[
                      styles.settingsBtn,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: isDark
                          ? "rgba(255, 255, 255, 0.12)"
                          : "#CBD5E1",
                      },
                    ]}
                  >
                    <Settings size={15} color={colors.textSecondary} />
                    <Text
                      style={[
                        styles.settingsBtnText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Open App Permissions
                    </Text>
                  </TouchableOpacity>
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
    fontWeight: "700",
  },
  statusDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  demoToggleBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  demoToggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  demoToggleDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  diagContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  diagHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  diagHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  diagHeaderTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  diagBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 10,
  },
  diagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  diagLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  diagValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  diagSectionSub: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  recordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recordBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  recordBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  errorBox: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  errorText: {
    fontSize: 11,
    color: "#EF4444",
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
    lineHeight: 16,
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
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "800",
    width: 18,
    textAlign: "center",
  },
  stepHeading: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  stepText: {
    fontSize: 12,
    lineHeight: 17,
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
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
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
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  settingsBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
