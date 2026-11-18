import { router } from "expo-router";
import { Check, Edit2, X } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

const SECTIONS = [
  ["Subjective", "Persistent cough and fatigue for five days."],
  ["Objective", "BP 118/76 · Pulse 72 BPM · Weight 70 kg"],
  ["Assessment", "Acute respiratory symptoms · provisional review"],
  ["Plan", "Azithromycin 500mg once daily for 5 days with hydration."],
];

export default function SessionPreviewScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [raw, setRaw] = useState(false);
  const topPadding = Math.max(insets.top, 16) + 8;

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas }]}>
      <View style={[styles.navRow, { paddingTop: topPadding }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.navBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <X color={colors.textPrimary} size={20} />
        </TouchableOpacity>
        <Text style={[styles.navStep, { color: colors.textSecondary }]}>
          Step 2 of 2 · Review
        </Text>
        <View style={styles.navBtnPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Clinical summary
        </Text>

        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setRaw(false)}
            style={[
              styles.tabBtn,
              !raw && [
                styles.tabBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: !raw ? colors.textPrimary : colors.textSecondary,
                  fontWeight: !raw ? "700" : "500",
                },
              ]}
            >
              Clinical Summary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRaw(true)}
            style={[
              styles.tabBtn,
              raw && [
                styles.tabBtnActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: raw ? colors.textPrimary : colors.textSecondary,
                  fontWeight: raw ? "700" : "500",
                },
              ]}
            >
              Original Notes
            </Text>
          </TouchableOpacity>
        </View>

        {raw ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.rawText,
                { color: colors.textPrimary },
              ]}
            >
              Patient described persistent cough and fatigue. Doctor reviewed
              vitals and recommended short antibiotic course with hydration.
            </Text>
          </View>
        ) : (
          SECTIONS.map(([heading, body]) => (
            <View
              key={heading}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {heading}
                </Text>
                <Edit2 color="#0284C7" size={17} />
              </View>
              <Text
                style={[
                  styles.cardBody,
                  { color: colors.textSecondary },
                ]}
              >
                {body}
              </Text>
            </View>
          ))
        )}

        <TouchableOpacity
          onPress={() =>
            Alert.alert("Discard draft", "This consultation will not be saved.")
          }
          style={[
            styles.discardBtn,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.discardText,
              { color: colors.textSecondary },
            ]}
          >
            Discard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Alert.alert("Saved", "The consultation was added to your records.");
            router.replace("/(tabs)/records");
          }}
          style={styles.saveBtn}
        >
          <Check color="#FFFFFF" size={18} />
          <Text style={styles.saveText}>Save to My Records</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  navBtnPlaceholder: {
    width: 44,
  },
  navStep: {
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  rawText: {
    fontSize: 14,
    lineHeight: 22,
  },
  discardBtn: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  discardText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#0284C7",
    paddingVertical: 15,
    gap: 8,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
