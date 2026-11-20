import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
  bars?: number[]; // array of 0 to 100 percentage values (8 bars)
  ticks?: number[]; // backward-compatible alias
  onPress: (id: string) => void;
}

// 8 spacious baseline bar heights representing a day's telemetry rhythm
const DEFAULT_8_BARS = [25, 20, 35, 65, 80, 75, 60, 30];
const EMPTY_8_BARS = [12, 12, 12, 12, 12, 12, 12, 12];

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
  onPress,
}: BentoMetricCardProps) {
  const { colors, isDark } = useTheme();

  const isNoData = !value || value === "--" || value === "null";
  const displayValue = isNoData ? "--" : value;
  const displaySublabel = isNoData ? "No data today" : sublabel;

  // Normalize bars to exactly 8 spacious slots
  const sourceBars = bars ?? ticks ?? (isNoData ? EMPTY_8_BARS : DEFAULT_8_BARS);
  const displayBars = useMemo(() => {
    if (isNoData) return EMPTY_8_BARS;
    if (!sourceBars || sourceBars.length === 0) return DEFAULT_8_BARS;
    if (sourceBars.length === 8) return sourceBars;
    return Array.from({ length: 8 }, (_, i) => {
      const idx = Math.floor((i / 8) * sourceBars.length);
      return sourceBars[idx] ?? 20;
    });
  }, [sourceBars, isNoData]);

  // Translucent track color
  const trackBgColor = useMemo(() => {
    return isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";
  }, [isDark]);

  const cardBorderColor = isDark
    ? "rgba(255, 255, 255, 0.10)"
    : "rgba(0, 0, 0, 0.08)";

  const chevronBg = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.04)";

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${displayValue} ${unit || ""}`}
      onPress={() => onPress(id)}
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.surface,
          borderColor: cardBorderColor,
        },
      ]}
    >
      {/* ── Row 1: Title + Subtle Circular Chevron ── */}
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
        <View style={[styles.chevronCircle, { backgroundColor: chevronBg }]}>
          <ChevronRight
            size={11}
            color={colors.textSecondary}
            strokeWidth={2.4}
          />
        </View>
      </View>

      {/* ── Row 2: Subtitle (Today / No data today) ── */}
      <Text
        style={[
          styles.timestampText,
          { color: isNoData ? colors.textMuted : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {displaySublabel}
      </Text>

      {/* ── Row 3: Bold Metric Value + Colored Unit ── */}
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.valueText,
            {
              color: isNoData
                ? colors.textMuted
                : valueColor || colors.textPrimary,
            },
          ]}
          numberOfLines={1}
        >
          {displayValue}
        </Text>
        {unit && !isNoData ? (
          <Text
            style={[
              styles.unitText,
              { color: unitColor || valueColor || accentColor },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>

      {/* ── Row 4: 8 Spacious Apple-Style Vertical Bars ── */}
      <View style={styles.barsContainer}>
        <View style={styles.barsRow}>
          {displayBars.map((heightPercent, index) => {
            const clamped = isNoData ? 8 : Math.max(12, Math.min(100, heightPercent));
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
                      backgroundColor: isNoData ? trackBgColor : accentColor,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* 2 Clean Spaced Time Indicators: 12 AM, 6 PM */}
        <View style={styles.timeIndicatorsRow}>
          <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
            12 AM
          </Text>
          <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
            6 PM
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
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
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 4,
  },
  chevronCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  timestampText: {
    fontSize: 11.5,
    fontWeight: "500",
    marginTop: 2,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginVertical: 8,
  },
  valueText: {
    fontSize: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  barsContainer: {
    marginTop: 2,
    width: "100%",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 32,
    width: "100%",
    paddingHorizontal: 2,
  },
  barTrack: {
    width: 5,
    height: 32,
    borderRadius: 2.5,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: 5,
    borderRadius: 2.5,
  },
  timeIndicatorsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  timeLabel: {
    fontSize: 9.5,
    fontWeight: "500",
  },
});
