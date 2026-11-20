/**
 * SehatKosh Mobile — In-App Update Notification Modal
 *
 * Prompts the user when a new release is available on GitHub.
 * Displays version delta, release notes, file size, and provides a direct
 * download button to install the release in-place without losing local data.
 */

import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowDownCircle, Sparkles, X, ShieldCheck, HardDrive } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import type { UpdateCheckResult } from "../services/appUpdater";

interface UpdateAvailableModalProps {
  visible: boolean;
  updateInfo: UpdateCheckResult | null;
  onClose: () => void;
}

export function UpdateAvailableModal({
  visible,
  updateInfo,
  onClose,
}: UpdateAvailableModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  if (!updateInfo) return null;

  const handleDownload = async () => {
    if (updateInfo.downloadUrl) {
      try {
        await Linking.openURL(updateInfo.downloadUrl);
      } catch (err) {
        console.error("[UpdateAvailableModal] Failed to open download URL:", err);
      }
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  paddingBottom: Math.max(insets.bottom, 20),
                },
              ]}
            >
              {/* Header Icon & Close Button */}
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(14, 165, 233, 0.15)"
                        : "#E0F2FE",
                    },
                  ]}
                >
                  <ArrowDownCircle size={28} color="#0284C7" />
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.closeButton,
                    { backgroundColor: isDark ? colors.surfaceElevated : "#F1F5F9" },
                  ]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Title & Version Meta */}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                New Update Available
              </Text>

              <View style={styles.versionBadgesRow}>
                <View
                  style={[
                    styles.badgePill,
                    {
                      backgroundColor: isDark
                        ? "rgba(16, 185, 129, 0.15)"
                        : "#DCFCE7",
                      borderColor: isDark
                        ? "rgba(16, 185, 129, 0.3)"
                        : "#BBF7D0",
                    },
                  ]}
                >
                  <Sparkles size={13} color="#10B981" />
                  <Text style={[styles.badgeText, { color: "#10B981" }]}>
                    v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
                  </Text>
                </View>

                {updateInfo.assetSizeMb && (
                  <View
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor: isDark
                          ? "rgba(148, 163, 184, 0.15)"
                          : "#F1F5F9",
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <HardDrive size={13} color={colors.textSecondary} />
                    <Text
                      style={[
                        styles.badgeText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {updateInfo.assetSizeMb}
                    </Text>
                  </View>
                )}
              </View>

              {/* Release Notes */}
              <Text
                style={[
                  styles.sectionHeading,
                  { color: colors.textSecondary },
                ]}
              >
                Release Highlights
              </Text>

              <ScrollView
                style={[
                  styles.notesCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
                contentContainerStyle={styles.notesContent}
                showsVerticalScrollIndicator={true}
              >
                <Text
                  style={[
                    styles.notesText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {updateInfo.releaseNotes ||
                    "This update includes stability improvements, enhanced offline synchronization, and latest telemetry optimizations for SehatKosh."}
                </Text>
              </ScrollView>

              {/* In-Place Upgrade Data Safety Notice */}
              <View
                style={[
                  styles.safetyNotice,
                  {
                    backgroundColor: isDark
                      ? "rgba(2, 132, 199, 0.08)"
                      : "#F0F9FF",
                    borderColor: isDark
                      ? "rgba(2, 132, 199, 0.2)"
                      : "#BAE6FD",
                  },
                ]}
              >
                <ShieldCheck size={16} color="#0284C7" style={{ marginTop: 1 }} />
                <Text style={styles.safetyText}>
                  Your local health records, scanned prescriptions, and smartwatch
                  telemetry will be safely preserved during this update.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  onPress={handleDownload}
                  style={styles.primaryButton}
                  activeOpacity={0.8}
                >
                  <ArrowDownCircle size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    Download Update
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceElevated
                        : "#F1F5F9",
                      borderColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Later
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  versionBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  notesCard: {
    maxHeight: 140,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  notesContent: {
    padding: 14,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 20,
  },
  safetyNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  safetyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: "#0284C7",
    fontWeight: "500",
  },
  actionsContainer: {
    gap: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0284C7",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
