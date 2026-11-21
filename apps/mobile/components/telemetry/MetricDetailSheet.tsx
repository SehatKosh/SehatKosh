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
import {
  AlertCircle,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Watch,
  X,
} from "lucide-react-native";
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
  hourlyBars?: number[]; // 16 slots for Today's hourly breakdown (06:00 to 22:00)
  sevenDayHistory?: Array<{
    date: string;
    label: string;
    value: number | null;
  }>;
  recentReadings?: Array<{ time: string; value: string }>;
}

interface MetricDetailSheetProps {
  data: MetricDetailData | null;
  onClose: () => void;
  onSyncNow?: () => void;
}

const { width } = Dimensions.get("window");

export function MetricDetailSheet({
  data,
  onClose,
  onSyncNow,
}: MetricDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [range, setRange] = useState<"24H" | "7D">("7D");

  if (!data) return null;

  const isNoData =
    !data.currentValue ||
    data.currentValue === "--" ||
    data.currentValue === "null";

  const hasHourly =
    Array.isArray(data.hourlyBars) && data.hourlyBars.some((v) => v > 0);
  const has7Day =
    Array.isArray(data.sevenDayHistory) &&
    data.sevenDayHistory.some((h) => h.value !== null && h.value > 0);
  const hasSparkline =
    Array.isArray(data.sparklinePoints) && data.sparklinePoints.length > 0;

  const isCompletelyEmpty = isNoData && !hasHourly && !has7Day && !hasSparkline;

  // 7-Day History Statistics Calculation
  const valid7DayValues = (data.sevenDayHistory || [])
    .map((h) => h.value)
    .filter((v): v is number => v !== null && v > 0);

  const calcMin =
    valid7DayValues.length > 0
      ? Math.min(...valid7DayValues)
      : hasSparkline
      ? Math.min(...data.sparklinePoints)
      : null;

  const calcMax =
    valid7DayValues.length > 0
      ? Math.max(...valid7DayValues)
      : hasSparkline
      ? Math.max(...data.sparklinePoints)
      : null;

  const calcAvg =
    valid7DayValues.length > 0
      ? Math.round(
          valid7DayValues.reduce((a, b) => a + b, 0) / valid7DayValues.length
        )
      : hasSparkline
      ? Math.round(
          data.sparklinePoints.reduce((a, b) => a + b, 0) /
            data.sparklinePoints.length
        )
      : null;

  const graphWidth = width - 64;
  const graphHeight = 100;

  const handleAskAvi = () => {
    const valText = isNoData ? "unrecorded status" : `${data.currentValue} ${data.unit || ""}`;
    const query = `Analyze my recent ${data.label} reading of ${valText}.`;
    onClose();
    router.navigate({
      pathname: "/(tabs)/chat",
      params: { initialQuery: query },
    });
  };

  const handleSyncPress = () => {
    if (onSyncNow) {
      onSyncNow();
    }
    onClose();
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
                        { color: isNoData ? colors.textMuted : colors.textPrimary },
                      ]}
                    >
                      {data.currentValue}
                    </Text>
                    {data.unit && !isNoData ? (
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

              {/* ── Empty Card State: Themed "No Readings Synced Yet" ─────────── */}
              {isCompletelyEmpty ? (
                <View
                  style={[
                    styles.emptyNoticeCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(15, 23, 42, 0.6)"
                        : "#F8FAFC",
                      borderColor: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "#E2E8F0",
                    },
                  ]}
                >
                  <View style={styles.emptyIconCircle}>
                    <Watch size={24} color="#38BDF8" />
                  </View>
                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    No Readings Synced Yet
                  </Text>
                  <Text
                    style={[
                      styles.emptyDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Sync your watch in Samsung Health (pull down to refresh),
                    then tap Sync Health Connect Now below.
                  </Text>

                  <View style={styles.emptyActionRow}>
                    <TouchableOpacity
                      onPress={handleSyncPress}
                      activeOpacity={0.8}
                      style={[
                        styles.emptySyncBtn,
                        { backgroundColor: "#10B981" },
                      ]}
                    >
                      <RefreshCw size={14} color="#FFFFFF" />
                      <Text style={styles.emptyBtnText}>
                        Sync Health Connect Now
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleAskAvi}
                      activeOpacity={0.8}
                      style={[
                        styles.emptyAskAviBtn,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <MessageSquare size={14} color={colors.textPrimary} />
                      <Text
                        style={[
                          styles.emptyAskAviText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Ask Avi About This Metric
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {/* Segmented Time Range Tabs: 24H (Hourly) vs 7D (Daily History) */}
                  <View
                    style={[
                      styles.rangeSelector,
                      {
                        backgroundColor: isDark ? "#0D1117" : "#F1F5F9",
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {(["24H", "7D"] as const).map((r) => (
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
                          {r === "24H"
                            ? "24H (Today's Hourly)"
                            : "7D (Daily Trend)"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* ── View A: 24H View (16-Slot Hourly Daytime Breakdown) ─── */}
                  {range === "24H" && (
                    <View style={styles.chartContainer}>
                      <View style={styles.hourlyBarsWrapper}>
                        {(data.hourlyBars || Array(16).fill(0)).map(
                          (val, index) => {
                            const maxVal = Math.max(
                              ...(data.hourlyBars || [1]),
                              1
                            );
                            const heightPct =
                              val > 0
                                ? Math.max(Math.round((val / maxVal) * 88) + 12, 12)
                                : 8;
                            return (
                              <View
                                key={index}
                                style={styles.hourlyBarColumn}
                              >
                                <View
                                  style={[
                                    styles.hourlyBarTrack,
                                    {
                                      backgroundColor: isDark
                                        ? "rgba(255, 255, 255, 0.08)"
                                        : "rgba(0, 0, 0, 0.05)",
                                    },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.hourlyBarFill,
                                      {
                                        height: `${heightPct}%`,
                                        backgroundColor:
                                          val > 0
                                            ? data.statusColor
                                            : "transparent",
                                      },
                                    ]}
                                  />
                                </View>
                              </View>
                            );
                          }
                        )}
                      </View>
                      {/* Time Labels beneath 16 slots */}
                      <View style={styles.timeAxisRow}>
                        <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
                          6 AM
                        </Text>
                        <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
                          10 AM
                        </Text>
                        <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
                          2 PM
                        </Text>
                        <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
                          6 PM
                        </Text>
                        <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
                          10 PM
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* ── View B: 7D View (Mon–Sun 7 Daily Bars + Min/Avg/Max) ── */}
                  {range === "7D" && (
                    <View style={styles.chartContainer}>
                      <View style={styles.sevenDayBarsWrapper}>
                        {(data.sevenDayHistory || []).map((day, idx) => {
                          const val = day.value ?? 0;
                          const maxVal = Math.max(
                            ...((data.sevenDayHistory || []).map(
                              (h) => h.value ?? 0
                            )),
                            1
                          );
                          const heightPct =
                            val > 0
                              ? Math.max(
                                  Math.round((val / maxVal) * 88) + 12,
                                  12
                                )
                              : 8;
                          const isToday =
                            idx === (data.sevenDayHistory?.length || 7) - 1;

                          return (
                            <View key={idx} style={styles.sevenDayCol}>
                              <View
                                style={[
                                  styles.sevenDayTrack,
                                  {
                                    backgroundColor: isDark
                                      ? "rgba(255, 255, 255, 0.08)"
                                      : "rgba(0, 0, 0, 0.05)",
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.sevenDayFill,
                                    {
                                      height: `${heightPct}%`,
                                      backgroundColor:
                                        val > 0
                                          ? isToday
                                            ? data.statusColor
                                            : `${data.statusColor}BB`
                                          : "transparent",
                                    },
                                  ]}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.sevenDayLabel,
                                  {
                                    color: isToday
                                      ? data.statusColor
                                      : colors.textSecondary,
                                    fontWeight: isToday ? "700" : "500",
                                  },
                                ]}
                              >
                                {day.label}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Min / 7-Day Avg / Max Stats Indicator */}
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
                      <Text
                        style={[
                          styles.rangeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Min
                      </Text>
                      <Text
                        style={[styles.rangeVal, { color: colors.textPrimary }]}
                      >
                        {calcMin !== null
                          ? `${calcMin} ${data.unit}`
                          : data.minRange || "--"}
                      </Text>
                    </View>

                    <View style={styles.rangeItem}>
                      <Text
                        style={[
                          styles.rangeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        7-Day Avg
                      </Text>
                      <Text
                        style={[styles.rangeVal, { color: data.statusColor }]}
                      >
                        {calcAvg !== null
                          ? `${calcAvg} ${data.unit}`
                          : "--"}
                      </Text>
                    </View>

                    <View style={styles.rangeItem}>
                      <Text
                        style={[
                          styles.rangeLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Max
                      </Text>
                      <Text
                        style={[styles.rangeVal, { color: colors.textPrimary }]}
                      >
                        {calcMax !== null
                          ? `${calcMax} ${data.unit}`
                          : data.maxRange || "--"}
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
                </>
              )}
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
  emptyNoticeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginVertical: 6,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  emptyActionRow: {
    width: "100%",
    gap: 8,
  },
  emptySyncBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyAskAviBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyAskAviText: {
    fontSize: 13,
    fontWeight: "600",
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
    minHeight: 110,
  },
  hourlyBarsWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
    height: 80,
    paddingHorizontal: 4,
  },
  hourlyBarColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 2,
  },
  hourlyBarTrack: {
    width: 6,
    height: "100%",
    borderRadius: 3,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  hourlyBarFill: {
    width: "100%",
    borderRadius: 3,
  },
  timeAxisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
    marginTop: 8,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  sevenDayBarsWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
    height: 90,
    paddingHorizontal: 8,
  },
  sevenDayCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  sevenDayTrack: {
    width: 14,
    height: 70,
    borderRadius: 7,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  sevenDayFill: {
    width: "100%",
    borderRadius: 7,
  },
  sevenDayLabel: {
    fontSize: 11,
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
