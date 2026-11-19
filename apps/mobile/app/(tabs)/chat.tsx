import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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
import { useTheme } from "../../context/ThemeContext";
import { usePatient } from "../../context/PatientContext";
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
  const { colors, isDark } = useTheme();
  const { patient, telemetry } = usePatient();
  const { initialQuery } = useLocalSearchParams<{ initialQuery?: string }>();

  const listRef = useRef<FlatList>(null);
  const textInputRef = useRef<any>(null);

  // ── Server Health State ───────────────────────────────────────────────────
  const [health, setHealth] = useState<AviHealthResponse>({
    status: "loading",
    message: "Connecting to Avi...",
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // ── Chat & Multimodal State ───────────────────────────────────────────────
  const [input, setInput] = useState(initialQuery || "");
  const inputRef = useRef(initialQuery || "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedImage, setSelectedImage] = useState<PreparedImage | null>(null);

  useEffect(() => {
    if (initialQuery && typeof initialQuery === "string") {
      setInput(initialQuery);
      inputRef.current = initialQuery;
    }
  }, [initialQuery]);

  // ── Keyboard Visibility & Height Tracking ─────────────────────────────────
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [didWindowResize, setDidWindowResize] = useState(false);
  const baseHeightRef = useRef<number>(0);
  const currentHeightRef = useRef<number>(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const kh = e?.endCoordinates?.height || 280;
      setKeyboardHeight(kh);
      setKeyboardVisible(true);
      if (baseHeightRef.current && currentHeightRef.current) {
        const shrank = currentHeightRef.current < baseHeightRef.current - 100;
        setDidWindowResize(shrank);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      setDidWindowResize(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Streaming State ───────────────────────────────────────────────────────
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStage, setStreamingStage] = useState<
    "uploading" | "queued" | "generating"
  >("queued");
  const [requestStartTime, setRequestStartTime] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

      // If background probe previously timed out, re-check in background without blocking inquiry
      if (health.status === "unreachable") {
        refreshHealth();
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

      inputRef.current = "";
      setInput("");
      setSelectedImage(null);
      Keyboard.dismiss();

      setMessages((prev) => [userMessage, ...prev]);

      // Ground prompt in synchronized patient profile
      const fullPrompt = buildGroundedPrompt(userText, true, {
        name: patient.fullName,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies,
        chronicConditions: patient.chronicConditions,
        activeMedications: patient.activeMedications.map(
          (m) => `${m.name} ${m.dosage} (${m.frequency})`
        ),
      });

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
            setHealth((prev) =>
              prev.status === "ready"
                ? prev
                : {
                    status: "ready",
                    statusCode: 200,
                    message: "Avi Ready (MedGemma 1.5 4B)",
                  }
            );
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
                isGrounded: true,
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
    [input, selectedImage, health.status, patient, refreshHealth]
  );

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

  const handleNewChat = () => {
    handleStopGeneration();
    setMessages([]);
    setSelectedImage(null);
    inputRef.current = "";
    setInput("");
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear Conversation",
      "Reset dialogue and remove all chat history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: handleNewChat,
        },
      ]
    );
  };

  const handleTextChange = (text: string) => {
    inputRef.current = text;
    setInput(text);
  };

  const topPadding = Math.max(insets.top, 14);
  const bottomPadding = Math.max(insets.bottom, 12);
  const isZeroState = messages.length === 0 && !isStreaming;

  const effectiveKeyboardHeight = keyboardHeight > 0 ? keyboardHeight : 280;
  const dockBottomPadding = Platform.select({
    ios: bottomPadding,
    android: keyboardVisible
      ? didWindowResize
        ? 10
        : effectiveKeyboardHeight + 10
      : bottomPadding,
    default: bottomPadding,
  });

  return (
    <View
      style={[
        styles.rootContainer,
        {
          backgroundColor: colors.canvas,
          paddingTop: topPadding,
        },
      ]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (
          !baseHeightRef.current ||
          (!keyboardVisible && h > baseHeightRef.current)
        ) {
          baseHeightRef.current = h;
        }
        currentHeightRef.current = h;
        if (keyboardVisible) {
          const shrank = h < baseHeightRef.current - 100;
          setDidWindowResize(shrank);
        }
      }}
    >
      {/* ── 1. Clean 2-Element Header: Left Menu, Center Status, Right EMPTY ── */}
      <AviHeaderControls
        health={health}
        onRefreshHealth={refreshHealth}
        isCheckingHealth={isCheckingHealth}
        onNewChat={handleNewChat}
        onClearHistory={handleClearHistory}
      />

      {/* ── 2. Chat Feed & Floating Dock in KeyboardAvoidingView ──────────── */}
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {isZeroState ? (
          /* Tap Anywhere Outside Input to Dismiss Keyboard */
          <Pressable
            style={styles.zeroStatePressable}
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <AnimatedView
              entering={FadeIn.duration(240)}
              exiting={FadeOutUp.duration(200)}
              style={styles.zeroStateWrapper}
            >
              <AviHeroEmblem prompt="What should we focus on?" />
            </AnimatedView>
          </Pressable>
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

        {/* ── 3. Bottom Taller Capsule Dock with Android Keyboard Avoidance ─── */}
        <View style={{ paddingBottom: dockBottomPadding }}>
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
  zeroStatePressable: {
    flex: 1,
    width: "100%",
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
