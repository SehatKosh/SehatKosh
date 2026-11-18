import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../constants/themeContext";
import { RADII } from "../../constants/theme";

export interface BentoMetricCardProps {
  id: string;
  icon: React.ReactNode;
  statusDotColor?: string; // e.g. "#10B981"
  value: string;
  unit?: string;
  label: string;
  onPress: (id: string) => void;
}

export function BentoMetricCard({
  id,
  icon,
  statusDotColor = "#10B981",
  value,
  unit,
  label,
  onPress,
}: BentoMetricCardProps) {
  const { theme, isDark } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value} ${unit || ""}`}
      onPress={() => onPress(id)}
      style={({ pressed }) => [
        styles.cardContainer,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      {/* ── Element 1: Top-Left Icon + Status Dot ───────────────────────── */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isDark ? "#1C212C" : "#F1F5F9",
            },
          ]}
        >
          {icon}
        </View>

        {statusDotColor && (
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusDotColor },
            ]}
          />
        )}
      </View>

      {/* ── Element 2: Large Bold Metric Value (26px, Tabular Nums) ─────── */}
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.valueText,
            { color: theme.textPrimary },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {unit && (
          <Text
            style={[
              styles.unitText,
              { color: theme.textSecondary },
            ]}
          >
            {unit}
          </Text>
        )}
      </View>

      {/* ── Element 3: Bottom Single/Two-Word Label ─────────────────────── */}
      <Text
        style={[
          styles.labelText,
          { color: theme.textSecondary },
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
    minHeight: 140,
    borderRadius: RADII.card,
    borderWidth: 1,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginVertical: 4,
  },
  valueText: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  unitText: {
    fontSize: 12,
    fontWeight: "500",
  },
  labelText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
});
