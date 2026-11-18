import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

interface SingleRingProps {
  steps?: number;
  stepGoal?: number;
  activeKcal?: number;
  kcalGoal?: number;
  medsTaken?: number;
  medsTotal?: number;
}

const RING_CONFIG = {
  size: 148,
  center: 74,
  radius: 52,
  strokeWidth: 20,
};

export function AppleHealthSingleRing({
  steps = 6420,
  stepGoal = 8000,
  activeKcal = 285,
  kcalGoal = 400,
  medsTaken = 2,
  medsTotal = 2,
}: SingleRingProps) {
  const { colors, isDark } = useTheme();

  // Animated sweep percentage from 0 to 1
  const [sweep, setSweep] = useState(0);

  const targetProgress = Math.min(steps / (stepGoal || 8000), 1); // 0.8025 (80%)

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
  const strokeOffset = circumference * (1 - targetProgress * sweep);

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
      {/* ── Left: Single Bold Apple Health Progress Ring ──────────────────── */}
      <View style={styles.ringWrapper}>
        <Svg
          width={RING_CONFIG.size}
          height={RING_CONFIG.size}
          viewBox={`0 0 ${RING_CONFIG.size} ${RING_CONFIG.size}`}
        >
          {/* Background track (18% opacity) */}
          <Circle
            cx={RING_CONFIG.center}
            cy={RING_CONFIG.center}
            r={RING_CONFIG.radius}
            stroke="rgba(255, 59, 92, 0.18)"
            strokeWidth={RING_CONFIG.strokeWidth}
            fill="transparent"
          />

          {/* Active progress track rotated -90 deg */}
          <G
            rotation="-90"
            origin={`${RING_CONFIG.center}, ${RING_CONFIG.center}`}
          >
            <Circle
              cx={RING_CONFIG.center}
              cy={RING_CONFIG.center}
              r={RING_CONFIG.radius}
              stroke="#FF3B5C"
              strokeWidth={RING_CONFIG.strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </G>

          {/* Directional arrow icon embedded at top starting cap */}
          <Path
            d="M74 15L78 22H70L74 15Z"
            fill="#FFFFFF"
            transform="rotate(90 74 22)"
          />
        </Svg>

        {/* Center percentage badge */}
        <View style={styles.centerBadge}>
          <Text
            style={[
              styles.centerPercentText,
              { color: colors.textPrimary },
            ]}
          >
            {Math.round(targetProgress * sweep * 100)}%
          </Text>
        </View>
      </View>

      {/* ── Right: Real-World Activity Metrics ─────────────────────────────── */}
      <View style={styles.metricsColumn}>
        {/* Move / Steps Metric */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: "#FF3B5C" }]}>
            MOVE / STEPS
          </Text>
          <Text
            style={[
              styles.metricValue,
              { color: colors.textPrimary },
            ]}
          >
            {steps.toLocaleString()}
            <Text style={[styles.metricGoal, { color: colors.textSecondary }]}>
              {" "}/ {stepGoal.toLocaleString()}
            </Text>
          </Text>
        </View>

        {/* Active Energy Metric */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.accentAmber }]}>
            ACTIVE ENERGY
          </Text>
          <Text
            style={[
              styles.metricValue,
              { color: colors.textPrimary },
            ]}
          >
            {activeKcal}
            <Text style={[styles.metricGoal, { color: colors.textSecondary }]}>
              {" "}/ {kcalGoal} KCAL
            </Text>
          </Text>
        </View>

        {/* Medications Metric */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.accentEmerald }]}>
            MEDICATIONS
          </Text>
          <Text
            style={[
              styles.metricValue,
              { color: colors.textPrimary },
            ]}
          >
            {medsTaken}
            <Text style={[styles.metricGoal, { color: colors.textSecondary }]}>
              {" "}/ {medsTotal} TAKEN
            </Text>
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
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  ringWrapper: {
    width: 148,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerBadge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerPercentText: {
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  metricsColumn: {
    flex: 1,
    marginLeft: 18,
    gap: 12,
    justifyContent: "center",
  },
  metricItem: {
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },
  metricGoal: {
    fontSize: 12,
    fontWeight: "500",
  },
});
