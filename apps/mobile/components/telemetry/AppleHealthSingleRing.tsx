import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

interface SingleRingProps {
  steps?: number;
  stepGoal?: number;
  distanceKm?: number;
  activeKcal?: number | null;
  kcalGoal?: number;
}

const RING_CONFIG = {
  size: 136,
  center: 68,
  radius: 56, // (136 - 24) / 2 = 56
  strokeWidth: 24,
};

export function AppleHealthSingleRing({
  steps = 0,
  stepGoal = 8000,
  distanceKm = 0,
  activeKcal = null,
  kcalGoal = 400,
}: SingleRingProps) {
  const { colors, isDark } = useTheme();

  // Dynamic step ratio: at least 3%-5% cap arc when connected so starting arrow is visible
  const stepRatio = Math.min(Math.max((steps || 0) / (stepGoal || 8000), 0), 1);
  const targetProgress = steps > 0 ? Math.max(stepRatio, 0.05) : 0.03;

  // Smoothly animated progress tracking
  const [sweep, setSweep] = useState(targetProgress);
  const prevSweepRef = useRef(sweep);

  useEffect(() => {
    let frameId: number;
    const startValue = prevSweepRef.current;
    const endValue = targetProgress;
    const duration = 800;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;
      setSweep(current);
      prevSweepRef.current = current;

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [targetProgress]);

  const circumference = 2 * Math.PI * RING_CONFIG.radius;
  const strokeOffset = circumference * (1 - sweep);

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
        {/* Row 1: STEPS (Primary Crimson Pink) */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            STEPS
          </Text>
          <Text style={styles.stepsValue}>
            {steps.toLocaleString()}{" "}
            <Text style={styles.stepsGoalText}>
              / {(stepGoal || 8000).toLocaleString()}
            </Text>
          </Text>
        </View>

        {/* Row 2: DISTANCE */}
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
            {distanceKm.toFixed(2)}{" "}
            <Text style={styles.unitText}>KM</Text>
          </Text>
        </View>

        {/* Row 3: ACTIVE ENERGY */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            ACTIVE ENERGY
          </Text>
          <Text
            style={[
              styles.standardValue,
              { color: colors.textPrimary },
            ]}
          >
            {activeKcal !== null ? (
              <>
                {Math.round(activeKcal)}{" "}
                <Text style={styles.unitText}>/ {kcalGoal || 400} KCAL</Text>
              </>
            ) : (
              <Text style={{ color: colors.textMuted }}>
                -- / {kcalGoal || 400} KCAL
              </Text>
            )}
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
  stepsValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FA114F",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  stepsGoalText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(250, 17, 79, 0.75)",
  },
  standardValue: {
    fontSize: 20,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  unitText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
