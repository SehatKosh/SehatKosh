import { useState, useRef, useCallback } from "react";
import {
  MessageSquarePlus,
  Paperclip,
  RotateCcw,
  Send,
} from "lucide-react-native";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Message = { id: string; role: "patient" | "assistant"; text: string };

const PROMPTS = [
  "What are my current antibiotic interactions?",
  "Summarize my doctor visit from last week.",
  "Show my resting heart rate trend for this month.",
];

let _msgId = 0;
const mkId = () => String(++_msgId);

const INITIAL_MESSAGES: Message[] = [
  {
    id: mkId(),
    role: "assistant",
    text: "I'm ready to help you understand your records, prescriptions, and vitals.",
  },
];

function ChatBubble({ message }: { message: Message }) {
  const isPatient = message.role === "patient";
  return (
    <View
      className={`mb-3 max-w-[86%] rounded-2xl px-4 py-3 ${
        isPatient
          ? "self-end rounded-tr-sm bg-sky-600"
          : "self-start rounded-tl-sm bg-slate-200"
      }`}
    >
      <Text
        className={
          isPatient
            ? "text-sm leading-5 text-white"
            : "text-sm leading-5 text-slate-800"
        }
      >
        {message.text}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const listRef = useRef<FlatList>(null);

  const topPadding = Math.max(insets.top, 16) + 8;

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      { id: mkId(), role: "assistant", text: "I'll review that against your available health timeline." },
      { id: mkId(), role: "patient", text },
      ...prev,
    ]);
    setInput("");
  }, [input]);

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: topPadding }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View className="border-b border-slate-200 bg-white px-5 pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-slate-900">
              Clinical Analyst
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              Context-aware queries over your records
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Reset conversation"
            onPress={() =>
              Alert.alert(
                "Reset conversation",
                "Clear this conversation?",
                [
                  { text: "Cancel" },
                  {
                    text: "Clear",
                    onPress: () => setMessages([]),
                  },
                ]
              )
            }
            className="h-11 w-11 items-center justify-center rounded-full bg-slate-50"
          >
            <RotateCcw size={19} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Keyboard-aware body ─────────────────────────────── */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? topPadding + 56 : 0}
      >
        {/* Message feed (inverted FlatList so newest is at bottom) */}
        <FlatList
          ref={listRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 20 }}
          ListFooterComponent={
            messages.length <= 1 ? (
              <View className="mt-3 gap-2">
                {PROMPTS.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    onPress={() => setInput(prompt)}
                    className="rounded-xl border border-sky-100 bg-white px-4 py-3"
                  >
                    <Text className="text-sm font-medium text-sky-700">
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <MessageSquarePlus size={32} color="#0284C7" />
              <Text className="mt-3 text-center text-sm text-slate-500">
                Choose a prompt to start exploring your health timeline.
              </Text>
            </View>
          }
          renderItem={({ item }) => <ChatBubble message={item} />}
        />

        {/* ── Sticky input bar ──────────────────────────────── */}
        <View
          className="border-t border-slate-200 bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="flex-row items-end gap-2">
            <TouchableOpacity
              accessibilityLabel="Attach report"
              className="h-11 w-11 items-center justify-center"
            >
              <Paperclip size={20} color="#64748B" />
            </TouchableOpacity>
            <TextInput
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              placeholder="Ask about your prescriptions, vitals..."
              placeholderTextColor="#94A3B8"
              className="max-h-28 min-h-11 flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900"
            />
            <TouchableOpacity
              accessibilityLabel="Send message"
              onPress={send}
              className={`h-11 w-11 items-center justify-center rounded-full ${
                input.trim() ? "bg-sky-600" : "bg-slate-200"
              }`}
            >
              <Send size={18} color={input.trim() ? "#FFFFFF" : "#94A3B8"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
