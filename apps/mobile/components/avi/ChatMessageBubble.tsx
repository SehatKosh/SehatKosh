import React, { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertCircle,
  Check,
  Edit2,
  RefreshCw,
  Sparkles,
} from "lucide-react-native";
import { useAppTheme } from "../../constants/themeContext";
import { RADII } from "../../constants/theme";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: string;
  imageUrl?: string;
  imageName?: string;
  isStreaming?: boolean;
  isGrounded?: boolean;
  latencyMs?: number;
  errorDetail?: string;
  extractedMedications?: Array<{ name: string; dosage: string; confirmed?: boolean }>;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
  onConfirmMedication?: (medName: string) => void;
}

export function ChatMessageBubble({
  message,
  onRetry,
  onConfirmMedication,
}: ChatMessageBubbleProps) {
  const { theme, isDark } = useAppTheme();
  const [showCursor, setShowCursor] = useState(true);

  // Blinking cursor during streaming
  useEffect(() => {
    if (!message.isStreaming) return;
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 450);
    return () => clearInterval(interval);
  }, [message.isStreaming]);

  // ── 1. User Message (Rounded Right-Aligned Capsule) ────────────────────────
  if (message.role === "user") {
    return (
      <View style={styles.userContainer}>
        <View
          style={[
            styles.userBubble,
            {
              backgroundColor: isDark ? "#1C212C" : "#0284C7",
              borderColor: isDark ? theme.border : "transparent",
            },
          ]}
        >
          {message.imageUrl && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: message.imageUrl }}
                style={styles.attachedImage}
                resizeMode="cover"
              />
              {message.imageName && (
                <View style={styles.imageNameBadge}>
                  <Text style={styles.imageNameText} numberOfLines={1}>
                    {message.imageName}
                  </Text>
                </View>
              )}
            </View>
          )}

          {message.content ? (
            <Text
              style={[
                styles.userText,
                { color: isDark ? theme.textPrimary : "#FFFFFF" },
              ]}
            >
              {message.content}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.timestampText, { color: theme.textMuted }]}>
          {message.timestamp}
        </Text>
      </View>
    );
  }

  // ── 2. Error Message (Subtle Connection Interrupted Pill) ───────────────────
  if (message.role === "error") {
    return (
      <View style={styles.errorContainer}>
        <View
          style={[
            styles.errorBubble,
            {
              backgroundColor: isDark ? "#2A141A" : "#FFF1F2",
              borderColor: isDark ? "rgba(244, 63, 94, 0.3)" : "#FECDD3",
            },
          ]}
        >
          <View style={styles.errorHeader}>
            <AlertCircle size={15} color="#F43F5E" />
            <Text style={styles.errorTitle}>Connection interrupted</Text>
          </View>

          <Text
            style={[
              styles.errorText,
              { color: isDark ? "#FDA4AF" : "#9F1239" },
            ]}
          >
            {message.content}
          </Text>

          {onRetry && (
            <TouchableOpacity
              onPress={() => onRetry(message)}
              activeOpacity={0.7}
              style={[
                styles.retryPill,
                {
                  backgroundColor: isDark ? "#3F1824" : "#FFE4E6",
                  borderColor: isDark ? "rgba(244, 63, 94, 0.4)" : "#FDA4AF",
                },
              ]}
            >
              <RefreshCw size={12} color="#F43F5E" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── 3. Avi Response (Borderless Minimalist Typography) ─────────────────────
  // Matches Gemini Mobile: borderless text directly on canvas, generous whitespace
  return (
    <View style={styles.assistantContainer}>
      {/* Response Content with bold typography */}
      <View style={styles.assistantContentWrapper}>
        <Text
          style={[
            styles.assistantText,
            { color: theme.textPrimary },
          ]}
        >
          {message.content}
          {message.isStreaming && (
            <Text style={{ color: "#3B82F6", fontWeight: "700" }}>
              {showCursor ? " ▌" : " "}
            </Text>
          )}
        </Text>
      </View>

      {/* Interactive Prescription / Medication Verification Chips if extracted */}
      {message.extractedMedications && message.extractedMedications.length > 0 && (
        <View
          style={[
            styles.medicationsCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          {message.extractedMedications.map((med, idx) => (
            <View key={idx} style={styles.medRow}>
              <View style={styles.medInfo}>
                <Text
                  style={[styles.medName, { color: theme.textPrimary }]}
                  numberOfLines={1}
                >
                  {med.name}
                </Text>
                <Text
                  style={[styles.medDosage, { color: theme.textSecondary }]}
                >
                  {med.dosage}
                </Text>
              </View>

              <View style={styles.chipActions}>
                <TouchableOpacity
                  onPress={() => onConfirmMedication?.(med.name)}
                  activeOpacity={0.7}
                  style={[
                    styles.confirmChip,
                    med.confirmed && styles.confirmChipActive,
                  ]}
                >
                  <Check
                    size={12}
                    color={med.confirmed ? "#FFFFFF" : "#10B981"}
                  />
                  <Text
                    style={[
                      styles.confirmChipText,
                      med.confirmed && styles.confirmChipTextActive,
                    ]}
                  >
                    {med.confirmed ? "Confirmed" : "Confirm"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.editChip, { borderColor: theme.border }]}
                >
                  <Edit2 size={11} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Latency & Timestamp Readout */}
      <View style={styles.metaRow}>
        <Text style={[styles.timestampText, { color: theme.textMuted }]}>
          {message.timestamp}
        </Text>
        {message.latencyMs !== undefined && (
          <Text style={[styles.latencyText, { color: theme.textMuted }]}>
            {(message.latencyMs / 1000).toFixed(1)}s
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    marginBottom: 16,
    maxWidth: "84%",
    alignSelf: "flex-end",
  },
  userBubble: {
    borderRadius: RADII.bubble,
    borderTopRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  userText: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400",
  },
  imagePreviewContainer: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  attachedImage: {
    width: "100%",
    height: 160,
  },
  imageNameBadge: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imageNameText: {
    fontSize: 11,
    color: "#FFFFFF",
  },
  timestampText: {
    marginTop: 4,
    fontSize: 11,
    alignSelf: "flex-end",
    fontVariant: ["tabular-nums"],
  },
  errorContainer: {
    marginBottom: 16,
    maxWidth: "92%",
    alignSelf: "flex-start",
  },
  errorBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F43F5E",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  retryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F43F5E",
  },
  assistantContainer: {
    marginBottom: 20,
    width: "100%",
    alignSelf: "flex-start",
    paddingHorizontal: 4,
  },
  assistantContentWrapper: {
    width: "100%",
  },
  assistantText: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "400",
    letterSpacing: -0.2,
  },
  medicationsCard: {
    marginTop: 14,
    borderRadius: RADII.card,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  medInfo: {
    flex: 1,
    marginRight: 10,
  },
  medName: {
    fontSize: 14,
    fontWeight: "600",
  },
  medDosage: {
    fontSize: 12,
    marginTop: 2,
  },
  chipActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  confirmChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  confirmChipActive: {
    backgroundColor: "#10B981",
  },
  confirmChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981",
  },
  confirmChipTextActive: {
    color: "#FFFFFF",
  },
  editChip: {
    padding: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  latencyText: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
});
