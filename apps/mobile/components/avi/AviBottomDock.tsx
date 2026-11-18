import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Camera,
  FileText,
  Image as ImageIcon,
  Mic,
  Plus,
  Send,
  Shield,
  ShieldCheck,
  Square,
  X,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import { useAppTheme } from "../../constants/themeContext";
import { RADII } from "../../constants/theme";
import { PreparedImage } from "../../services/aviClient";

const AnimatedView = Animated.View as any;

interface AviBottomDockProps {
  input: string;
  onInputChange: (text: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  selectedImage: PreparedImage | null;
  onClearImage: () => void;
  onTakePhoto: () => void;
  onPickGallery: () => void;
  includeHealthProfile: boolean;
  onToggleHealthProfile: () => void;
  mode: "chat" | "scan";
  onModeChange: (mode: "chat" | "scan") => void;
  inputRef?: React.RefObject<any>;
}

export function AviBottomDock({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isStreaming,
  selectedImage,
  onClearImage,
  onTakePhoto,
  onPickGallery,
  includeHealthProfile,
  onToggleHealthProfile,
  mode,
  onModeChange,
  inputRef,
}: AviBottomDockProps) {
  const { theme, isDark } = useAppTheme();
  const [trayOpen, setTrayOpen] = useState(false);

  const canSend = Boolean(input.trim() || selectedImage) && !isStreaming;

  const handleModePress = (newMode: "chat" | "scan") => {
    onModeChange(newMode);
    if (newMode === "scan") {
      onTakePhoto();
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* ── Mode Segmented Pill (Floating Above Dock) ─────────────────────── */}
      <View style={styles.modePillRow}>
        <View
          style={[
            styles.modePillContainer,
            {
              backgroundColor: isDark ? "rgba(18, 21, 28, 0.9)" : "#F1F5F9",
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            accessibilityLabel="Chat Mode"
            onPress={() => handleModePress("chat")}
            activeOpacity={0.8}
            style={[
              styles.modeSegment,
              mode === "chat" && [
                styles.modeSegmentActive,
                {
                  backgroundColor: isDark ? "#1C212C" : "#FFFFFF",
                  borderColor: isDark ? theme.border : "#CBD5E1",
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.modeSegmentText,
                {
                  color:
                    mode === "chat" ? theme.textPrimary : theme.textSecondary,
                  fontWeight: mode === "chat" ? "600" : "500",
                },
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Scan Prescription Mode"
            onPress={() => handleModePress("scan")}
            activeOpacity={0.8}
            style={[
              styles.modeSegment,
              mode === "scan" && [
                styles.modeSegmentActive,
                {
                  backgroundColor: isDark ? "#1C212C" : "#FFFFFF",
                  borderColor: isDark ? theme.border : "#CBD5E1",
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.modeSegmentText,
                {
                  color:
                    mode === "scan" ? theme.textPrimary : theme.textSecondary,
                  fontWeight: mode === "scan" ? "600" : "500",
                },
              ]}
            >
              Scan Rx
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Capsule Expandable Tray (+ Menu) ──────────────────────────────── */}
      {trayOpen && (
        <AnimatedView
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(150)}
          style={[
            styles.trayCard,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.borderActive,
            },
          ]}
        >
          <View style={styles.trayRow}>
            {/* Camera */}
            <TouchableOpacity
              onPress={() => {
                setTrayOpen(false);
                onTakePhoto();
              }}
              activeOpacity={0.7}
              style={[
                styles.trayOptionBtn,
                {
                  backgroundColor: isDark ? "#12151C" : "#F8FAFC",
                  borderColor: theme.border,
                },
              ]}
            >
              <Camera size={18} color="#38BDF8" />
              <Text
                style={[
                  styles.trayOptionText,
                  { color: theme.textPrimary },
                ]}
              >
                Camera
              </Text>
            </TouchableOpacity>

            {/* Gallery */}
            <TouchableOpacity
              onPress={() => {
                setTrayOpen(false);
                onPickGallery();
              }}
              activeOpacity={0.7}
              style={[
                styles.trayOptionBtn,
                {
                  backgroundColor: isDark ? "#12151C" : "#F8FAFC",
                  borderColor: theme.border,
                },
              ]}
            >
              <ImageIcon size={18} color="#A78BFA" />
              <Text
                style={[
                  styles.trayOptionText,
                  { color: theme.textPrimary },
                ]}
              >
                Gallery
              </Text>
            </TouchableOpacity>

            {/* Health Passport Context Toggle */}
            <TouchableOpacity
              onPress={() => {
                onToggleHealthProfile();
              }}
              activeOpacity={0.7}
              style={[
                styles.trayOptionBtn,
                {
                  backgroundColor: includeHealthProfile
                    ? "rgba(16, 185, 129, 0.12)"
                    : isDark
                    ? "#12151C"
                    : "#F8FAFC",
                  borderColor: includeHealthProfile
                    ? "#10B981"
                    : theme.border,
                },
              ]}
            >
              {includeHealthProfile ? (
                <ShieldCheck size={18} color="#10B981" />
              ) : (
                <Shield size={18} color={theme.textMuted} />
              )}
              <Text
                style={[
                  styles.trayOptionText,
                  {
                    color: includeHealthProfile
                      ? "#10B981"
                      : theme.textSecondary,
                  },
                ]}
              >
                Passport
              </Text>
            </TouchableOpacity>
          </View>
        </AnimatedView>
      )}

      {/* ── Image Attachment Strip (if image selected) ────────────────────── */}
      {selectedImage && (
        <View
          style={[
            styles.attachedImageStrip,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Image
            source={{ uri: selectedImage.uri }}
            style={styles.attachedThumbnail}
            resizeMode="cover"
          />
          <View style={styles.attachedMeta}>
            <Text
              style={[
                styles.attachedName,
                { color: theme.textPrimary },
              ]}
              numberOfLines={1}
            >
              {selectedImage.name}
            </Text>
            <Text style={[styles.attachedSize, { color: theme.textMuted }]}>
              {selectedImage.sizeBytes
                ? `${Math.round(selectedImage.sizeBytes / 1024)} KB`
                : "Image attached"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClearImage}
            activeOpacity={0.7}
            style={styles.clearImageBtn}
          >
            <X size={15} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Floating Capsule Dock (Exact Gemini Spatial Layout) ───────────── */}
      <View
        style={[
          styles.dockCapsule,
          {
            backgroundColor: theme.dockBg,
            borderColor: theme.dockBorder,
            shadowColor: "#3B82F6",
          },
        ]}
      >
        {/* Left: '+' Attachment Button */}
        <TouchableOpacity
          accessibilityLabel="Add Attachments"
          onPress={() => setTrayOpen((prev) => !prev)}
          activeOpacity={0.7}
          style={styles.dockIconButton}
        >
          <Plus
            size={22}
            color={trayOpen ? "#3B82F6" : theme.textPrimary}
            style={trayOpen ? { transform: [{ rotate: "45deg" }] } : undefined}
          />
        </TouchableOpacity>

        {/* Center: Borderless Clean TextInput */}
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={onInputChange}
          placeholder="Ask Avi"
          placeholderTextColor={theme.inputPlaceholder}
          multiline
          maxLength={800}
          editable={!isStreaming}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (canSend) onSubmit();
          }}
          blurOnSubmit={false}
          style={[
            styles.dockInput,
            { color: theme.textPrimary },
          ]}
        />

        {/* Right: Mic Button */}
        <TouchableOpacity
          accessibilityLabel="Voice Input"
          activeOpacity={0.7}
          style={styles.dockIconButton}
        >
          <Mic size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Right: Circular Send / Waveform / Stop Button */}
        {isStreaming ? (
          <TouchableOpacity
            accessibilityLabel="Stop Generation"
            onPress={onStop}
            activeOpacity={0.8}
            style={[styles.dockActionButton, styles.dockStopButton]}
          >
            <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            accessibilityLabel="Send Query"
            onPress={() => {
              if (canSend) onSubmit();
            }}
            disabled={!canSend}
            activeOpacity={canSend ? 0.8 : 1}
            style={[
              styles.dockActionButton,
              canSend
                ? styles.dockSendActive
                : [
                    styles.dockSendInactive,
                    {
                      backgroundColor: isDark
                        ? "#1C212C"
                        : "#E2E8F0",
                    },
                  ],
            ]}
          >
            <Send
              size={15}
              color={canSend ? "#FFFFFF" : theme.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  modePillRow: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modePillContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADII.pill,
    borderWidth: 1,
    padding: 3,
  },
  modeSegment: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modeSegmentActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  modeSegmentText: {
    fontSize: 13,
  },
  trayCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  trayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    gap: 8,
  },
  trayOptionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  trayOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  attachedImageStrip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  attachedThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  attachedMeta: {
    flex: 1,
    marginLeft: 10,
  },
  attachedName: {
    fontSize: 12,
    fontWeight: "600",
  },
  attachedSize: {
    fontSize: 10,
    marginTop: 2,
  },
  clearImageBtn: {
    padding: 6,
  },
  dockCapsule: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADII.dock,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 56,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  dockIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dockInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dockActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  dockSendActive: {
    backgroundColor: "#3B82F6",
  },
  dockSendInactive: {},
  dockStopButton: {
    backgroundColor: "#F43F5E",
  },
});
