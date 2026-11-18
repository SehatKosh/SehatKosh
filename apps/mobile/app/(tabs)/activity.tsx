import React, { useState } from "react";
import {
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

const HORIZONTAL_PADDING = 16;

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { patient, telemetry } = usePatient();

  const [selectedMetric, setSelectedMetric] = useState<MetricDetailData | null>(
    null
  );

  const METRIC_DETAILS: Record<string, MetricDetailData> = {
    hr: {
      id: "hr",
      label: "Heart Rate",
      currentValue: String(telemetry.restingHr),
      unit: "BPM",
      status: "Resting Optimal",
      statusColor: "#10B981",
      minRange: "58 BPM",
      maxRange: "96 BPM",
      sparklinePoints: [68, 72, 70, 75, 73, 71, 72],
      recentReadings: [
        { time: "10 mins ago", value: "72" },
        { time: "1 hour ago", value: "74" },
        { time: "3 hours ago", value: "70" },
        { time: "Yesterday", value: "68" },
      ],
    },
    spo2: {
      id: "spo2",
      label: "Blood Oxygen",
      currentValue: String(telemetry.spo2),
      unit: "%",
      status: "Optimal",
      statusColor: "#10B981",
      minRange: "96%",
      maxRange: "99%",
      sparklinePoints: [97, 98, 98, 99, 98, 98, 98],
      recentReadings: [
        { time: "15 mins ago", value: "98" },
        { time: "2 hours ago", value: "99" },
        { time: "Yesterday", value: "98" },
      ],
    },
    bp: {
      id: "bp",
      label: "Blood Pressure",
      currentValue: telemetry.bloodPressure,
      unit: "mmHg",
      status: "Controlled (Atenolol 50mg)",
      statusColor: "#10B981",
      minRange: "114/72 mmHg",
      maxRange: "128/82 mmHg",
      sparklinePoints: [116, 120, 118, 117, 119, 118],
      recentReadings: [
        { time: "Morning (08:30)", value: "118/76" },
        { time: "Yesterday", value: "116/74" },
        { time: "3 days ago", value: "120/78" },
      ],
    },
    sleep: {
      id: "sleep",
      label: "Sleep",
      currentValue: telemetry.sleepDuration,
      unit: "",
      status: "Restorative Stage",
      statusColor: "#818CF8",
      minRange: "6h 20m",
      maxRange: "8h 10m",
      sparklinePoints: [6.5, 7.2, 6.8, 7.5, 7.1, 7.4],
      recentReadings: [
        { time: "Last Night", value: "7h 24m" },
        { time: "Tue", value: "7h 08m" },
        { time: "Mon", value: "6h 52m" },
      ],
    },
    steps: {
      id: "steps",
      label: "Step Distance",
      currentValue: `${telemetry.distanceKm}`,
      unit: "KM",
      status: "80% of Goal",
      statusColor: "#38BDF8",
      minRange: "3.2 KM",
      maxRange: "6.5 KM",
      sparklinePoints: [3.2, 4.1, 5.2, 4.4, 5.9, 4.8],
      recentReadings: [
        { time: "Today (Live)", value: "4.8" },
        { time: "Yesterday", value: "5.9" },
        { time: "Sunday", value: "4.1" },
      ],
    },
    glucose: {
      id: "glucose",
      label: "Blood Glucose",
      currentValue: String(telemetry.glucoseMgDl),
      unit: "mg/dL",
      status: "Fasting Baseline",
      statusColor: "#10B981",
      minRange: "85 mg/dL",
      maxRange: "105 mg/dL",
      sparklinePoints: [96, 92, 98, 95, 94],
      recentReadings: [
        { time: "Fasting (07:45)", value: "94" },
        { time: "Post-prandial", value: "118" },
        { time: "Yesterday", value: "92" },
      ],
    },
  };

  const handleCardPress = (id: string) => {
    if (METRIC_DETAILS[id]) {
      setSelectedMetric(METRIC_DETAILS[id]);
    }
  };

  const topPadding = Math.max(insets.top, 16);

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.canvas }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: topPadding, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
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
            {/* Sync Pill */}
            <View
              style={[
                styles.syncPill,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.liveDot} />
              <Watch size={13} color="#10B981" />
              <Text
                style={[
                  styles.syncText,
                  { color: colors.textSecondary },
                ]}
              >
                Synced
              </Text>
            </View>

            {/* Strict Theme Toggle (Location 1 of 2) */}
            <TouchableOpacity
              accessibilityLabel="Toggle Theme"
              onPress={toggleTheme}
              activeOpacity={0.7}
              style={[
                styles.themeBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
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

        {/* ── Section 2: Interactive 2-Column Bento Metric Grid ────────────── */}
        <View style={styles.bentoGrid}>
          {/* Row 1: Resting HR & Blood Oxygen */}
          <View style={styles.bentoRow}>
            <View style={styles.cardColLeft}>
              <BentoMetricCard
                id="hr"
                label="Resting HR"
                sublabel="Today"
                value={String(telemetry.restingHr)}
                unit="BPM"
                accentColor="#FA114F"
                valueColor="#FA114F"
                bars={[18, 15, 12, 10, 10, 15, 30, 50, 72, 68, 75, 72, 80, 76, 74, 82]}
                onPress={handleCardPress}
              />
            </View>
            <View style={styles.cardColRight}>
              <BentoMetricCard
                id="spo2"
                label="Blood Oxygen"
                sublabel="Today"
                value={String(telemetry.spo2)}
                unit="%"
                accentColor="#38BDF8"
                valueColor="#38BDF8"
                bars={[88, 90, 89, 90, 92, 95, 98, 98, 97, 98, 98, 99, 98, 98, 98, 99]}
                onPress={handleCardPress}
              />
            </View>
          </View>

          {/* Row 2: Blood Pressure & Sleep */}
          <View style={styles.bentoRow}>
            <View style={styles.cardColLeft}>
              <BentoMetricCard
                id="bp"
                label="Blood Pressure"
                sublabel="Today"
                value={telemetry.bloodPressure}
                unit="mmHg"
                accentColor="#F59E0B"
                valueColor="#F59E0B"
                bars={[30, 28, 25, 22, 20, 24, 45, 65, 75, 70, 78, 72, 80, 76, 72, 75]}
                onPress={handleCardPress}
              />
            </View>
            <View style={styles.cardColRight}>
              <BentoMetricCard
                id="sleep"
                label="Sleep"
                sublabel="Today"
                value={telemetry.sleepDuration}
                accentColor="#818CF8"
                valueColor="#818CF8"
                bars={[95, 95, 90, 85, 92, 88, 70, 30, 10, 5, 0, 0, 0, 0, 15, 60]}
                onPress={handleCardPress}
              />
            </View>
          </View>

          {/* Row 3: Step Distance & Blood Glucose */}
          <View style={styles.bentoRow}>
            <View style={styles.cardColLeft}>
              <BentoMetricCard
                id="steps"
                label="Step Distance"
                sublabel="Today"
                value={`${telemetry.distanceKm}`}
                unit="KM"
                accentColor="#0284C7"
                valueColor="#0284C7"
                bars={[0, 0, 0, 5, 20, 45, 60, 55, 75, 80, 85, 70, 65, 90, 85, 60]}
                onPress={handleCardPress}
              />
            </View>
            <View style={styles.cardColRight}>
              <BentoMetricCard
                id="glucose"
                label="Blood Glucose"
                sublabel="Today"
                value={String(telemetry.glucoseMgDl)}
                unit="mg/dL"
                accentColor="#10B981"
                valueColor="#10B981"
                bars={[40, 38, 35, 32, 30, 35, 55, 75, 65, 58, 70, 85, 72, 60, 55, 68]}
                onPress={handleCardPress}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Interactive Detail Bottom Sheet Modal ─────────────────────────────── */}
      <MetricDetailSheet
        data={selectedMetric}
        onClose={() => setSelectedMetric(null)}
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
    backgroundColor: "#10B981",
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
  },
  cardColLeft: {
    flex: 1,
    marginRight: 6,
  },
  cardColRight: {
    flex: 1,
    marginLeft: 6,
  },
});
