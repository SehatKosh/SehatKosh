import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Edit3,
  Moon,
  Plus,
  RefreshCw,
  Server,
  Sun,
  Trash2,
  X,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { useAppTheme } from "../../constants/themeContext";
import { RADII } from "../../constants/theme";
import {
  AviHealthResponse,
  checkAviHealth,
  getAviBaseUrl,
  resetAviBaseUrl,
  setAviBaseUrl,
} from "../../services/aviClient";

interface AviHeaderControlsProps {
  health: AviHealthResponse;
  onRefreshHealth: () => void;
  isCheckingHealth: boolean;
  onNewChat: () => void;
  onSelectPastSession?: (sessionId: string) => void;
}

export function AviHeaderControls({
  health,
  onRefreshHealth,
  isCheckingHealth,
  onNewChat,
  onSelectPastSession,
}: AviHeaderControlsProps) {
  const { theme, isDark, toggleTheme } = useAppTheme();

  // Drawers and Modals
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);

  // Server endpoint modal state
  const [inputUrl, setInputUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AviHealthResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const openServerConfig = async () => {
    const current = await getAviBaseUrl();
    setInputUrl(current);
    setTestResult(null);
    setModelModalOpen(true);
  };

  const handleTestConnection = async () => {
    if (!inputUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await checkAviHealth(inputUrl.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        status: "unreachable",
        message: err.message || "Failed to reach server.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!inputUrl.trim()) return;
    setSaving(true);
    try {
      await setAviBaseUrl(inputUrl);
      setModelModalOpen(false);
      onRefreshHealth();
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    setSaving(true);
    try {
      const def = await resetAviBaseUrl();
      setInputUrl(def);
      setModelModalOpen(false);
      onRefreshHealth();
    } finally {
      setSaving(false);
    }
  };

  // Status dot color
  const getStatusColor = () => {
    switch (health.status) {
      case "ready":
        return "#10B981"; // Emerald
      case "loading":
        return "#F59E0B"; // Amber
      case "unavailable":
        return "#FB923C"; // Orange
      default:
        return "#F43F5E"; // Rose
    }
  };

  return (
    <>
      {/* ── Top Header Bar (3 Clean Elements) ───────────────────────────────── */}
      <View style={styles.headerBar}>
        {/* Left: 2-Bar / 3-Bar Hamburger Drawer Icon */}
        <TouchableOpacity
          accessibilityLabel="Open Navigation Drawer"
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.7}
          style={styles.touchTarget44}
        >
          <View style={styles.hamburgerIcon}>
            <View
              style={[
                styles.hamburgerBar,
                { backgroundColor: theme.textPrimary, width: 18 },
              ]}
            />
            <View
              style={[
                styles.hamburgerBar,
                { backgroundColor: theme.textPrimary, width: 12 },
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* Center: Model Context Pill (Avi MedGemma ⌵) */}
        <TouchableOpacity
          accessibilityLabel="Model Switcher & Server Status"
          onPress={openServerConfig}
          activeOpacity={0.7}
          style={[
            styles.modelPill,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor() },
            ]}
          />
          <Text
            style={[
              styles.modelPillText,
              { color: theme.textPrimary },
            ]}
          >
            Avi MedGemma
          </Text>
          <ChevronDown size={14} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Right: New Chat Pen Icon + User Avatar */}
        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            accessibilityLabel="New Chat"
            onPress={onNewChat}
            activeOpacity={0.7}
            style={styles.touchTarget44}
          >
            <Edit3 size={19} color={theme.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Toggle Theme"
            onPress={toggleTheme}
            activeOpacity={0.7}
            style={[
              styles.avatarContainer,
              {
                backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
                borderColor: theme.border,
              },
            ]}
          >
            {isDark ? (
              <Sun size={15} color="#FBBF24" />
            ) : (
              <Moon size={15} color="#6366F1" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Slide-Out Drawer Overlay ────────────────────────────────────────── */}
      {drawerOpen && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableWithoutFeedback onPress={() => setDrawerOpen(false)}>
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.6)" },
              ]}
            />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.drawerSheet,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrandRow}>
                <Svg width={24} height={24} viewBox="0 0 24 24">
                  <Path
                    d="M12 0C12 7.5 16.5 12 24 12C16.5 12 12 16.5 12 24C12 16.5 7.5 12 0 12C7.5 12 12 7.5 12 0Z"
                    fill="#3B82F6"
                  />
                </Svg>
                <Text
                  style={[
                    styles.drawerTitle,
                    { color: theme.textPrimary },
                  ]}
                >
                  SehatKosh Avi
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setDrawerOpen(false)}
                activeOpacity={0.7}
                style={styles.drawerCloseButton}
              >
                <X size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <TouchableOpacity
              onPress={() => {
                setDrawerOpen(false);
                onNewChat();
              }}
              activeOpacity={0.7}
              style={[
                styles.drawerNewChatBtn,
                {
                  backgroundColor: isDark ? "#1C212C" : "#F1F5F9",
                  borderColor: theme.border,
                },
              ]}
            >
              <Plus size={16} color={theme.textPrimary} />
              <Text
                style={[
                  styles.drawerNewChatText,
                  { color: theme.textPrimary },
                ]}
              >
                New Conversation
              </Text>
            </TouchableOpacity>

            {/* Server Status in Drawer */}
            <View
              style={[
                styles.drawerStatusCard,
                {
                  backgroundColor: isDark ? "#0A0D14" : "#F8FAFC",
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.drawerStatusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor() },
                  ]}
                />
                <Text
                  style={[
                    styles.drawerStatusLabel,
                    { color: theme.textPrimary },
                  ]}
                >
                  {health.status === "ready"
                    ? "MedGemma 1.5 4B Ready"
                    : health.message}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setDrawerOpen(false);
                  openServerConfig();
                }}
                activeOpacity={0.7}
                style={[
                  styles.configServerPill,
                  { borderColor: theme.border },
                ]}
              >
                <Server size={12} color={theme.textSecondary} />
                <Text
                  style={[
                    styles.configServerText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Configure Server
                </Text>
              </TouchableOpacity>
            </View>

            {/* Appearance Switch */}
            <View style={styles.drawerFooter}>
              <TouchableOpacity
                onPress={toggleTheme}
                activeOpacity={0.7}
                style={[
                  styles.themeToggleRow,
                  { borderColor: theme.border },
                ]}
              >
                {isDark ? (
                  <Sun size={16} color="#FBBF24" />
                ) : (
                  <Moon size={16} color="#6366F1" />
                )}
                <Text
                  style={[
                    styles.themeToggleText,
                    { color: theme.textPrimary },
                  ]}
                >
                  {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Server Endpoint Config Modal ────────────────────────────────────── */}
      {modelModalOpen && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              zIndex: 99999,
              elevation: 99999,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 20,
            },
          ]}
        >
          <View
            style={[
              styles.configModalCard,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.borderActive,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.configModalHeader}>
              <View style={styles.configHeaderTitleRow}>
                <Server size={18} color="#3B82F6" />
                <Text
                  style={[
                    styles.configModalTitle,
                    { color: theme.textPrimary },
                  ]}
                >
                  Avi GPU Engine
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModelModalOpen(false)}
                activeOpacity={0.7}
                style={styles.modalCloseBtn}
              >
                <X size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Current Health Readout */}
            <View
              style={[
                styles.healthReadoutBadge,
                {
                  backgroundColor: isDark ? "#0D1117" : "#F1F5F9",
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor() },
                ]}
              />
              <Text
                style={[
                  styles.healthReadoutText,
                  { color: theme.textPrimary },
                ]}
              >
                {health.status === "ready"
                  ? "Connected • MedGemma 1.5 4B (RTX 4000 Ada)"
                  : health.message}
              </Text>
            </View>

            {/* Endpoint URL Input */}
            <View style={styles.inputGroup}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Endpoint URL
              </Text>
              <TextInput
                value={inputUrl}
                onChangeText={setInputUrl}
                placeholder="http://172.17.170.87:10000"
                placeholderTextColor={theme.inputPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.endpointInput,
                  {
                    backgroundColor: isDark ? "#0A0D14" : "#FFFFFF",
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  },
                ]}
              />
            </View>

            {/* Test Connection Output */}
            {testResult && (
              <View
                style={[
                  styles.testResultBanner,
                  testResult.status === "ready"
                    ? styles.testResultSuccess
                    : styles.testResultFail,
                ]}
              >
                <Text
                  style={[
                    styles.testResultText,
                    testResult.status === "ready"
                      ? { color: "#10B981" }
                      : { color: "#F43F5E" },
                  ]}
                >
                  {testResult.status === "ready"
                    ? `Ready • ${testResult.latencyMs}ms`
                    : testResult.message}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                onPress={handleTestConnection}
                disabled={testing}
                activeOpacity={0.7}
                style={[
                  styles.secondaryBtn,
                  { borderColor: theme.border },
                ]}
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <RefreshCw size={13} color={theme.textPrimary} />
                    <Text
                      style={[
                        styles.secondaryBtnText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Test
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveUrl}
                disabled={saving}
                activeOpacity={0.7}
                style={styles.primaryBtn}
              >
                <Check size={14} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Reset Default */}
            <TouchableOpacity
              onPress={handleResetDefault}
              activeOpacity={0.7}
              style={styles.resetDefaultLink}
            >
              <Text
                style={[
                  styles.resetDefaultText,
                  { color: theme.textSecondary },
                ]}
              >
                Reset to Default Endpoint
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  touchTarget44: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  hamburgerIcon: {
    gap: 5,
    justifyContent: "center",
  },
  hamburgerBar: {
    height: 2.2,
    borderRadius: 2,
  },
  modelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  modelPillText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avatarContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  drawerSheet: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: Math.min(width * 0.82, 320),
    borderRightWidth: 1,
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  drawerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  drawerCloseButton: {
    padding: 6,
  },
  drawerNewChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  drawerNewChatText: {
    fontSize: 14,
    fontWeight: "600",
  },
  drawerStatusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  drawerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  drawerStatusLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  configServerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  configServerText: {
    fontSize: 11,
    fontWeight: "500",
  },
  drawerFooter: {
    marginTop: "auto",
    paddingTop: 16,
  },
  themeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 13,
    fontWeight: "500",
  },
  configModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: RADII.modal,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  configModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  configHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  configModalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalCloseBtn: {
    padding: 4,
  },
  healthReadoutBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  healthReadoutText: {
    fontSize: 12,
    fontWeight: "500",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  endpointInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "monospace",
  },
  testResultBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  testResultSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  testResultFail: {
    backgroundColor: "rgba(244, 63, 94, 0.12)",
  },
  testResultText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  resetDefaultLink: {
    alignSelf: "center",
    marginTop: 4,
  },
  resetDefaultText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
