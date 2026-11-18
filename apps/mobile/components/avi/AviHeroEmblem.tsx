import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useAppTheme } from "../../constants/themeContext";

const AnimatedView = Animated.View as any;

interface AviHeroEmblemProps {
  prompt?: string;
}

export function AviHeroEmblem({
  prompt = "What should we focus on?",
}: AviHeroEmblemProps) {
  const { theme, isDark } = useAppTheme();

  // Subtle breathing glow animation
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    glowScale.value = withRepeat(
      withTiming(1.35, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withTiming(0.75, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
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
      {/* Ambient Breathing Glow */}
      <View style={styles.emblemWrapper}>
        <AnimatedView
          style={[
            styles.glowRing,
            {
              backgroundColor: isDark
                ? "rgba(59, 130, 246, 0.28)"
                : "rgba(59, 130, 246, 0.15)",
            },
            animatedGlowStyle,
          ]}
        />

        {/* 4-Point Gemini/Avi Star Emblem with Rich Multi-Color Gradient */}
        <Svg width={46} height={46} viewBox="0 0 24 24">
          <Defs>
            <LinearGradient id="aviStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FB7185" />
              <Stop offset="30%" stopColor="#FBBF24" />
              <Stop offset="65%" stopColor="#38BDF8" />
              <Stop offset="100%" stopColor="#818CF8" />
            </LinearGradient>
          </Defs>
          <Path
            d="M12 0C12 7.5 16.5 12 24 12C16.5 12 12 16.5 12 24C12 16.5 7.5 12 0 12C7.5 12 12 7.5 12 0Z"
            fill="url(#aviStarGrad)"
          />
        </Svg>
      </View>

      {/* Hero Prompt Headline - Exact match to Gemini Mobile */}
      <Text
        style={[
          styles.heroPrompt,
          { color: theme.textPrimary },
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
    paddingVertical: 40,
  },
  emblemWrapper: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  heroPrompt: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "600",
    letterSpacing: -0.6,
    textAlign: "center",
  },
});
