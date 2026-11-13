import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  AlertCircle,
  Cpu,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";

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
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
}

export function ChatMessageBubble({ message, onRetry }: ChatMessageBubbleProps) {
  // Blinking cursor for streaming state
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!message.isStreaming) return;
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, [message.isStreaming]);

  // ── 1. User Message Bubble ──────────────────────────────────────────────────
  if (message.role === "user") {
    return (
      <View className="mb-3 max-w-[85%] self-end">
        <View className="rounded-2xl rounded-tr-sm bg-sky-600 p-3.5 shadow-sm">
          {message.imageUrl && (
            <View className="mb-2.5 overflow-hidden rounded-xl bg-sky-700/60 border border-white/20">
              <Image
                source={{ uri: message.imageUrl }}
                style={{ width: "100%", height: 160 }}
                resizeMode="cover"
              />
              {message.imageName && (
                <View className="bg-black/40 px-2 py-1">
                  <Text className="text-[10px] text-white/90" numberOfLines={1}>
                    {message.imageName}
                  </Text>
                </View>
              )}
            </View>
          )}

          {message.content ? (
            <Text className="text-sm leading-5 text-white">
              {message.content}
            </Text>
          ) : null}
        </View>

        <Text className="mt-1 self-end text-[10px] text-slate-400">
          {message.timestamp}
        </Text>
      </View>
    );
  }

  // ── 2. Error Message Bubble ────────────────────────────────────────────────
  if (message.role === "error") {
    return (
      <View className="mb-3 max-w-[90%] self-start">
        <View className="rounded-2xl rounded-tl-sm border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <View className="flex-row items-center">
            <AlertCircle size={18} color="#E11D48" />
            <Text className="ml-2 text-xs font-bold text-rose-900">
              Inference / Network Error
            </Text>
          </View>

          <Text className="mt-2 text-xs leading-4 text-rose-800">
            {message.content}
          </Text>

          {message.errorDetail && (
            <Text className="mt-1 font-mono text-[10px] text-rose-600">
              {message.errorDetail}
            </Text>
          )}

          {onRetry && (
            <Pressable
              onPress={() => onRetry(message)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="mt-3 flex-row items-center self-start rounded-lg border border-rose-300 bg-white px-3 py-1.5"
            >
              <RefreshCw size={13} color="#BE123C" />
              <Text className="ml-1.5 text-xs font-semibold text-rose-800">
                Retry Request
              </Text>
            </Pressable>
          )}
        </View>

        <Text className="mt-1 text-[10px] text-slate-400">
          {message.timestamp}
        </Text>
      </View>
    );
  }

  // ── 3. Avi Assistant Bubble (MedGemma 1.5 4B) ────────────────────────────────
  return (
    <View className="mb-4 max-w-[92%] self-start">
      <View className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 shadow-sm">
        {/* Header with Model Identifier & Context Badge */}
        <View className="flex-row flex-wrap items-center justify-between pb-2.5 border-b border-slate-100 gap-1.5">
          <View className="flex-row items-center">
            <View className="mr-2 h-6 w-6 items-center justify-center rounded-lg bg-sky-600">
              <Cpu size={14} color="#FFFFFF" />
            </View>
            <Text className="text-xs font-bold text-slate-900">
              Avi Clinical AI
            </Text>
            <Text className="ml-1 text-[10px] font-mono text-slate-400">
              MedGemma 1.5 4B
            </Text>
          </View>

          {message.isGrounded && (
            <View className="flex-row items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5">
              <ShieldCheck size={11} color="#059669" />
              <Text className="ml-1 text-[10px] font-semibold text-emerald-700">
                Grounded in Passport
              </Text>
            </View>
          )}
        </View>

        {/* Content Body */}
        <View className="mt-3">
          <Text className="text-sm leading-6 text-slate-800">
            {message.content}
            {message.isStreaming && (
              <Text className="text-sky-600 font-bold">
                {showCursor ? " ▌" : " "}
              </Text>
            )}
          </Text>
        </View>

        {/* Clinical Disclaimer Footer */}
        <View className="mt-3.5 pt-2.5 border-t border-slate-100">
          <Text className="text-[10px] leading-3.5 text-slate-400 italic">
            * Avi is an AI clinical assistant powered by MedGemma 1.5 4B. Guidance
            is supplementary; always verify changes with your treating physician.
          </Text>
        </View>
      </View>

      <View className="mt-1 flex-row items-center justify-between px-1">
        <Text className="text-[10px] text-slate-400">
          {message.timestamp}
        </Text>
        {message.latencyMs !== undefined && (
          <Text className="text-[10px] font-mono text-slate-400">
            {(message.latencyMs / 1000).toFixed(1)}s elapsed
          </Text>
        )}
      </View>
    </View>
  );
}
