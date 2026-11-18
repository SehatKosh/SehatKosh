import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

interface SingleRingProps {
  steps?: number;
  distanceKm?: number;
  activeKcal?: number;
  kcalGoal?: number;
}

const RING_CONFIG = {
  size: 136,
  center: 68,
  radius: 56, // (136 - 24) / 2 = 56
  strokeWidth: 24,
};

export function AppleHealthSingleRing({
  steps = 6420,
  distanceKm = 4.8,
  activeKcal = 285,
  kcalGoal = 400,
}: SingleRingProps) {
  const { colors, isDark } = useTheme();

  // Animated sweep percentage from 0 to 1
  const [sweep, setSweep] = useState(0);

  const moveProgress = Math.min(activeKcal / (kcalGoal || 400), 1); // ~0.71

  useEffect(() => {
    let frameId: number;
    let start: number | null = null;
    const duration = 1000;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Cubic ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      setSweep(eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const circumference = 2 * Math.PI * RING_CONFIG.radius;
  const strokeOffset = circumference * (1 - moveProgress * sweep);

  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* ── Left Side: Thick Single Activity Ring (Empty Center) ───────────── */}
      <View style={styles.ringWrapper}>
        <Svg
          width={RING_CONFIG.size}
          height={RING_CONFIG.size}
          viewBox={`0 0 ${RING_CONFIG.size} ${RING_CONFIG.size}`}
        >
          {/* Deep translucent track at 20% opacity */}
          <Circle
            cx={RING_CONFIG.center}
            cy={RING_CONFIG.center}
            r={RING_CONFIG.radius}
            stroke="rgba(250, 17, 79, 0.20)"
            strokeWidth={RING_CONFIG.strokeWidth}
            fill="transparent"
          />

          {/* Active arc starting at 12 o'clock (-90 deg rotation) */}
          <G
            rotation="-90"
            origin={`${RING_CONFIG.center}, ${RING_CONFIG.center}`}
          >
            <Circle
              cx={RING_CONFIG.center}
              cy={RING_CONFIG.center}
              r={RING_CONFIG.radius}
              stroke="#FA114F"
              strokeWidth={RING_CONFIG.strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </G>

          {/* Crisp right-pointing arrow embedded inside starting cap at 12 o'clock */}
          {/* Center of cap at 12 o'clock is (68, 12) */}
          <Path
            d="M65.5 8.5L71.5 12L65.5 15.5"
            stroke="#000000"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>

      {/* ── Right Side: Clean 3-Row Metric Stack (tabular-nums) ────────────── */}
      <View style={styles.metricsColumn}>
        {/* Row 1: MOVE */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            MOVE
          </Text>
          <Text style={styles.moveValue}>
            {activeKcal}/{kcalGoal}{" "}
            <Text style={styles.moveUnit}>KCAL</Text>
          </Text>
        </View>

        {/* Row 2: STEPS */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            STEPS
          </Text>
          <Text
            style={[
              styles.standardValue,
              { color: colors.textPrimary },
            ]}
          >
            {steps.toLocaleString()}
          </Text>
        </View>

        {/* Row 3: DISTANCE */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            DISTANCE
          </Text>
          <Text
            style={[
              styles.standardValue,
              { color: colors.textPrimary },
            ]}
          >
            {distanceKm}{" "}
            <Text style={styles.distanceUnit}>KM</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  ringWrapper: {
    width: 136,
    height: 136,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsColumn: {
    flex: 1,
    marginLeft: 22,
    gap: 12,
    justifyContent: "center",
  },
  metricItem: {
    gap: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  moveValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FA114F",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  moveUnit: {
    fontSize: 13,
    fontWeight: "700",
  },
  standardValue: {
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  distanceUnit: {
    fontSize: 14,
    fontWeight: "700",
  },
});
