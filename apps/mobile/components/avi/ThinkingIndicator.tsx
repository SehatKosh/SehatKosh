import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Square } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useAppTheme } from "../../constants/themeContext";
import { RADII } from "../../constants/theme";

const AnimatedView = Animated.View as any;

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
  const { theme, isDark } = useAppTheme();
  const [elapsed, setElapsed] = useState("0.0");

  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.25, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
      opacity: pulse.value > 1.1 ? 0.95 : 0.7,
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, (Date.now() - startTime) / 1000);
      setElapsed(diff.toFixed(1));
    }, 100);

    return () => clearInterval(timer);
  }, [startTime]);

  const getStageLabel = () => {
    if (stage === "uploading" && hasImage) return "Analyzing image...";
    if (stage === "queued") return "Thinking...";
    return "Generating...";
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <AnimatedView style={[styles.starContainer, animatedStarStyle]}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path
              d="M12 0C12 7.5 16.5 12 24 12C16.5 12 12 16.5 12 24C12 16.5 7.5 12 0 12C7.5 12 12 7.5 12 0Z"
              fill="#3B82F6"
            />
          </Svg>
        </AnimatedView>

        <Text style={[styles.stageText, { color: theme.textSecondary }]}>
          {getStageLabel()}
        </Text>

        <Text style={[styles.elapsedText, { color: theme.textMuted }]}>
          {elapsed}s
        </Text>
      </View>

      {onCancel && (
        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.7}
          style={[
            styles.stopPill,
            {
              backgroundColor: isDark ? "rgba(244, 63, 94, 0.15)" : "#FFF1F2",
              borderColor: isDark ? "rgba(244, 63, 94, 0.3)" : "#FECDD3",
            },
          ]}
        >
          <Square size={9} color="#F43F5E" fill="#F43F5E" />
          <Text style={styles.stopText}>Stop</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stageText: {
    fontSize: 13,
    fontWeight: "500",
  },
  elapsedText: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  stopPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  stopText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F43F5E",
  },
});
