import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
  MessageSquarePlus,
  RefreshCw,
  Server,
  Trash2,
  X,
} from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
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
  onClearHistory: () => void;
}

export function AviHeaderControls({
  health,
  onRefreshHealth,
  isCheckingHealth,
  onNewChat,
  onClearHistory,
}: AviHeaderControlsProps) {
  const { colors, isDark } = useTheme();

  // Modals state
  const [menuOpen, setMenuOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // Server IP config state
  const [inputUrl, setInputUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AviHealthResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const openServerConfig = async () => {
    setMenuOpen(false);
    const current = await getAviBaseUrl();
    setInputUrl(current);
    setTestResult(null);
    setConfigOpen(true);
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
      setConfigOpen(false);
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
      setConfigOpen(false);
      onRefreshHealth();
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = () => {
    switch (health.status) {
      case "ready":
        return "#10B981";
      case "loading":
        return "#F59E0B";
      case "unavailable":
        return "#FB923C";
      default:
        return "#EF4444";
    }
  };

  return (
    <>
      {/* ── 2-Element Top Header: Menu on Left, Status Pill in Center, Right EMPTY ── */}
      <View style={styles.headerBar}>
        {/* Left: 44x44px Menu Button */}
        <TouchableOpacity
          accessibilityLabel="Open Assistant Menu"
          onPress={() => setMenuOpen(true)}
          activeOpacity={0.7}
          style={styles.touchTarget44}
        >
          <View style={styles.hamburgerIcon}>
            <View
              style={[
                styles.hamburgerBar,
                { backgroundColor: colors.textPrimary, width: 20 },
              ]}
            />
            <View
              style={[
                styles.hamburgerBar,
                { backgroundColor: colors.textPrimary, width: 14 },
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* Center: Clean Status Pill (● Avi MedGemma) */}
        <TouchableOpacity
          accessibilityLabel="Server Status and Config"
          onPress={openServerConfig}
          activeOpacity={0.7}
          style={[
            styles.modelPill,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
              borderColor: colors.border,
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
              { color: colors.textPrimary },
            ]}
          >
            Avi MedGemma
          </Text>
          <ChevronDown size={14} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Right: EMPTY 44px spacer for optical symmetry */}
        <View style={styles.touchTarget44} />
      </View>

      {/* ── Unmountable Menu Modal (Renders null when closed) ────────────────── */}
      {menuOpen && (
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  style={[
                    styles.menuCard,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Menu Header */}
                  <View style={styles.menuHeaderRow}>
                    <Text
                      style={[
                        styles.menuTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Avi Assistant
                    </Text>
                    <TouchableOpacity
                      onPress={() => setMenuOpen(false)}
                      activeOpacity={0.7}
                      style={[
                        styles.closeBtn,
                        { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" },
                      ]}
                    >
                      <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Actions */}
                  <View style={styles.menuActions}>
                    {/* (1) New Conversation */}
                    <TouchableOpacity
                      onPress={() => {
                        setMenuOpen(false);
                        onNewChat();
                      }}
                      activeOpacity={0.7}
                      style={[
                        styles.menuActionItem,
                        {
                          backgroundColor: isDark ? "#141822" : "#F8FAFC",
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <MessageSquarePlus size={18} color="#38BDF8" />
                      <Text
                        style={[
                          styles.menuActionText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        New Conversation
                      </Text>
                    </TouchableOpacity>

                    {/* (2) Avi Server IP Config */}
                    <TouchableOpacity
                      onPress={openServerConfig}
                      activeOpacity={0.7}
                      style={[
                        styles.menuActionItem,
                        {
                          backgroundColor: isDark ? "#141822" : "#F8FAFC",
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Server size={18} color="#10B981" />
                      <View style={styles.menuActionMeta}>
                        <Text
                          style={[
                            styles.menuActionText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          Avi Server IP Config
                        </Text>
                        <Text
                          style={[
                            styles.menuActionSub,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {health.status === "ready"
                            ? "Connected (RTX 4000 Ada)"
                            : "Offline / Switch IP"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* (3) Clear Chat History */}
                    <TouchableOpacity
                      onPress={() => {
                        setMenuOpen(false);
                        onClearHistory();
                      }}
                      activeOpacity={0.7}
                      style={[
                        styles.menuActionItem,
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
                      <Trash2 size={18} color="#EF4444" />
                      <Text
                        style={[
                          styles.menuActionText,
                          { color: "#EF4444" },
                        ]}
                      >
                        Clear Chat History
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* ── Unmountable Server IP Config Modal ──────────────────────────────── */}
      {configOpen && (
        <Modal
          visible={configOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setConfigOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => setConfigOpen(false)}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  style={[
                    styles.configModalCard,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.borderStrong,
                    },
                  ]}
                >
                  <View style={styles.menuHeaderRow}>
                    <View style={styles.configHeaderTitleRow}>
                      <Server size={18} color="#3B82F6" />
                      <Text
                        style={[
                          styles.menuTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Avi GPU Server IP
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setConfigOpen(false)}
                      activeOpacity={0.7}
                      style={[
                        styles.closeBtn,
                        { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" },
                      ]}
                    >
                      <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Readout */}
                  <View
                    style={[
                      styles.healthReadoutBadge,
                      {
                        backgroundColor: isDark ? "#0D1117" : "#F1F5F9",
                        borderColor: colors.border,
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
                        { color: colors.textPrimary },
                      ]}
                    >
                      {health.status === "ready"
                        ? "Connected • MedGemma 1.5 4B (RTX 4000 Ada)"
                        : health.message}
                    </Text>
                  </View>

                  {/* Input */}
                  <View style={styles.inputGroup}>
                    <Text
                      style={[
                        styles.inputLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Server Endpoint URL
                    </Text>
                    <TextInput
                      value={inputUrl}
                      onChangeText={setInputUrl}
                      placeholder="http://172.17.170.87:10000"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[
                        styles.endpointInput,
                        {
                          backgroundColor: isDark ? "#0A0D14" : "#FFFFFF",
                          borderColor: colors.border,
                          color: colors.textPrimary,
                        },
                      ]}
                    />
                  </View>

                  {/* Test Result */}
                  {testResult && (
                    <View
                      style={[
                        styles.testBanner,
                        testResult.status === "ready"
                          ? styles.testSuccess
                          : styles.testFail,
                      ]}
                    >
                      <Text
                        style={[
                          styles.testBannerText,
                          {
                            color:
                              testResult.status === "ready"
                                ? "#10B981"
                                : "#EF4444",
                          },
                        ]}
                      >
                        {testResult.status === "ready"
                          ? `Ready • ${testResult.latencyMs}ms latency`
                          : testResult.message}
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.modalActionRow}>
                    <TouchableOpacity
                      onPress={handleTestConnection}
                      disabled={testing}
                      activeOpacity={0.7}
                      style={[
                        styles.secondaryBtn,
                        { borderColor: colors.border },
                      ]}
                    >
                      {testing ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <>
                          <RefreshCw size={13} color={colors.textPrimary} />
                          <Text
                            style={[
                              styles.secondaryBtnText,
                              { color: colors.textPrimary },
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
                        { color: colors.textSecondary },
                      ]}
                    >
                      Reset to Default Lab Endpoint
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </>
  );
}

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
    gap: 6,
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
    borderRadius: 9999,
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
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  menuCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  menuHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  menuActions: {
    gap: 10,
  },
  menuActionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  menuActionMeta: {
    flex: 1,
  },
  menuActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  menuActionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  configModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 24,
  },
  configHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "monospace",
  },
  testBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  testSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  testFail: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  testBannerText: {
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
    paddingVertical: 12,
    borderRadius: 14,
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
    paddingVertical: 12,
    borderRadius: 14,
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
