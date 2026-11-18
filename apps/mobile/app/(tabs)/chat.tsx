import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  FadeIn,
  FadeOutUp,
} from "react-native-reanimated";

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
import { useAppTheme } from "../../constants/themeContext";
import {
  ChatMessage,
  ChatMessageBubble,
} from "../../components/avi/ChatMessageBubble";
import { ThinkingIndicator } from "../../components/avi/ThinkingIndicator";
import { AviHeroEmblem } from "../../components/avi/AviHeroEmblem";
import { AviHeaderControls } from "../../components/avi/AviHeaderControls";
import { AviBottomDock } from "../../components/avi/AviBottomDock";

const AnimatedView = Animated.View as any;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [includeHealthProfile, setIncludeHealthProfile] = useState(true);
  const [selectedImage, setSelectedImage] = useState<PreparedImage | null>(null);
  const [mode, setMode] = useState<"chat" | "scan">("chat");

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
    }, 5000);

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
          "Cannot reach the MedGemma GPU server. Check lab Wi-Fi or endpoint configuration.",
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

  // ── Reset / New Chat Conversation ─────────────────────────────────────────
  const handleNewChat = () => {
    handleStopGeneration();
    setMessages([]);
    setSelectedImage(null);
    inputRef.current = "";
    setInput("");
  };

  const handleTextChange = (text: string) => {
    inputRef.current = text;
    setInput(text);
  };

  const topPadding = Math.max(insets.top, 14);
  const bottomPadding = Math.max(insets.bottom, 12);

  const isZeroState = messages.length === 0 && !isStreaming;

  return (
    <View
      style={[
        styles.rootContainer,
        {
          backgroundColor: theme.canvas,
          paddingTop: topPadding,
        },
      ]}
    >
      {/* ── 1. Minimal Top Header (Drawer, Model Pill, New Chat / Avatar) ───── */}
      <AviHeaderControls
        health={health}
        onRefreshHealth={refreshHealth}
        isCheckingHealth={isCheckingHealth}
        onNewChat={handleNewChat}
      />

      {/* ── 2. Chat Feed & Floating Dock in KeyboardAvoidingView ──────────── */}
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {isZeroState ? (
          /* Zero-State Hero Canvas (70%+ Negative Space, Breathing Glow) */
          <AnimatedView
            entering={FadeIn.duration(260)}
            exiting={FadeOutUp.duration(220)}
            style={styles.zeroStateWrapper}
          >
            <AviHeroEmblem prompt="What should we focus on?" />
          </AnimatedView>
        ) : (
          /* Active Chat Stream */
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
              isStreaming && requestStartTime !== null ? (
                <ThinkingIndicator
                  stage={streamingStage}
                  hasImage={!!selectedImage}
                  startTime={requestStartTime}
                  onCancel={handleStopGeneration}
                />
              ) : undefined
            }
            renderItem={({ item }) => (
              <ChatMessageBubble message={item} onRetry={handleRetry} />
            )}
          />
        )}

        {/* ── 3. Bottom Floating Capsule Dock + Mode Toggle ─────────────────── */}
        <View style={{ paddingBottom: bottomPadding }}>
          <AviBottomDock
            input={input}
            onInputChange={handleTextChange}
            onSubmit={() => handleSend()}
            onStop={handleStopGeneration}
            isStreaming={isStreaming}
            selectedImage={selectedImage}
            onClearImage={() => setSelectedImage(null)}
            onTakePhoto={takePhotoWithCamera}
            onPickGallery={pickImageFromGallery}
            includeHealthProfile={includeHealthProfile}
            onToggleHealthProfile={() =>
              setIncludeHealthProfile((prev) => !prev)
            }
            mode={mode}
            onModeChange={setMode}
            inputRef={textInputRef}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  flexContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  zeroStateWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listStyle: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContentStyle: {
    paddingTop: 16,
    paddingBottom: 8,
  },
});
