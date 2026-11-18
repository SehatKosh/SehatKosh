import React from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";

export interface BentoMetricCardProps {
  id: string;
  label: string;
  sublabel?: string;
  value: string;
  unit?: string;
  valueColor?: string;
  unitColor?: string;
  accentColor?: string;
  bars?: number[]; // array of 0 to 100 percentage values (16 bars)
  ticks?: number[]; // backward-compatible alias
  cardWidth?: number;
  onPress: (id: string) => void;
}

// 16 baseline bar heights representing a day's telemetry rhythm
const DEFAULT_16_BARS = [
  20, 15, 12, 10, 15, 35, 60, 75, 85, 70, 80, 90, 75, 60, 40, 25,
];

const SCREEN_WIDTH = Dimensions.get("window").width;
const DEFAULT_CARD_WIDTH = Math.floor((SCREEN_WIDTH - 16 * 2 - 12) / 2);

export function BentoMetricCard({
  id,
  label,
  sublabel = "Today",
  value,
  unit,
  valueColor,
  unitColor,
  accentColor = "#FA114F",
  bars,
  ticks,
  cardWidth = DEFAULT_CARD_WIDTH,
  onPress,
}: BentoMetricCardProps) {
  const { colors, isDark } = useTheme();

  // Normalize bars to exactly 16 slots (accepting bars or ticks alias)
  const sourceBars = bars ?? ticks ?? DEFAULT_16_BARS;
  const displayBars = React.useMemo(() => {
    if (!sourceBars || sourceBars.length === 0) return DEFAULT_16_BARS;
    if (sourceBars.length === 16) return sourceBars;
    return Array.from({ length: 16 }, (_, i) => {
      const idx = Math.floor((i / 16) * sourceBars.length);
      return sourceBars[idx] ?? 20;
    });
  }, [sourceBars]);

  // Convert hex accent color to 14% translucent track color
  const trackBgColor = React.useMemo(() => {
    return isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  }, [isDark]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value} ${unit || ""}`}
      onPress={() => onPress(id)}
      style={({ pressed }) => [
        styles.cardContainer,
        {
          width: cardWidth,
          backgroundColor: colors.surface,
          borderColor: isDark ? "rgba(255, 255, 255, 0.10)" : "#E2E8F0",
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      {/* ── Row 1 (Header): Full Untruncated Title + 24x24 Circular Chevron ── */}
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.titleText,
            { color: colors.textPrimary },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>
        <View
          style={[
            styles.chevronCircle,
            { backgroundColor: colors.surfaceElevated },
          ]}
        >
          <ChevronRight size={12} color={colors.textSecondary} />
        </View>
      </View>

      {/* ── Row 2 (Timestamp): Today ─────────────────────────────────────── */}
      <Text
        style={[
          styles.timestampText,
          { color: colors.textSecondary },
        ]}
      >
        {sublabel}
      </Text>

      {/* ── Row 3 (Oversized Value): 28px Bold + Colored Unit ────────────── */}
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.valueText,
            { color: valueColor || colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            style={[
              styles.unitText,
              { color: unitColor || valueColor || colors.textSecondary },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>

      {/* ── Row 4: 16 Narrow Vertical Bars (width: 3, height: 36) ────────── */}
      <View style={styles.barsContainer}>
        <View style={styles.barsRow}>
          {displayBars.map((heightPercent, index) => {
            const clamped = Math.max(10, Math.min(100, heightPercent));
            return (
              <View
                key={index}
                style={[
                  styles.barTrack,
                  { backgroundColor: trackBgColor },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${clamped}%`,
                      backgroundColor: accentColor,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* ONLY 3 Spaced Time Indicators: 12AM, 12PM, 6PM */}
        <View style={styles.timeIndicatorsRow}>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
            12AM
          </Text>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
            12PM
          </Text>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
            6PM
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 4,
  },
  chevronCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  timestampText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginVertical: 10,
  },
  valueText: {
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 14,
    fontWeight: "700",
  },
  barsContainer: {
    marginTop: 2,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 36,
  },
  barTrack: {
    width: 3,
    height: 36,
    borderRadius: 2,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: 3,
    borderRadius: 2,
  },
  timeIndicatorsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
});
