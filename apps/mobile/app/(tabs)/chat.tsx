import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
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

  // ── Server Health State ───────────────────────────────────────────────────
  const [health, setHealth] = useState<AviHealthResponse>({
    status: "loading",
    message: "Connecting to Avi...",
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // ── Chat State ────────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [includeHealthProfile, setIncludeHealthProfile] = useState(true);
  const [selectedImage, setSelectedImage] = useState<PreparedImage | null>(null);

  // ── Streaming & Thinking State ────────────────────────────────────────────
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStage, setStreamingStage] = useState<"uploading" | "queued" | "generating">("queued");
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

    // Poll health every 4 seconds unless active streaming
    const interval = setInterval(() => {
      if (!isStreaming) {
        refreshHealth();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [refreshHealth, isStreaming]);

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
      Alert.alert("Image Selection Failed", err.message || "Could not select photo.");
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

  // ── Stop Generation Handler ───────────────────────────────────────────────
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setRequestStartTime(null);

    // Finalize any streaming message
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    );
  }, []);

  // ── Send Message Handler ──────────────────────────────────────────────────
  const handleSend = useCallback(
    async (textOverride?: string, imageOverride?: PreparedImage | null) => {
      const userText = (typeof textOverride === "string" ? textOverride : input).trim();
      const currentImage = imageOverride !== undefined ? imageOverride : selectedImage;

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
          "Cannot reach the MedGemma GPU server at the configured address. Please check your lab Wi-Fi or Tailscale connection in the server settings.",
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

      // Reset input fields
      setInput("");
      setSelectedImage(null);

      // Add user message to inverted list (at the top)
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
              setRequestStartTime(null); // Dismiss thinking indicator once tokens arrive

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

        // Append error bubble
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
            setInput("");
          },
        },
      ]
    );
  };

  const topPadding = Math.max(insets.top, 16) + 4;

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: topPadding }}>
      {/* ── Main Top Bar ────────────────────────────────────────────── */}
      <View className="border-b border-slate-200 bg-white px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-xl bg-sky-600">
              <Cpu size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-lg font-bold text-slate-900">
                Avi Clinical Assistant
              </Text>
              <Text className="text-[11px] font-medium text-slate-500">
                Google MedGemma 1.5 4B • Multimodal EMR
              </Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityLabel="Reset conversation"
            onPress={handleReset}
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
          >
            <RotateCcw size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Live Health & Endpoint Header ────────────────────────────── */}
      <AviStatusHeader
        health={health}
        onRefreshHealth={refreshHealth}
        isChecking={isCheckingHealth}
      />

      {/* ── Chat Feed & Composer ─────────────────────────────────────── */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          ListHeaderComponent={
            <>
              {/* Thinking Indicator (Shown while waiting for first token) */}
              {isStreaming && requestStartTime !== null && (
                <ThinkingIndicator
                  stage={streamingStage}
                  hasImage={!!selectedImage}
                  startTime={requestStartTime}
                  onCancel={handleStopGeneration}
                />
              )}

              {/* Starter Prompts */}
              {messages.length === 1 && (
                <View className="mb-4 mt-2 gap-2">
                  <Text className="text-xs font-semibold text-slate-500">
                    Suggested Clinical Inquiries:
                  </Text>
                  {STARTER_PROMPTS.map((prompt) => (
                    <TouchableOpacity
                      key={prompt}
                      onPress={() => handleSend(prompt)}
                      className="rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 active:bg-sky-100"
                    >
                      <Text className="text-xs font-medium text-sky-800">
                        {prompt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <MessageSquarePlus size={32} color="#0284C7" />
              <Text className="mt-3 text-center text-sm text-slate-500">
                Ask a question or upload a prescription to begin.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ChatMessageBubble message={item} onRetry={handleRetry} />
          )}
        />

        {/* ── Sticky Composer ────────────────────────────────────────── */}
        <View className="border-t border-slate-200 bg-white px-4 pt-2.5 pb-3">
          {/* Controls Bar: Context Toggle & Image Status */}
          <View className="mb-2 flex-row items-center justify-between">
            {/* Grounded Context Toggle Chip */}
            <TouchableOpacity
              onPress={() => setIncludeHealthProfile((prev) => !prev)}
              activeOpacity={0.7}
              className={`flex-row items-center rounded-full border px-2.5 py-1 ${
                includeHealthProfile
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-slate-100"
              }`}
            >
              {includeHealthProfile ? (
                <ShieldCheck size={13} color="#059669" />
              ) : (
                <Shield size={13} color="#64748B" />
              )}
              <Text
                className={`ml-1 text-[11px] font-semibold ${
                  includeHealthProfile ? "text-emerald-700" : "text-slate-600"
                }`}
              >
                {includeHealthProfile
                  ? "Health Passport Context: ON"
                  : "Health Passport Context: OFF"}
              </Text>
            </TouchableOpacity>

            <Text className="text-[10px] text-slate-400">
              Concurrency: 1 • VRAM Isolated
            </Text>
          </View>

          {/* Image Preview Strip (if photo attached) */}
          {selectedImage && (
            <View className="mb-2 flex-row items-center justify-between rounded-xl border border-sky-200 bg-sky-50 p-2">
              <View className="flex-row items-center flex-1 mr-2">
                <Image
                  source={{ uri: selectedImage.uri }}
                  className="h-10 w-10 rounded-lg bg-slate-200"
                  resizeMode="cover"
                />
                <View className="ml-2.5 flex-1">
                  <Text className="text-xs font-semibold text-slate-800" numberOfLines={1}>
                    {selectedImage.name}
                  </Text>
                  <Text className="text-[10px] text-slate-500">
                    {selectedImage.sizeBytes
                      ? `${Math.round(selectedImage.sizeBytes / 1024)} KB • `
                      : ""}
                    Optimized JPEG (1024px)
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                className="h-7 w-7 items-center justify-center rounded-full bg-slate-200 active:bg-slate-300"
              >
                <X size={14} color="#475569" />
              </TouchableOpacity>
            </View>
          )}

          {/* Multimodal Input Row */}
          <View className="flex-row items-end gap-1.5">
            {/* Camera Button */}
            <TouchableOpacity
              onPress={takePhotoWithCamera}
              accessibilityLabel="Scan Prescription with Camera"
              disabled={isStreaming}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200"
            >
              <Camera size={18} color="#475569" />
            </TouchableOpacity>

            {/* Gallery Upload Button */}
            <TouchableOpacity
              onPress={pickImageFromGallery}
              accessibilityLabel="Attach Photo from Gallery"
              disabled={isStreaming}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200"
            >
              <ImageIcon size={18} color="#475569" />
            </TouchableOpacity>

            {/* Text Input */}
            <View className="flex-1 max-h-[110px] rounded-xl bg-slate-100 px-3 py-2">
              <TextInput
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={800}
                placeholder={
                  selectedImage
                    ? "Add notes or question for this image..."
                    : "Ask Avi about medications, vitals, or symptoms..."
                }
                placeholderTextColor="#94A3B8"
                className="text-xs text-slate-900 leading-4"
                style={{ minHeight: 20 }}
                editable={!isStreaming}
              />
            </View>

            {/* Dynamic Send / Stop Button */}
            {isStreaming ? (
              <TouchableOpacity
                key="avi-stop-btn"
                activeOpacity={0.8}
                accessibilityLabel="Stop Generating"
                onPress={handleStopGeneration}
                className="h-10 w-10 items-center justify-center rounded-xl bg-rose-600 shadow-sm"
              >
                <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key="avi-send-btn"
                activeOpacity={0.8}
                accessibilityLabel="Send Inquiry"
                onPress={() => handleSend()}
                disabled={!input.trim() && !selectedImage}
                className={`h-10 w-10 items-center justify-center rounded-xl ${
                  input.trim() || selectedImage
                    ? "bg-sky-600 shadow-sm"
                    : "bg-slate-200"
                }`}
              >
                <Send
                  size={16}
                  color={input.trim() || selectedImage ? "#FFFFFF" : "#94A3B8"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
