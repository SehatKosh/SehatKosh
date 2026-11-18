import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  ticks?: number[]; // array of 0 to 100 percentages for 24 hours
  onPress: (id: string) => void;
}

// 24 default hour heights for realistic baseline curve if none passed
const DEFAULT_24_TICKS = [
  15, 12, 10, 8, 8, 12, 25, 45, 60, 55, 70, 65, 80, 75, 85, 90, 70, 60, 50, 45, 35, 30, 25, 20,
];

export function BentoMetricCard({
  id,
  label,
  sublabel = "Today",
  value,
  unit,
  valueColor,
  unitColor,
  accentColor = "#FA114F",
  ticks = DEFAULT_24_TICKS,
  onPress,
}: BentoMetricCardProps) {
  const { colors, isDark } = useTheme();

  // Normalize ticks to 24 slots
  const displayTicks = React.useMemo(() => {
    if (!ticks || ticks.length === 0) return DEFAULT_24_TICKS;
    if (ticks.length === 24) return ticks;
    // Stretch/repeat to 24 if fewer provided
    return Array.from({ length: 24 }, (_, i) => {
      const idx = Math.floor((i / 24) * ticks.length);
      return ticks[idx] ?? 20;
    });
  }, [ticks]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value} ${unit || ""}`}
      onPress={() => onPress(id)}
      style={({ pressed }) => [
        styles.cardContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {/* ── Top Row: Metric Name + Circular Chevron Badge ─────────────────── */}
      <View style={styles.topRow}>
        <Text
          style={[
            styles.metricTitle,
            { color: colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <View
          style={[
            styles.chevronBadge,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "#F1F5F9",
            },
          ]}
        >
          <ChevronRight size={11} color={colors.textSecondary} />
        </View>
      </View>

      {/* ── Subtitle: Today ──────────────────────────────────────────────── */}
      <Text
        style={[
          styles.sublabel,
          { color: colors.textSecondary },
        ]}
      >
        {sublabel}
      </Text>

      {/* ── Large Metric Readout (24px Bold, tabular-nums) ────────────────── */}
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

      {/* ── Bottom: 24 Narrow Vertical Tick Bars (width: 2.5px) ───────────── */}
      <View style={styles.visualizationContainer}>
        <View style={styles.ticksRow}>
          {displayTicks.map((fillPercent, index) => {
            const clamped = Math.max(8, Math.min(100, fillPercent));
            return (
              <View
                key={index}
                style={[
                  styles.tickTrack,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(0, 0, 0, 0.08)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.tickFill,
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

        {/* Time-axis labels */}
        <View style={styles.timeAxisRow}>
          <Text style={[styles.timeAxisText, { color: colors.textSecondary }]}>
            12AM
          </Text>
          <Text style={[styles.timeAxisText, { color: colors.textSecondary }]}>
            6AM
          </Text>
          <Text style={[styles.timeAxisText, { color: colors.textSecondary }]}>
            12PM
          </Text>
          <Text style={[styles.timeAxisText, { color: colors.textSecondary }]}>
            6PM
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    minHeight: 168,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 6,
  },
  chevronBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sublabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 6,
    marginBottom: 6,
  },
  valueText: {
    fontSize: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  unitText: {
    fontSize: 13,
    fontWeight: "600",
  },
  visualizationContainer: {
    marginTop: 6,
  },
  ticksRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 34,
  },
  tickTrack: {
    width: 2.5,
    height: 34,
    borderRadius: 2,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  tickFill: {
    width: 2.5,
    borderRadius: 2,
  },
  timeAxisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timeAxisText: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
});
