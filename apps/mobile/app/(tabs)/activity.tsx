import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Activity,
  Droplet,
  Flame,
  Footprints,
  HeartPulse,
  Moon,
  MoonStar,
  Sun,
  Watch,
} from "lucide-react-native";

import { getVitals } from "../../services/apiClient";
import { useAppTheme } from "../../constants/themeContext";
import { RADII } from "../../constants/theme";
import { AppleHealthRings } from "../../components/telemetry/AppleHealthRings";
import { BentoMetricCard } from "../../components/telemetry/BentoMetricCard";
import {
  MetricDetailData,
  MetricDetailSheet,
} from "../../components/telemetry/MetricDetailSheet";

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useAppTheme();

  const { data: vitals, isLoading } = useQuery({
    queryKey: ["vitals"],
    queryFn: getVitals,
  });

  const heartRate =
    vitals?.find((v) => v.code.text === "Heart Rate")?.valueQuantity.value ?? 72;

  // Selected metric for bottom sheet
  const [selectedMetric, setSelectedMetric] = useState<MetricDetailData | null>(
    null
  );

  const METRIC_DETAILS: Record<string, MetricDetailData> = {
    hr: {
      id: "hr",
      label: "Heart Rate",
      currentValue: String(heartRate),
      unit: "BPM",
      status: "Resting Optimal",
      statusColor: "#10B981",
      sparklinePoints: [68, 72, 70, 75, 73, 71, 72],
      recentReadings: [
        { time: "10 mins ago", value: String(heartRate) },
        { time: "1 hour ago", value: "74" },
        { time: "3 hours ago", value: "70" },
        { time: "Yesterday", value: "68" },
      ],
    },
    spo2: {
      id: "spo2",
      label: "Blood Oxygen",
      currentValue: "98",
      unit: "%",
      status: "Optimal",
      statusColor: "#10B981",
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
      currentValue: "118/76",
      unit: "mmHg",
      status: "Normal",
      statusColor: "#10B981",
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
      currentValue: "7h 24m",
      unit: "",
      status: "Restorative",
      statusColor: "#818CF8",
      sparklinePoints: [6.5, 7.2, 6.8, 7.5, 7.1, 7.4],
      recentReadings: [
        { time: "Last Night", value: "7h 24m" },
        { time: "Tue", value: "7h 08m" },
        { time: "Mon", value: "6h 52m" },
      ],
    },
    steps: {
      id: "steps",
      label: "Daily Steps",
      currentValue: "6,420",
      unit: "",
      status: "Active",
      statusColor: "#38BDF8",
      sparklinePoints: [4200, 5800, 7100, 6200, 8400, 6420],
      recentReadings: [
        { time: "Today (Live)", value: "6,420" },
        { time: "Yesterday", value: "8,400" },
        { time: "Sunday", value: "5,800" },
      ],
    },
    glucose: {
      id: "glucose",
      label: "Blood Glucose",
      currentValue: "94",
      unit: "mg/dL",
      status: "Fasting Normal",
      statusColor: "#10B981",
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
    <View style={[styles.rootContainer, { backgroundColor: theme.canvas }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: topPadding, paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Minimal Header (Greeting, Sync Pill, Theme Switcher) ─────────── */}
        <View style={styles.headerRow}>
          <View>
            <Text
              style={[
                styles.greetingText,
                { color: theme.textPrimary },
              ]}
            >
              Ahsan
            </Text>
            <Text
              style={[
                styles.dateSubText,
                { color: theme.textSecondary },
              ]}
            >
              Today
            </Text>
          </View>

          <View style={styles.headerRightRow}>
            {/* Sync Status Pill */}
            <View
              style={[
                styles.syncPill,
                {
                  backgroundColor: isDark ? "#12151C" : "#FFFFFF",
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.liveDot} />
              <Watch size={13} color="#10B981" />
              <Text
                style={[
                  styles.syncText,
                  { color: theme.textSecondary },
                ]}
              >
                Synced
              </Text>
            </View>

            {/* Theme Toggle Button */}
            <TouchableOpacity
              onPress={toggleTheme}
              activeOpacity={0.7}
              style={[
                styles.themeBtn,
                {
                  backgroundColor: isDark ? "#12151C" : "#FFFFFF",
                  borderColor: theme.border,
                },
              ]}
            >
              {isDark ? (
                <Sun size={15} color="#FBBF24" />
              ) : (
                <MoonStar size={15} color="#6366F1" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Screen B: Apple Health Concentric Rings Hero Cluster ─────────── */}
        <AppleHealthRings
          vitalsProgress={0.94}
          adherenceProgress={0.92}
          biomarkersProgress={0.9}
          vitalsLabel="94%"
          adherenceLabel="92%"
          biomarkersLabel="18/20"
        />

        {/* ── Screen B: 2-Column Bento Metric Grid (Strict 3-Element Rule) ─── */}
        <View style={styles.bentoGrid}>
          {/* Row 1: Heart Rate & Blood Oxygen */}
          <View style={styles.bentoRow}>
            <BentoMetricCard
              id="hr"
              icon={<HeartPulse size={20} color="#FF3B5C" />}
              statusDotColor="#10B981"
              value={String(heartRate)}
              unit="BPM"
              label="Resting HR"
              onPress={handleCardPress}
            />
            <BentoMetricCard
              id="spo2"
              icon={<Activity size={20} color="#3B82F6" />}
              statusDotColor="#10B981"
              value="98"
              unit="%"
              label="Blood Oxygen"
              onPress={handleCardPress}
            />
          </View>

          {/* Row 2: Blood Pressure & Sleep */}
          <View style={styles.bentoRow}>
            <BentoMetricCard
              id="bp"
              icon={<Flame size={20} color="#F59E0B" />}
              statusDotColor="#10B981"
              value="118/76"
              unit="mmHg"
              label="Blood Pressure"
              onPress={handleCardPress}
            />
            <BentoMetricCard
              id="sleep"
              icon={<Moon size={20} color="#818CF8" />}
              statusDotColor="#818CF8"
              value="7h 24m"
              label="Sleep"
              onPress={handleCardPress}
            />
          </View>

          {/* Row 3: Daily Steps & Blood Glucose */}
          <View style={styles.bentoRow}>
            <BentoMetricCard
              id="steps"
              icon={<Footprints size={20} color="#38BDF8" />}
              statusDotColor="#38BDF8"
              value="6,420"
              label="Daily Steps"
              onPress={handleCardPress}
            />
            <BentoMetricCard
              id="glucose"
              icon={<Droplet size={20} color="#10B981" />}
              statusDotColor="#10B981"
              value="94"
              unit="mg/dL"
              label="Blood Glucose"
              onPress={handleCardPress}
            />
          </View>
        </View>
      </ScrollView>

      {/* ── Interactive Longitudinal Trend Bottom Sheet ─────────────────────── */}
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
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
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
    borderRadius: RADII.pill,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
});
