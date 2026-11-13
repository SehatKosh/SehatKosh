import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Camera,
  Cpu,
  Image as ImageIcon,
  MessageSquarePlus,
  RotateCcw,
  Send,
  Shield,
  ShieldCheck,
  Square,
  X,
} from "lucide-react-native";

import {
  AviHealthResponse,
  checkAviHealth,
  prepareImageForAvi,
  PreparedImage,
  streamAviChat,
} from "../../services/aviClient";
import {
  buildGroundedPrompt,
  validatePrompt,
} from "../../services/promptGuard";
import { AviStatusHeader } from "../../components/avi/AviStatusHeader";
import {
  ChatMessage,
  ChatMessageBubble,
} from "../../components/avi/ChatMessageBubble";
import { ThinkingIndicator } from "../../components/avi/ThinkingIndicator";

const STARTER_PROMPTS = [
  "Check my active medications for adverse interactions.",
  "What precautions should I take with my penicillin allergy?",
  "Review my hypertension medications and suggest questions for my doctor.",
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome-1",
    role: "assistant",
    content:
      "Hello! I am Avi, your clinical AI assistant powered by MedGemma 1.5 4B. " +
      "I can analyze your health passport, review prescription photos, check for drug interactions, and explain lab findings.",
    timestamp: "Just now",
    isGrounded: false,
  },
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const textInputRef = useRef<any>(null);

  // ── Server Health State ───────────────────────────────────────────────────
  const [health, setHealth] = useState<AviHealthResponse>({
    status: "loading",
    message: "Connecting to Avi...",
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // ── Chat & Multimodal State ───────────────────────────────────────────────
  const [input, setInput] = useState("");
  const inputRef = useRef("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [includeHealthProfile, setIncludeHealthProfile] = useState(true);
  const [selectedImage, setSelectedImage] = useState<PreparedImage | null>(null);

  // ── Streaming State ───────────────────────────────────────────────────────
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStage, setStreamingStage] = useState<
    "uploading" | "queued" | "generating"
  >("queued");
  const [requestStartTime, setRequestStartTime] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Store last failed query for retry
  const lastFailedQueryRef = useRef<{
    prompt: string;
    image: PreparedImage | null;
  } | null>(null);

  // ── Health Polling ────────────────────────────────────────────────────────
  const refreshHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const res = await checkAviHealth();
      setHealth(res);
    } catch {
      setHealth({
        status: "unreachable",
        message: "Lab Server Unreachable",
      });
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    refreshHealth();

    const interval = setInterval(() => {
      if (!isStreaming) {
        refreshHealth();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [refreshHealth, isStreaming]);

  // ── Stop Generation Handler ───────────────────────────────────────────────
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setRequestStartTime(null);

    setMessages((prev) =>
      prev.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg
      )
    );
  }, []);

  // ── Hardware Back Button Handler (Android) ────────────────────────────────
  useEffect(() => {
    const handleHardwareBack = () => {
      if (selectedImage) {
        setSelectedImage(null);
        return true;
      }
      if (isStreaming) {
        handleStopGeneration();
        return true;
      }
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      router.replace("/(tabs)/activity");
      return true;
    };

    const backSubscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleHardwareBack
    );

    return () => backSubscription.remove();
  }, [selectedImage, isStreaming, handleStopGeneration]);

  // ── Image Attachment Handling ─────────────────────────────────────────────
  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const prepared = await prepareImageForAvi(result.assets[0].uri);
        setSelectedImage(prepared);
      }
    } catch (err: any) {
      Alert.alert(
        "Image Selection Failed",
        err.message || "Could not select photo."
      );
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera access in settings to photograph prescriptions."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const prepared = await prepareImageForAvi(result.assets[0].uri);
        setSelectedImage(prepared);
      }
    } catch (err: any) {
      Alert.alert("Camera Error", err.message || "Could not capture photo.");
    }
  };

  // ── Send Message Handler ──────────────────────────────────────────────────
  const handleSend = useCallback(
    async (textOverride?: string, imageOverride?: PreparedImage | null) => {
      const userText = (
        typeof textOverride === "string" ? textOverride : inputRef.current || input
      ).trim();
      const currentImage =
        imageOverride !== undefined ? imageOverride : selectedImage;

      // Validate prompt & image
      const validation = validatePrompt(userText, !!currentImage);
      if (!validation.valid) {
        Alert.alert("Input Required", validation.error);
        return;
      }

      // Check if server is offline
      if (health.status === "unreachable") {
        Alert.alert(
          "Avi Server Offline",
          "Cannot reach the MedGemma GPU server. Check lab Wi-Fi or Tailscale connection.",
          [
            { text: "Retry Check", onPress: refreshHealth },
            { text: "OK" },
          ]
        );
        return;
      }

      // Construct User Message
      const userTimestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const userMessageId = `user-${Date.now()}`;
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: "user",
        content: userText,
        timestamp: userTimestamp,
        imageUrl: currentImage?.uri,
        imageName: currentImage?.name,
      };

      // Clear input fields
      inputRef.current = "";
      setInput("");
      setSelectedImage(null);

      // Dismiss soft keyboard
      Keyboard.dismiss();

      // Add user message to inverted list
      setMessages((prev) => [userMessage, ...prev]);

      // Prepare clinical prompt
      const fullPrompt = buildGroundedPrompt(userText, includeHealthProfile);

      // Setup streaming state
      setIsStreaming(true);
      const startTime = Date.now();
      setRequestStartTime(startTime);
      setStreamingStage(currentImage ? "uploading" : "queued");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const assistantMsgId = `avi-${Date.now()}`;
      let hasCreatedAssistantBubble = false;

      try {
        await streamAviChat({
          prompt: fullPrompt,
          image: currentImage,
          signal: controller.signal,
          onStageChange: (stage) => setStreamingStage(stage),
          onDelta: (chunk) => {
            if (!hasCreatedAssistantBubble) {
              hasCreatedAssistantBubble = true;
              setRequestStartTime(null);

              const newAssistantMsg: ChatMessage = {
                id: assistantMsgId,
                role: "assistant",
                content: chunk,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                isStreaming: true,
                isGrounded: includeHealthProfile,
                latencyMs: Date.now() - startTime,
              };

              setMessages((prev) => [newAssistantMsg, ...prev]);
            } else {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: msg.content + chunk }
                    : msg
                )
              );
            }
          },
        });

        // Finalize completed streaming message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  isStreaming: false,
                  latencyMs: Date.now() - startTime,
                }
              : msg
          )
        );
      } catch (err: any) {
        if (err?.detail === "ABORTED" || err?.name === "AbortError") {
          return;
        }

        console.error("[ChatScreen] Avi streaming error:", err);
        lastFailedQueryRef.current = { prompt: userText, image: currentImage };

        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: "error",
          content: err.message || "Failed to complete clinical inquiry.",
          errorDetail: err.detail,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev) => [errorMsg, ...prev]);
      } finally {
        setIsStreaming(false);
        setRequestStartTime(null);
        abortControllerRef.current = null;
      }
    },
    [input, selectedImage, health.status, includeHealthProfile, refreshHealth]
  );

  // ── Retry Failed Query ────────────────────────────────────────────────────
  const handleRetry = useCallback(
    (failedMsg: ChatMessage) => {
      if (lastFailedQueryRef.current) {
        const { prompt, image } = lastFailedQueryRef.current;
        handleSend(prompt, image);
      } else {
        refreshHealth();
      }
    },
    [handleSend, refreshHealth]
  );

  // ── Reset Conversation ────────────────────────────────────────────────────
  const handleReset = () => {
    Alert.alert(
      "Reset Conversation",
      "Clear current clinical dialogue and history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            handleStopGeneration();
            setMessages(INITIAL_MESSAGES);
            setSelectedImage(null);
            inputRef.current = "";
            setInput("");
          },
        },
      ]
    );
  };

  const handleTextChange = (text: string) => {
    inputRef.current = text;
    setInput(text);
  };

  const canSend = Boolean(input.trim() || selectedImage) && !isStreaming;
  const topPadding = Math.max(insets.top, 16);

  return (
    <View style={[styles.rootContainer, { paddingTop: topPadding }]}>
      {/* ── 1. Top Navigation Bar ───────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            accessibilityLabel="Back to Activity"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/activity");
              }
            }}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <ArrowLeft size={18} color="#475569" />
          </TouchableOpacity>

          <View style={styles.avatarIcon}>
            <Cpu size={20} color="#FFFFFF" />
          </View>

          <View>
            <Text style={styles.titleText}>Avi Clinical Assistant</Text>
            <Text style={styles.subtitleText}>
              Google MedGemma 1.5 4B • Multimodal EMR
            </Text>
          </View>
        </View>

        <TouchableOpacity
          accessibilityLabel="Reset conversation"
          onPress={handleReset}
          activeOpacity={0.7}
          style={styles.resetButton}
        >
          <RotateCcw size={16} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* ── 2. Live Server Health Status Header ─────────────────────────── */}
      <AviStatusHeader
        health={health}
        onRefreshHealth={refreshHealth}
        isChecking={isCheckingHealth}
      />

      {/* ── 3. Chat Feed & Composer in KeyboardAvoidingView ───────────────── */}
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* Chat Messages List */}
        <FlatList
          ref={listRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          style={styles.listStyle}
          contentContainerStyle={styles.listContentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <>
              {/* Thinking Indicator */}
              {isStreaming && requestStartTime !== null && (
                <ThinkingIndicator
                  stage={streamingStage}
                  hasImage={!!selectedImage}
                  startTime={requestStartTime}
                  onCancel={handleStopGeneration}
                />
              )}

              {/* Starter Suggested Clinical Inquiries */}
              {messages.length === 1 && (
                <View style={styles.starterContainer}>
                  <Text style={styles.starterHeading}>
                    Suggested Clinical Inquiries:
                  </Text>
                  {STARTER_PROMPTS.map((prompt) => (
                    <TouchableOpacity
                      key={prompt}
                      onPress={() => handleSend(prompt)}
                      activeOpacity={0.7}
                      style={styles.starterChip}
                    >
                      <Text style={styles.starterChipText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquarePlus size={32} color="#0284C7" />
              <Text style={styles.emptyText}>
                Ask a question or upload a prescription to begin.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ChatMessageBubble message={item} onRetry={handleRetry} />
          )}
        />

        {/* ── 4. Sticky Multimodal Composer ─────────────────────────────── */}
        <View
          style={[
            styles.composerContainer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {/* Controls Bar: Context Toggle & Concurrency Pill */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={() => setIncludeHealthProfile((prev) => !prev)}
              activeOpacity={0.7}
              style={[
                styles.contextChip,
                includeHealthProfile
                  ? styles.contextChipActive
                  : styles.contextChipInactive,
              ]}
            >
              {includeHealthProfile ? (
                <ShieldCheck size={13} color="#059669" />
              ) : (
                <Shield size={13} color="#64748B" />
              )}
              <Text
                style={[
                  styles.contextChipText,
                  includeHealthProfile
                    ? styles.contextTextActive
                    : styles.contextTextInactive,
                ]}
              >
                {includeHealthProfile
                  ? "Health Passport Context: ON"
                  : "Health Passport Context: OFF"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.concurrencyText}>
              Concurrency: 1 • VRAM Isolated
            </Text>
          </View>

          {/* Image Attachment Preview Strip */}
          {selectedImage && (
            <View style={styles.imagePreviewStrip}>
              <View style={styles.imagePreviewLeft}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.imageThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.imageInfo}>
                  <Text style={styles.imageNameText} numberOfLines={1}>
                    {selectedImage.name}
                  </Text>
                  <Text style={styles.imageSubText}>
                    {selectedImage.sizeBytes
                      ? `${Math.round(selectedImage.sizeBytes / 1024)} KB • `
                      : ""}
                    Optimized JPEG
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                activeOpacity={0.7}
                style={styles.imageRemoveButton}
              >
                <X size={14} color="#475569" />
              </TouchableOpacity>
            </View>
          )}

          {/* Multimodal Input Row */}
          <View style={styles.inputRow}>
            {/* Camera Button */}
            <TouchableOpacity
              onPress={takePhotoWithCamera}
              accessibilityLabel="Scan Prescription with Camera"
              disabled={isStreaming}
              activeOpacity={0.7}
              style={styles.mediaButton}
            >
              <Camera size={18} color="#475569" />
            </TouchableOpacity>

            {/* Gallery Button */}
            <TouchableOpacity
              onPress={pickImageFromGallery}
              accessibilityLabel="Attach Photo from Gallery"
              disabled={isStreaming}
              activeOpacity={0.7}
              style={styles.mediaButton}
            >
              <ImageIcon size={18} color="#475569" />
            </TouchableOpacity>

            {/* Controlled Text Input with explicit React Native styling */}
            <View style={styles.textInputWrapper}>
              <TextInput
                ref={textInputRef}
                value={input}
                onChangeText={handleTextChange}
                multiline
                maxLength={800}
                placeholder={
                  selectedImage
                    ? "Add notes or question for this image..."
                    : "Ask Avi about medications, vitals, or symptoms..."
                }
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
                editable={!isStreaming}
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (canSend) {
                    handleSend();
                  }
                }}
                blurOnSubmit={false}
              />
            </View>

            {/* Action Button: Dynamic Send or Stop */}
            {isStreaming ? (
              <TouchableOpacity
                accessibilityLabel="Stop Generating"
                onPress={handleStopGeneration}
                activeOpacity={0.7}
                style={[styles.actionButton, styles.stopButton]}
              >
                <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessibilityLabel="Send Inquiry"
                onPress={() => {
                  if (canSend) {
                    handleSend();
                  }
                }}
                disabled={!canSend}
                activeOpacity={canSend ? 0.7 : 1}
                style={[
                  styles.actionButton,
                  canSend ? styles.sendButtonActive : styles.sendButtonInactive,
                ]}
              >
                <Send size={16} color={canSend ? "#FFFFFF" : "#94A3B8"} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Pure React Native Stylesheet (Immune to CSS Interop Cache Bugs) ───────────
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#0284C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  resetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  flexContainer: {
    flex: 1,
  },
  listStyle: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContentStyle: {
    paddingVertical: 16,
  },
  starterContainer: {
    marginBottom: 16,
    marginTop: 8,
    gap: 8,
  },
  starterHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  starterChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "rgba(240, 249, 255, 0.85)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  starterChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0369A1",
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
    color: "#64748B",
  },
  composerContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  contextChipActive: {
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  contextChipInactive: {
    borderColor: "#E2E8F0",
    backgroundColor: "#F1F5F9",
  },
  contextChipText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "600",
  },
  contextTextActive: {
    color: "#047857",
  },
  contextTextInactive: {
    color: "#475569",
  },
  concurrencyText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  imagePreviewStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#F0F9FF",
    padding: 8,
    marginBottom: 8,
  },
  imagePreviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  imageThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#CBD5E1",
  },
  imageInfo: {
    marginLeft: 10,
    flex: 1,
  },
  imageNameText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  imageSubText: {
    fontSize: 10,
    color: "#64748B",
  },
  imageRemoveButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  mediaButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  textInputWrapper: {
    flex: 1,
    maxHeight: 110,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    fontSize: 13,
    color: "#0F172A",
    lineHeight: 18,
    minHeight: 24,
    paddingTop: 0,
    paddingBottom: 0,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: "#0284C7",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonInactive: {
    backgroundColor: "#E2E8F0",
  },
  stopButton: {
    backgroundColor: "#E11D48",
    shadowColor: "#E11D48",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});
