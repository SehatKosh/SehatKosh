import React, { useState } from "react";
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

  const METRIC_DETAILS: Record<string, MetricDetailData> = {
    hr: {
      id: "hr",
      label: "Heart Rate",
      currentValue: telemetry.restingHr !== null ? String(telemetry.restingHr) : "--",
      unit: "BPM",
      status: telemetry.restingHr !== null ? "Resting Optimal" : "No reading today",
      statusColor: telemetry.restingHr !== null ? "#10B981" : colors.textMuted,
      minRange: "58 BPM",
      maxRange: "96 BPM",
      sparklinePoints: telemetry.restingHr !== null ? [68, 72, 70, 75, 73, 71, telemetry.restingHr] : [],
      recentReadings: telemetry.restingHr !== null
        ? [
            { time: "Live Synced", value: String(telemetry.restingHr) },
            { time: "Yesterday", value: "68" },
          ]
        : [{ time: "Status", value: "Not measured today" }],
    },
    spo2: {
      id: "spo2",
      label: "Blood Oxygen",
      currentValue: telemetry.spo2 !== null ? String(telemetry.spo2) : "--",
      unit: "%",
      status: telemetry.spo2 !== null ? "Optimal Saturation" : "No reading today",
      statusColor: telemetry.spo2 !== null ? "#10B981" : colors.textMuted,
      minRange: "96%",
      maxRange: "99%",
      sparklinePoints: telemetry.spo2 !== null ? [97, 98, 98, 99, 98, 98, telemetry.spo2] : [],
      recentReadings: telemetry.spo2 !== null
        ? [
            { time: "Live Synced", value: String(telemetry.spo2) },
            { time: "Yesterday", value: "98" },
          ]
        : [{ time: "Status", value: "Not measured today" }],
    },
    bp: {
      id: "bp",
      label: "Blood Pressure",
      currentValue: telemetry.bloodPressure || "--",
      unit: "mmHg",
      status: telemetry.bloodPressure ? "Controlled (Atenolol 50mg)" : "No reading today",
      statusColor: telemetry.bloodPressure ? "#10B981" : colors.textMuted,
      minRange: "114/72 mmHg",
      maxRange: "128/82 mmHg",
      sparklinePoints: telemetry.bloodPressure ? [116, 120, 118, 117, 119, 118] : [],
      recentReadings: telemetry.bloodPressure
        ? [
            { time: "Clinical Baseline", value: telemetry.bloodPressure },
            { time: "Yesterday", value: "116/74" },
          ]
        : [{ time: "Status", value: "Not measured today" }],
    },
    sleep: {
      id: "sleep",
      label: "Sleep",
      currentValue: telemetry.sleepDuration || "--",
      unit: "",
      status: telemetry.sleepDuration ? "Restorative Stage" : "No sleep session recorded",
      statusColor: telemetry.sleepDuration ? "#818CF8" : colors.textMuted,
      minRange: "6h 20m",
      maxRange: "8h 10m",
      sparklinePoints: telemetry.sleepDuration ? [6.5, 7.2, 6.8, 7.5, 7.1, 7.4] : [],
      recentReadings: telemetry.sleepDuration
        ? [{ time: "Last Recorded", value: telemetry.sleepDuration }]
        : [{ time: "Status", value: "No sleep logged" }],
    },
    steps: {
      id: "steps",
      label: "Step Distance",
      currentValue: telemetry.distanceKm > 0 ? `${telemetry.distanceKm}` : "--",
      unit: "KM",
      status: `${Math.round((telemetry.steps / telemetry.stepGoal) * 100)}% of Daily Goal`,
      statusColor: "#38BDF8",
      minRange: "3.2 KM",
      maxRange: "6.5 KM",
      sparklinePoints: [3.2, 4.1, 5.2, 4.4, 5.9, telemetry.distanceKm],
      recentReadings: [
        { time: "Today (Live)", value: `${telemetry.distanceKm} KM` },
        { time: "Yesterday", value: "5.9 KM" },
      ],
    },
    glucose: {
      id: "glucose",
      label: "Blood Glucose",
      currentValue: telemetry.glucoseMgDl !== null ? String(telemetry.glucoseMgDl) : "--",
      unit: "mg/dL",
      status: telemetry.glucoseMgDl !== null ? "Fasting Baseline" : "No reading today",
      statusColor: telemetry.glucoseMgDl !== null ? "#10B981" : colors.textMuted,
      minRange: "85 mg/dL",
      maxRange: "105 mg/dL",
      sparklinePoints: telemetry.glucoseMgDl !== null ? [96, 92, 98, 95, telemetry.glucoseMgDl] : [],
      recentReadings: telemetry.glucoseMgDl !== null
        ? [
            { time: "Clinical Baseline", value: `${telemetry.glucoseMgDl}` },
            { time: "Yesterday", value: "92" },
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

  const platformName = Platform.OS === "ios" ? "Apple Health" : "Health Connect";

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
            onRefresh={syncTelemetryNow}
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
                  borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#CBD5E1",
                },
              ]}
            >
              <View style={[styles.liveDot, { backgroundColor: syncPillColor }]} />
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
                  borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#CBD5E1",
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

        {/* ── Section 1: Single Apple Health Activity Ring Hero Card ───────── */}
        <AppleHealthSingleRing
          steps={telemetry.steps}
          distanceKm={telemetry.distanceKm}
          activeKcal={telemetry.activeKcal}
          kcalGoal={telemetry.kcalGoal}
        />

        {/* ── Section 2: Spacious 2-Column Apple Health Bento Metric Grid ─── */}
        <View style={styles.bentoGrid}>
          {/* Row 1: Resting HR & Blood Oxygen */}
          <View style={styles.bentoRow}>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="hr"
                label="Heart Rate"
                sublabel="Today"
                value={telemetry.restingHr !== null ? String(telemetry.restingHr) : "--"}
                unit="BPM"
                accentColor="#FA114F"
                valueColor="#FA114F"
                bars={[30, 45, 65, 72, 75, 71, 74, 72]}
                onPress={handleCardPress}
              />
            </View>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="spo2"
                label="Blood Oxygen"
                sublabel="Today"
                value={telemetry.spo2 !== null ? String(telemetry.spo2) : "--"}
                unit="%"
                accentColor="#0284C7"
                valueColor="#0284C7"
                bars={[92, 95, 98, 98, 97, 98, 99, 98]}
                onPress={handleCardPress}
              />
            </View>
          </View>

          {/* Row 2: Blood Pressure & Sleep */}
          <View style={styles.bentoRow}>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="bp"
                label="Blood Pressure"
                sublabel="Today"
                value={telemetry.bloodPressure || "--"}
                unit="mmHg"
                accentColor="#F59E0B"
                valueColor="#F59E0B"
                bars={[45, 65, 75, 70, 78, 72, 80, 75]}
                onPress={handleCardPress}
              />
            </View>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="sleep"
                label="Sleep"
                sublabel="Today"
                value={telemetry.sleepDuration || "--"}
                accentColor="#818CF8"
                valueColor="#818CF8"
                bars={[90, 85, 92, 70, 30, 10, 0, 15]}
                onPress={handleCardPress}
              />
            </View>
          </View>

          {/* Row 3: Step Distance & Blood Glucose */}
          <View style={styles.bentoRow}>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="steps"
                label="Step Distance"
                sublabel="Today"
                value={telemetry.distanceKm > 0 ? `${telemetry.distanceKm}` : "--"}
                unit="KM"
                accentColor="#38BDF8"
                valueColor="#38BDF8"
                bars={[20, 45, 60, 55, 75, 80, 85, 60]}
                onPress={handleCardPress}
              />
            </View>
            <View style={styles.cardCol}>
              <BentoMetricCard
                id="glucose"
                label="Blood Glucose"
                sublabel="Today"
                value={telemetry.glucoseMgDl !== null ? String(telemetry.glucoseMgDl) : "--"}
                unit="mg/dL"
                accentColor="#10B981"
                valueColor="#10B981"
                bars={[35, 55, 75, 65, 70, 85, 72, 60]}
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
