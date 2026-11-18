import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";

export interface BentoMetricCardProps {
  id: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  value: string;
  unit?: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  bars?: number[]; // e.g. [20, 45, 70, 30, 85, 60] mini hourly bars
  onPress: (id: string) => void;
}

export function BentoMetricCard({
  id,
  icon,
  iconBgColor,
  value,
  unit,
  label,
  sublabel = "Today",
  badge,
  badgeColor,
  bars,
  onPress,
}: BentoMetricCardProps) {
  const { colors, isDark } = useTheme();

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
      {/* ── Top Row: Icon + Mini Chevron Circle ──────────────────────────── */}
      <View style={styles.topRow}>
        <View style={styles.topLeftGroup}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor:
                  iconBgColor ||
                  (isDark ? "#1C2230" : "#F1F5F9"),
              },
            ]}
          >
            {icon}
          </View>
          <Text
            style={[
              styles.sublabelText,
              { color: colors.textSecondary },
            ]}
          >
            {sublabel}
          </Text>
        </View>

        <View
          style={[
            styles.chevronCircle,
            {
              backgroundColor: isDark ? "#1C2230" : "#F1F5F9",
            },
          ]}
        >
          <ChevronRight size={12} color={colors.textSecondary} />
        </View>
      </View>

      {/* ── Value Row: Bold 26px Metric + Unit ───────────────────────────── */}
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.valueText,
            { color: colors.textPrimary },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {unit ? (
          <Text
            style={[
              styles.unitText,
              { color: colors.textSecondary },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>

      {/* ── Mini Hourly Bar Chart or Status Badge ────────────────────────── */}
      {bars && bars.length > 0 ? (
        <View style={styles.miniBarContainer}>
          {bars.map((h, i) => (
            <View
              key={i}
              style={[
                styles.miniBarTrack,
                {
                  backgroundColor: isDark ? "#1E2536" : "#E2E8F0",
                },
              ]}
            >
              <View
                style={[
                  styles.miniBarFill,
                  {
                    height: `${Math.min(Math.max(h, 15), 100)}%`,
                    backgroundColor: colors.tabBarActive,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      ) : badge ? (
        <View
          style={[
            styles.badgePill,
            {
              backgroundColor: badgeColor
                ? `${badgeColor}20`
                : "rgba(16, 185, 129, 0.15)",
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: badgeColor || "#10B981" },
            ]}
          >
            {badge}
          </Text>
        </View>
      ) : null}

      {/* ── Bottom Label: Single/Two-Word Title ──────────────────────────── */}
      <Text
        style={[
          styles.labelText,
          { color: colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    minHeight: 154,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sublabelText: {
    fontSize: 11,
    fontWeight: "500",
  },
  chevronCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  unitText: {
    fontSize: 12,
    fontWeight: "600",
  },
  miniBarContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 20,
    marginVertical: 4,
  },
  miniBarTrack: {
    flex: 1,
    height: 20,
    borderRadius: 3,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  miniBarFill: {
    width: "100%",
    borderRadius: 3,
  },
  badgePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    marginVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  labelText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
