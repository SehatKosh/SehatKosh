import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useAppTheme } from "../../constants/themeContext";

interface RingData {
  vitalsProgress: number; // 0 to 1
  adherenceProgress: number; // 0 to 1
  biomarkersProgress: number; // 0 to 1
  vitalsLabel?: string;
  adherenceLabel?: string;
  biomarkersLabel?: string;
}

const RING_CONFIG = {
  size: 160,
  center: 80,
  strokeWidth: 11,
  r1: 64, // Outer: Vitals
  r2: 48, // Middle: Adherence
  r3: 32, // Inner: Biomarkers
};

export function AppleHealthRings({
  vitalsProgress = 0.94,
  adherenceProgress = 0.92,
  biomarkersProgress = 0.9,
  vitalsLabel = "94%",
  adherenceLabel = "92%",
  biomarkersLabel = "18/20",
}: Partial<RingData>) {
  const { theme } = useAppTheme();

  // Animated sweep percentage from 0 to 1
  const [sweep, setSweep] = useState(0);

  useEffect(() => {
    let frameId: number;
    let start: number | null = null;
    const duration = 900; // 900ms smooth spring-like entrance sweep

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setSweep(eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const c1 = 2 * Math.PI * RING_CONFIG.r1;
  const c2 = 2 * Math.PI * RING_CONFIG.r2;
  const c3 = 2 * Math.PI * RING_CONFIG.r3;

  const offset1 = c1 * (1 - vitalsProgress * sweep);
  const offset2 = c2 * (1 - adherenceProgress * sweep);
  const offset3 = c3 * (1 - biomarkersProgress * sweep);

  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      {/* ── Left: Concentric 3-Ring SVG Cluster ─────────────────────────── */}
      <View style={styles.svgWrapper}>
        <Svg
          width={RING_CONFIG.size}
          height={RING_CONFIG.size}
          viewBox={`0 0 ${RING_CONFIG.size} ${RING_CONFIG.size}`}
        >
          {/* Rotate -90 deg so rings start at 12 o'clock */}
          <G
            rotation="-90"
            origin={`${RING_CONFIG.center}, ${RING_CONFIG.center}`}
          >
            {/* ── Ring 1: Vitals (Outer - Coral Red) ── */}
            <Circle
              cx={RING_CONFIG.center}
              cy={RING_CONFIG.center}
              r={RING_CONFIG.r1}
              stroke={theme.rings.trackVitals}
              strokeWidth={RING_CONFIG.strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={RING_CONFIG.center}
              cy={RING_CONFIG.center}
              r={RING_CONFIG.r1}
              stroke={theme.rings.vitals}
              strokeWidth={RING_CONFIG.strokeWidth}
              strokeDasharray={c1}
              strokeDashoffset={offset1}
              strokeLinecap="round"
              fill="transparent"
            />

            {/* ── Ring 2: Adherence (Middle - Emerald Green) ── */}
            <Circle
              cx={RING_CONFIG.center}
              cy={RING_CONFIG.center}
              r={RING_CONFIG.r2}
              stroke={theme.rings.trackAdherence}
              strokeWidth={RING_CONFIG.strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={RING_CONFIG.center}
              cy={RING_CONFIG.center}
              r={RING_CONFIG.r2}
              stroke={theme.rings.adherence}
              strokeWidth={RING_CONFIG.strokeWidth}
              strokeDasharray={c2}
              strokeDashoffset={offset2}
              strokeLinecap="round"
              fill="transparent"
            />

            {/* ── Ring 3: Biomarkers (Inner - Electric Cobalt) ── */}
            <Circle
              cx={RING_CONFIG.center}
              cy={RING_CONFIG.center}
              r={RING_CONFIG.r3}
              stroke={theme.rings.trackBiomarkers}
              strokeWidth={RING_CONFIG.strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={RING_CONFIG.center}
              cy={RING_CONFIG.center}
              r={RING_CONFIG.r3}
              stroke={theme.rings.biomarkers}
              strokeWidth={RING_CONFIG.strokeWidth}
              strokeDasharray={c3}
              strokeDashoffset={offset3}
              strokeLinecap="round"
              fill="transparent"
            />
          </G>
        </Svg>
      </View>

      {/* ── Right: Stacked Oversized Numeric Readouts ───────────────────── */}
      <View style={styles.metricsColumn}>
        {/* Vitals Metric */}
        <View style={styles.metricItem}>
          <View style={styles.labelRow}>
            <View
              style={[
                styles.ringDot,
                { backgroundColor: theme.rings.vitals },
              ]}
            />
            <Text
              style={[
                styles.metricLabel,
                { color: theme.textSecondary },
              ]}
            >
              Vitals
            </Text>
          </View>
          <Text
            style={[
              styles.metricValue,
              { color: theme.textPrimary },
            ]}
          >
            {vitalsLabel}
          </Text>
        </View>

        {/* Adherence Metric */}
        <View style={styles.metricItem}>
          <View style={styles.labelRow}>
            <View
              style={[
                styles.ringDot,
                { backgroundColor: theme.rings.adherence },
              ]}
            />
            <Text
              style={[
                styles.metricLabel,
                { color: theme.textSecondary },
              ]}
            >
              Adherence
            </Text>
          </View>
          <Text
            style={[
              styles.metricValue,
              { color: theme.textPrimary },
            ]}
          >
            {adherenceLabel}
          </Text>
        </View>

        {/* Biomarkers Metric */}
        <View style={styles.metricItem}>
          <View style={styles.labelRow}>
            <View
              style={[
                styles.ringDot,
                { backgroundColor: theme.rings.biomarkers },
              ]}
            />
            <Text
              style={[
                styles.metricLabel,
                { color: theme.textSecondary },
              ]}
            >
              Biomarkers
            </Text>
          </View>
          <Text
            style={[
              styles.metricValue,
              { color: theme.textPrimary },
            ]}
          >
            {biomarkersLabel}
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  svgWrapper: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
});
