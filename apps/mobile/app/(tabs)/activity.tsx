import React, { useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MoonStar, Sun, Watch } from "lucide-react-native";

import { useTheme } from "../../context/ThemeContext";
import { usePatient } from "../../context/PatientContext";
import { AppleHealthSingleRing } from "../../components/telemetry/AppleHealthSingleRing";
import { BentoMetricCard } from "../../components/telemetry/BentoMetricCard";
import {
  MetricDetailData,
  MetricDetailSheet,
} from "../../components/telemetry/MetricDetailSheet";
import { TelemetrySyncModal } from "../../components/telemetry/TelemetrySyncModal";
import {
  downsample16To8,
  normalizeToPercentBars,
} from "../../services/telemetryService";

const HORIZONTAL_PADDING = 16;

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const {
    patient,
    telemetry,
    isHealthConnected,
    isSyncing,
    syncTelemetryNow,
  } = usePatient();

  const [selectedMetric, setSelectedMetric] = useState<MetricDetailData | null>(
    null
  );
  const [syncModalVisible, setSyncModalVisible] = useState(false);

  // ── Compute 8 Spacious Preview Bars for Home Bento Cards ──────────────────
  const distBars = useMemo(() => {
    const rawDist16 =
      telemetry.hourlyBreakdown?.hourlyDistance || Array(16).fill(0);
    return normalizeToPercentBars(downsample16To8(rawDist16));
  }, [telemetry.hourlyBreakdown?.hourlyDistance]);

  const hrBars = useMemo(() => {
    const rawHr16 =
      telemetry.hourlyBreakdown?.hourlyHr || Array(16).fill(null);
    return normalizeToPercentBars(rawHr16.map((v) => v ?? 0));
  }, [telemetry.hourlyBreakdown?.hourlyHr]);

  const calBars = useMemo(() => {
    const rawCal16 =
      telemetry.hourlyBreakdown?.hourlyCalories || Array(16).fill(0);
    return normalizeToPercentBars(downsample16To8(rawCal16));
  }, [telemetry.hourlyBreakdown?.hourlyCalories]);

  // ── Dynamic Metric Detail Data Map ───────────────────────────────────────
  const METRIC_DETAILS: Record<string, MetricDetailData> = {
    steps: {
      id: "steps",
      label: "Step Distance",
      currentValue:
        telemetry.distanceKm > 0 ? `${telemetry.distanceKm.toFixed(2)}` : "--",
      unit: "KM",
      status: `${Math.round(
        (telemetry.steps / (telemetry.stepGoal || 8000)) * 100
      )}% of Daily Goal`,
      statusColor: "#38BDF8",
      minRange: "2.5 KM",
      maxRange: "8.0 KM",
      hourlyBars: telemetry.hourlyBreakdown?.hourlyDistance || [],
      sevenDayHistory:
        telemetry.dailyHistory?.map((d) => ({
          date: d.date,
          label: d.label,
          value: d.distanceKm,
        })) || [],
      sparklinePoints:
        telemetry.dailyHistory?.map((d) => d.distanceKm) || [],
      recentReadings: [
        {
          time: "Today (Live)",
          value: `${telemetry.distanceKm.toFixed(2)} KM`,
        },
      ],
    },
    hr: {
      id: "hr",
      label: "Heart Rate",
      currentValue:
        telemetry.restingHr !== null ? String(telemetry.restingHr) : "--",
      unit: "BPM",
      status:
        telemetry.restingHr !== null ? "Resting Optimal" : "No reading today",
      statusColor:
        telemetry.restingHr !== null ? "#FA114F" : colors.textMuted,
      minRange: "55 BPM",
      maxRange: "98 BPM",
      hourlyBars:
        telemetry.hourlyBreakdown?.hourlyHr?.map((v) => v ?? 0) || [],
      sevenDayHistory:
        telemetry.dailyHistory?.map((d) => ({
          date: d.date,
          label: d.label,
          value: d.restingHr,
        })) || [],
      sparklinePoints:
        telemetry.dailyHistory
          ?.map((d) => d.restingHr)
          .filter((v): v is number => v !== null) || [],
      recentReadings:
        telemetry.restingHr !== null
          ? [
              {
                time: "Live Synced",
                value: `${telemetry.restingHr} BPM`,
              },
            ]
          : [{ time: "Status", value: "Not measured today" }],
    },
    calories: {
      id: "calories",
      label: "Active Calories",
      currentValue:
        telemetry.activeKcal !== null
          ? String(Math.round(telemetry.activeKcal))
          : "--",
      unit: "KCAL",
      status:
        telemetry.activeKcal !== null
          ? `${Math.round(
              (telemetry.activeKcal / (telemetry.kcalGoal || 400)) * 100
            )}% of Daily Goal`
          : "No activity burned today",
      statusColor: "#FB923C",
      minRange: "150 KCAL",
      maxRange: "550 KCAL",
      hourlyBars: telemetry.hourlyBreakdown?.hourlyCalories || [],
      sevenDayHistory:
        telemetry.dailyHistory?.map((d) => ({
          date: d.date,
          label: d.label,
          value: d.calories,
        })) || [],
      sparklinePoints:
        telemetry.dailyHistory?.map((d) => d.calories) || [],
      recentReadings:
        telemetry.activeKcal !== null
          ? [
              {
                time: "Today (Live)",
                value: `${Math.round(telemetry.activeKcal)} KCAL`,
              },
            ]
          : [{ time: "Status", value: "No active calories logged" }],
    },
    spo2: {
      id: "spo2",
      label: "Blood Oxygen",
      currentValue:
        telemetry.spo2 !== null ? String(telemetry.spo2) : "--",
      unit: "%",
      status:
        telemetry.spo2 !== null ? "Optimal Saturation" : "No reading today",
      statusColor: telemetry.spo2 !== null ? "#0284C7" : colors.textMuted,
      minRange: "95%",
      maxRange: "100%",
      sevenDayHistory:
        telemetry.dailyHistory?.map((d) => ({
          date: d.date,
          label: d.label,
          value: telemetry.spo2,
        })) || [],
      sparklinePoints:
        telemetry.spo2 !== null ? [97, 98, 98, 99, 98, 98, telemetry.spo2] : [],
      recentReadings:
        telemetry.spo2 !== null
          ? [
              {
                time: "Live Synced",
                value: `${telemetry.spo2}%`,
              },
            ]
          : [{ time: "Status", value: "Not measured today" }],
    },
    sleep: {
      id: "sleep",
      label: "Sleep",
      currentValue: telemetry.sleepDuration || "--",
      unit: "",
      status: telemetry.sleepDuration
        ? "Restorative Stage"
        : "No sleep session recorded",
      statusColor: telemetry.sleepDuration ? "#818CF8" : colors.textMuted,
      minRange: "6h 00m",
      maxRange: "8h 30m",
      sevenDayHistory: [],
      sparklinePoints: telemetry.sleepDuration
        ? [6.5, 7.2, 6.8, 7.5, 7.1, 7.4]
        : [],
      recentReadings: telemetry.sleepDuration
        ? [{ time: "Last Recorded", value: telemetry.sleepDuration }]
        : [{ time: "Status", value: "No sleep logged" }],
    },
    bp: {
      id: "bp",
      label: "Blood Pressure",
      currentValue: telemetry.bloodPressure || "--",
      unit: "mmHg",
      status: telemetry.bloodPressure
        ? "Controlled (Atenolol 50mg)"
        : "No reading today",
      statusColor: telemetry.bloodPressure ? "#F59E0B" : colors.textMuted,
      minRange: "110/70 mmHg",
      maxRange: "130/85 mmHg",
      sevenDayHistory: [],
      sparklinePoints: telemetry.bloodPressure
        ? [116, 120, 118, 117, 119, 118]
        : [],
      recentReadings: telemetry.bloodPressure
        ? [
            {
              time: "Clinical Baseline",
              value: telemetry.bloodPressure,
            },
          ]
        : [{ time: "Status", value: "Not measured today" }],
    },
  };

  const handleCardPress = (id: string) => {
    if (METRIC_DETAILS[id]) {
      setSelectedMetric(METRIC_DETAILS[id]);
    }
  };

  const topPadding = Math.max(insets.top, 16);
  const platformName =
    Platform.OS === "ios" ? "Apple Health" : "Health Connect";

  const syncPillText = isSyncing
    ? "Syncing..."
    : isHealthConnected
    ? platformName
    : "Connect Watch";

  const syncPillColor = isSyncing
    ? "#38BDF8"
    : isHealthConnected
    ? "#10B981"
    : "#F59E0B";

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.canvas }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: topPadding, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={() => syncTelemetryNow(false)}
            tintColor={colors.tabBarActive}
            colors={[colors.tabBarActive]}
          />
        }
      >
        {/* ── Top Header: Patient Greeting, Sync Pill, Theme Switcher ──────── */}
        <View style={styles.headerRow}>
          <View>
            <Text
              style={[
                styles.greetingText,
                { color: colors.textPrimary },
              ]}
            >
              {patient.greetingName}
            </Text>
            <Text
              style={[
                styles.dateSubText,
                { color: colors.textSecondary },
              ]}
            >
              Today
            </Text>
          </View>

          <View style={styles.headerRightRow}>
            {/* Interactive Telemetry Sync Pill */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSyncModalVisible(true)}
              style={[
                styles.syncPill,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.12)"
                    : "#CBD5E1",
                },
              ]}
            >
              <View
                style={[styles.liveDot, { backgroundColor: syncPillColor }]}
              />
              <Watch size={13} color={syncPillColor} />
              <Text
                style={[
                  styles.syncText,
                  { color: colors.textSecondary },
                ]}
              >
                {syncPillText}
              </Text>
            </TouchableOpacity>

            {/* Strict Theme Toggle */}
            <TouchableOpacity
              accessibilityLabel="Toggle Theme"
              onPress={toggleTheme}
              activeOpacity={0.7}
              style={[
                styles.themeBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.12)"
                    : "#CBD5E1",
                },
              ]}
            >
              {isDark ? (
                <Sun size={16} color="#FBBF24" />
              ) : (
                <MoonStar size={16} color="#6366F1" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section 1: Dynamic Single Activity Ring Hero Card ───────────── */}
        <AppleHealthSingleRing
          steps={telemetry.steps}
          stepGoal={telemetry.stepGoal}
          distanceKm={telemetry.distanceKm}
          activeKcal={telemetry.activeKcal}
          kcalGoal={telemetry.kcalGoal}
        />

        {/* ── Section 2: Reordered 2-Column Bento Metric Grid ─────────────── */}
        <View style={styles.bentoGrid}>
          {/* Row 1: Step Distance & Heart Rate (Top Primary Wearable Metrics) */}
          <View style={styles.bentoRow}>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="steps"
                label="Step Distance"
                sublabel="Today"
                value={
                  telemetry.distanceKm > 0
                    ? `${telemetry.distanceKm.toFixed(2)}`
                    : "--"
                }
                unit="KM"
                accentColor="#38BDF8"
                valueColor="#38BDF8"
                bars={distBars}
                onPress={handleCardPress}
              />
            </View>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="hr"
                label="Heart Rate"
                sublabel={
                  telemetry.restingHr !== null ? "Today" : "No watch readings yet"
                }
                value={
                  telemetry.restingHr !== null
                    ? String(telemetry.restingHr)
                    : "--"
                }
                unit="BPM"
                accentColor="#FA114F"
                valueColor="#FA114F"
                bars={hrBars}
                onPress={handleCardPress}
              />
            </View>
          </View>

          {/* Row 2: Active Calories & Blood Oxygen */}
          <View style={styles.bentoRow}>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="calories"
                label="Active Calories"
                sublabel="Today"
                value={
                  telemetry.activeKcal !== null
                    ? String(Math.round(telemetry.activeKcal))
                    : "--"
                }
                unit="KCAL"
                accentColor="#FB923C"
                valueColor="#FB923C"
                bars={calBars}
                onPress={handleCardPress}
              />
            </View>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="spo2"
                label="Blood Oxygen"
                sublabel="Today"
                value={
                  telemetry.spo2 !== null ? String(telemetry.spo2) : "--"
                }
                unit="%"
                accentColor="#0284C7"
                valueColor="#0284C7"
                bars={
                  telemetry.spo2 !== null
                    ? [92, 95, 98, 98, 97, 98, 99, 98]
                    : [12, 12, 12, 12, 12, 12, 12, 12]
                }
                onPress={handleCardPress}
              />
            </View>
          </View>

          {/* Row 3: Sleep & Blood Pressure */}
          <View style={styles.bentoRow}>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="sleep"
                label="Sleep"
                sublabel="Today"
                value={telemetry.sleepDuration || "--"}
                accentColor="#818CF8"
                valueColor="#818CF8"
                bars={
                  telemetry.sleepDuration
                    ? [90, 85, 92, 70, 30, 10, 0, 15]
                    : [12, 12, 12, 12, 12, 12, 12, 12]
                }
                onPress={handleCardPress}
              />
            </View>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="bp"
                label="Blood Pressure"
                sublabel="Today"
                value={telemetry.bloodPressure || "--"}
                unit="mmHg"
                accentColor="#F59E0B"
                valueColor="#F59E0B"
                bars={
                  telemetry.bloodPressure
                    ? [45, 65, 75, 70, 78, 72, 80, 75]
                    : [12, 12, 12, 12, 12, 12, 12, 12]
                }
                onPress={handleCardPress}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Interactive Detail Bottom Sheet Modal ── */}
      <MetricDetailSheet
        data={selectedMetric}
        onClose={() => setSelectedMetric(null)}
        onSyncNow={() => syncTelemetryNow(false)}
      />

      {/* ── Wearable Telemetry Sync Modal ── */}
      <TelemetrySyncModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 4,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  dateSubText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 1,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontSize: 12,
    fontWeight: "600",
  },
  themeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bentoGrid: {
    gap: 12,
  },
  bentoRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  cardCol: {
    flex: 1,
  },
});
