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
  Image as ImageIcon,
  Paperclip,
  Send,
  Square,
  X,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import { useTheme } from "../../context/ThemeContext";
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
  inputRef,
}: AviBottomDockProps) {
  const { colors, isDark } = useTheme();
  const [trayOpen, setTrayOpen] = useState(false);

  const canSend = Boolean(input.trim() || selectedImage) && !isStreaming;

  return (
    <View style={styles.outerContainer}>
      {/* ── Capsule Expandable Tray (Camera & Gallery ONLY) ────────────────── */}
      {trayOpen && (
        <AnimatedView
          entering={FadeInDown.duration(160)}
          exiting={FadeOutDown.duration(140)}
          style={[
            styles.trayCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderStrong,
            },
          ]}
        >
          <View style={styles.trayRow}>
            {/* Camera Option */}
            <TouchableOpacity
              onPress={() => {
                setTrayOpen(false);
                onTakePhoto();
              }}
              activeOpacity={0.7}
              style={[
                styles.trayOptionBtn,
                {
                  backgroundColor: isDark ? "#141822" : "#F8FAFC",
                  borderColor: colors.border,
                },
              ]}
            >
              <Camera size={19} color="#38BDF8" />
              <Text
                style={[
                  styles.trayOptionText,
                  { color: colors.textPrimary },
                ]}
              >
                Camera
              </Text>
            </TouchableOpacity>

            {/* Gallery Option */}
            <TouchableOpacity
              onPress={() => {
                setTrayOpen(false);
                onPickGallery();
              }}
              activeOpacity={0.7}
              style={[
                styles.trayOptionBtn,
                {
                  backgroundColor: isDark ? "#141822" : "#F8FAFC",
                  borderColor: colors.border,
                },
              ]}
            >
              <ImageIcon size={19} color="#A78BFA" />
              <Text
                style={[
                  styles.trayOptionText,
                  { color: colors.textPrimary },
                ]}
              >
                Gallery
              </Text>
            </TouchableOpacity>
          </View>
        </AnimatedView>
      )}

      {/* ── Image Attachment Strip (if attached) ───────────────────────────── */}
      {selectedImage && (
        <View
          style={[
            styles.attachedImageStrip,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
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
                { color: colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {selectedImage.name}
            </Text>
            <Text style={[styles.attachedSize, { color: colors.textMuted }]}>
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
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Taller Ergonomic Floating Dock Capsule (minHeight: 62, borderRadius: 31) ── */}
      <View
        style={[
          styles.dockCapsule,
          {
            backgroundColor: colors.dockBg,
            borderColor: colors.dockBorder,
          },
        ]}
      >
        {/* Left: Paperclip Button (44x44px touch target) */}
        <TouchableOpacity
          accessibilityLabel="Attach Prescription or Lab Document"
          onPress={() => setTrayOpen((prev) => !prev)}
          activeOpacity={0.7}
          style={styles.touchTarget44}
        >
          <Paperclip
            size={20}
            color={trayOpen ? "#38BDF8" : colors.textPrimary}
          />
        </TouchableOpacity>

        {/* Center: Borderless Clean TextInput */}
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={onInputChange}
          placeholder="Ask Avi"
          placeholderTextColor={colors.textMuted}
          multiline={true}
          scrollEnabled={true}
          textAlignVertical="center"
          maxLength={800}
          editable={!isStreaming}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (canSend) onSubmit();
          }}
          blurOnSubmit={false}
          style={[
            styles.dockInput,
            { color: colors.textPrimary },
          ]}
        />

        {/* Right: Circular Send / Stop Button ONLY (No Mic) */}
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
              size={16}
              color={canSend ? "#FFFFFF" : colors.textMuted}
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
    paddingTop: 6,
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
    gap: 12,
  },
  trayOptionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  trayOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  attachedImageStrip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 8,
  },
  attachedThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 10,
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
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  touchTarget44: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dockInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 112,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: "center",
  },
  dockActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  dockSendActive: {
    backgroundColor: "#3B82F6",
  },
  dockSendInactive: {},
  dockStopButton: {
    backgroundColor: "#EF4444",
  },
});
