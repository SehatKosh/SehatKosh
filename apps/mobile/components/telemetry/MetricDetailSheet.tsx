import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { MessageSquare, Sparkles, X } from "lucide-react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

export interface MetricDetailData {
  id: string;
  label: string;
  currentValue: string;
  unit: string;
  status: string;
  statusColor: string;
  minRange?: string;
  maxRange?: string;
  sparklinePoints: number[];
  recentReadings: Array<{ time: string; value: string }>;
}

interface MetricDetailSheetProps {
  data: MetricDetailData | null;
  onClose: () => void;
}

const { width } = Dimensions.get("window");

export function MetricDetailSheet({ data, onClose }: MetricDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [range, setRange] = useState<"24H" | "7D" | "30D">("7D");

  if (!data) return null;

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

  const handleAskAvi = () => {
    onClose();
    router.navigate("/(tabs)/chat");
  };

  return (
    <Modal
      visible={Boolean(data)}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderStrong,
                  paddingBottom: Math.max(insets.bottom, 24),
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
                      { color: colors.textSecondary },
                    ]}
                  >
                    {data.label}
                  </Text>
                  <View style={styles.valueRow}>
                    <Text
                      style={[
                        styles.sheetValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {data.currentValue}
                    </Text>
                    {data.unit ? (
                      <Text
                        style={[
                          styles.sheetUnit,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {data.unit}
                      </Text>
                    ) : null}
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
                    { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" },
                  ]}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Time Range Selector */}
              <View
                style={[
                  styles.rangeSelector,
                  {
                    backgroundColor: isDark ? "#0D1117" : "#F1F5F9",
                    borderColor: colors.border,
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
                          borderColor: colors.border,
                        },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.rangeText,
                        {
                          color:
                            range === r
                              ? colors.textPrimary
                              : colors.textSecondary,
                          fontWeight: range === r ? "700" : "500",
                        },
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 7-Day Trend Sparkline Graph */}
              <View style={styles.chartContainer}>
                <Svg width={graphWidth} height={graphHeight}>
                  <Defs>
                    <LinearGradient id="sheetGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop
                        offset="0%"
                        stopColor={data.statusColor}
                        stopOpacity="0.35"
                      />
                      <Stop
                        offset="100%"
                        stopColor={data.statusColor}
                        stopOpacity="0.0"
                      />
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

              {/* Min/Max Baseline Indicator */}
              <View
                style={[
                  styles.rangeIndicatorRow,
                  {
                    backgroundColor: isDark ? "#0D1117" : "#F8FAFC",
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.rangeItem}>
                  <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
                    Min Range
                  </Text>
                  <Text style={[styles.rangeVal, { color: colors.textPrimary }]}>
                    {data.minRange || `${min} ${data.unit}`}
                  </Text>
                </View>
                <View style={styles.rangeItem}>
                  <Text style={[styles.rangeLabel, { color: colors.textSecondary }]}>
                    Max Range
                  </Text>
                  <Text style={[styles.rangeVal, { color: colors.textPrimary }]}>
                    {data.maxRange || `${max} ${data.unit}`}
                  </Text>
                </View>
              </View>

              {/* Quick Action: "Ask Avi About This Metric" */}
              <TouchableOpacity
                onPress={handleAskAvi}
                activeOpacity={0.8}
                style={[
                  styles.askAviBtn,
                  { backgroundColor: colors.tabBarActive },
                ]}
              >
                <MessageSquare size={16} color="#FFFFFF" />
                <Text style={styles.askAviText}>
                  Ask Avi About My {data.label}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    gap: 14,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#64748B",
    alignSelf: "center",
    marginBottom: 8,
    opacity: 0.5,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  sheetLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 2,
  },
  sheetValue: {
    fontSize: 28,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  sheetUnit: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    marginLeft: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
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
    borderRadius: 9999,
    borderWidth: 1,
    padding: 3,
  },
  rangePill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
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
    marginVertical: 4,
  },
  rangeIndicatorRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  rangeItem: {
    alignItems: "center",
    gap: 2,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  rangeVal: {
    fontSize: 14,
    fontWeight: "700",
  },
  askAviBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 4,
  },
  askAviText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
