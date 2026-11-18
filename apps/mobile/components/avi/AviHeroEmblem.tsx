import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

const AnimatedView = Animated.View as any;

interface AviHeroEmblemProps {
  prompt?: string;
}

export function AviHeroEmblem({
  prompt = "What should we focus on?",
}: AviHeroEmblemProps) {
  const { colors, isDark } = useTheme();

  // Subtle breathing glow animation
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    glowScale.value = withRepeat(
      withTiming(1.3, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withTiming(0.7, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: glowScale.value }],
      opacity: glowOpacity.value,
    };
  });

  return (
    <View style={styles.container}>
      {/* ── SehatKosh Clinical Shield with Breathing Glow ────────────── */}
      <View style={styles.emblemWrapper}>
        <AnimatedView
          style={[
            styles.glowRing,
            {
              backgroundColor: isDark
                ? "rgba(16, 185, 129, 0.25)"
                : "rgba(16, 185, 129, 0.15)",
            },
            animatedGlowStyle,
          ]}
        />

        {/* Custom Clinical Shield Emblem */}
        <Svg width={54} height={54} viewBox="0 0 48 48">
          <Defs>
            <LinearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#34D399" />
              <Stop offset="50%" stopColor="#10B981" />
              <Stop offset="100%" stopColor="#0D9488" />
            </LinearGradient>
            <LinearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#E0F2FE" />
            </LinearGradient>
          </Defs>

          {/* Clinical Shield Outline & Fill */}
          <Path
            d="M24 4L8 10V22C8 32.5 14.8 41.5 24 44C33.2 41.5 40 32.5 40 22V10L24 4Z"
            fill="url(#shieldGrad)"
          />

          {/* Central Medical Cross Node */}
          <Rect
            x="22"
            y="14"
            width="4"
            height="18"
            rx="2"
            fill="rgba(255, 255, 255, 0.35)"
          />
          <Rect
            x="15"
            y="21"
            width="18"
            height="4"
            rx="2"
            fill="rgba(255, 255, 255, 0.35)"
          />

          {/* ECG Pulse Wave Overlay */}
          <Path
            d="M13 23H18L21 16L25 30L28 20L31 23H35"
            stroke="url(#pulseGrad)"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>

      {/* Hero Prompt Headline */}
      <Text
        style={[
          styles.heroPrompt,
          { color: colors.textPrimary },
        ]}
      >
        {prompt}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emblemWrapper: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  heroPrompt: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "600",
    letterSpacing: -0.6,
    textAlign: "center",
  },
});
