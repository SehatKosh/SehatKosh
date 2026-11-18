import React, { useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { ChevronRight, X } from "lucide-react-native";
import { useAppTheme } from "../../constants/themeContext";
import { RADII } from "../../constants/theme";

export interface MetricDetailData {
  id: string;
  label: string;
  currentValue: string;
  unit: string;
  status: string;
  statusColor: string;
  sparklinePoints: number[]; // normalized or absolute
  recentReadings: Array<{ time: string; value: string }>;
}

interface MetricDetailSheetProps {
  data: MetricDetailData | null;
  onClose: () => void;
}

const { width } = Dimensions.get("window");

export function MetricDetailSheet({ data, onClose }: MetricDetailSheetProps) {
  const { theme, isDark } = useAppTheme();
  const [range, setRange] = useState<"24H" | "7D" | "30D">("7D");

  if (!data) return null;

  // Build SVG path from points
  const graphWidth = width - 64;
  const graphHeight = 100;
  const points = data.sparklinePoints;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const delta = max - min || 1;

  const pathCoordinates = points.map((p, index) => {
    const x = (index / (points.length - 1)) * graphWidth;
    const y = graphHeight - ((p - min) / delta) * (graphHeight - 20) - 10;
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  });

  const linePath = pathCoordinates.join(" ");
  const areaPath = `${linePath} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0, 0, 0, 0.6)" },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet Content */}
      <View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: theme.borderActive,
          },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <View>
            <Text
              style={[
                styles.sheetLabel,
                { color: theme.textSecondary },
              ]}
            >
              {data.label}
            </Text>
            <View style={styles.valueRow}>
              <Text
                style={[
                  styles.sheetValue,
                  { color: theme.textPrimary },
                ]}
              >
                {data.currentValue}
              </Text>
              <Text
                style={[
                  styles.sheetUnit,
                  { color: theme.textSecondary },
                ]}
              >
                {data.unit}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${data.statusColor}22` },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: data.statusColor },
                  ]}
                >
                  {data.status}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={[
              styles.closeBtn,
              { backgroundColor: isDark ? "#1C212C" : "#F1F5F9" },
            ]}
          >
            <X size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Time Range Selector */}
        <View
          style={[
            styles.rangeSelector,
            {
              backgroundColor: isDark ? "#0D1117" : "#F1F5F9",
              borderColor: theme.border,
            },
          ]}
        >
          {(["24H", "7D", "30D"] as const).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              activeOpacity={0.8}
              style={[
                styles.rangePill,
                range === r && [
                  styles.rangePillActive,
                  {
                    backgroundColor: isDark ? "#1C212C" : "#FFFFFF",
                    borderColor: theme.border,
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.rangeText,
                  {
                    color:
                      range === r ? theme.textPrimary : theme.textSecondary,
                    fontWeight: range === r ? "700" : "500",
                  },
                ]}
              >
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Longitudinal Sparkline Graph */}
        <View style={styles.chartContainer}>
          <Svg width={graphWidth} height={graphHeight}>
            <Defs>
              <LinearGradient id="sheetGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={data.statusColor} stopOpacity="0.3" />
                <Stop offset="100%" stopColor={data.statusColor} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>
            <Path d={areaPath} fill="url(#sheetGrad)" />
            <Path
              d={linePath}
              fill="none"
              stroke={data.statusColor}
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        {/* Recent Readings List */}
        <View style={styles.recentSection}>
          <Text
            style={[
              styles.recentHeading,
              { color: theme.textSecondary },
            ]}
          >
            Recent Logs
          </Text>

          <View
            style={[
              styles.readingsList,
              {
                backgroundColor: isDark ? "#0D1117" : "#F8FAFC",
                borderColor: theme.border,
              },
            ]}
          >
            {data.recentReadings.map((reading, index) => (
              <View
                key={index}
                style={[
                  styles.readingRow,
                  index < data.recentReadings.length - 1 && [
                    styles.readingDivider,
                    { borderBottomColor: theme.border },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.readingTime,
                    { color: theme.textSecondary },
                  ]}
                >
                  {reading.time}
                </Text>
                <Text
                  style={[
                    styles.readingValue,
                    { color: theme.textPrimary },
                  ]}
                >
                  {reading.value} {data.unit}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#64748B",
    alignSelf: "center",
    marginBottom: 16,
    opacity: 0.5,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  sheetValue: {
    fontSize: 28,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  sheetUnit: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    marginLeft: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeSelector: {
    flexDirection: "row",
    borderRadius: RADII.pill,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  rangePill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rangePillActive: {},
  rangeText: {
    fontSize: 12,
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  recentSection: {
    gap: 8,
  },
  recentHeading: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  readingsList: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  readingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  readingDivider: {
    borderBottomWidth: 1,
  },
  readingTime: {
    fontSize: 13,
    fontWeight: "500",
  },
  readingValue: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
