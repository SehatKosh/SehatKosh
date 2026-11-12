import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Cpu, Square } from "lucide-react-native";

interface ThinkingIndicatorProps {
  stage: "uploading" | "queued" | "generating";
  hasImage: boolean;
  startTime: number;
  onCancel?: () => void;
}

export function ThinkingIndicator({
  stage,
  hasImage,
  startTime,
  onCancel,
}: ThinkingIndicatorProps) {
  const [elapsed, setElapsed] = useState("0.0");

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, (Date.now() - startTime) / 1000);
      setElapsed(diff.toFixed(1));
    }, 100);

    return () => clearInterval(timer);
  }, [startTime]);

  const getStageMessage = () => {
    const sec = parseFloat(elapsed);
    if (stage === "uploading" && hasImage) {
      return "Optimizing & uploading medical image...";
    }
    if (stage === "queued" || sec < 2.0) {
      return "Queued on MedGemma GPU (RTX 4000 Ada)...";
    }
    if (sec < 5.0) {
      return hasImage
        ? "SigLIP vision encoding & clinical prefill..."
        : "MedGemma 1.5 4B contextual prefill...";
    }
    return "Synthesizing longitudinal clinical insights...";
  };

  return (
    <View className="mb-4 self-start max-w-[92%] rounded-2xl rounded-tl-sm border border-sky-100 bg-sky-50/80 p-3.5 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-sky-600">
            <Cpu size={15} color="#FFFFFF" />
          </View>
          <View>
            <Text className="text-xs font-bold text-sky-950">
              Avi MedGemma 1.5 4B
            </Text>
            <Text className="text-[11px] font-mono text-sky-700">
              Inference latency: {elapsed}s
            </Text>
          </View>
        </View>

        {onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.7}
            className="flex-row items-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 active:bg-rose-100"
          >
            <Square size={10} color="#E11D48" fill="#E11D48" />
            <Text className="ml-1 text-[11px] font-semibold text-rose-700">
              Stop
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="mt-2.5 flex-row items-center rounded-xl bg-white/80 px-3 py-2 border border-sky-100">
        <ActivityIndicator size="small" color="#0284C7" />
        <Text className="ml-2 text-xs font-medium text-slate-700">
          {getStageMessage()}
        </Text>
      </View>
    </View>
  );
}
