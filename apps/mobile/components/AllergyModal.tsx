import { Check, X } from "lucide-react-native";
import { forwardRef, useImperativeHandle, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

export type Allergy = {
  allergen: string;
  reaction: string;
  severity: "Mild" | "Moderate" | "Severe";
};

type Props = {
  onSave: (allergy: Allergy) => void;
};

export interface AllergyModalHandle {
  snapToIndex: (index: number) => void;
  close: () => void;
}

const AUTOCOMPLETE_CHIPS = [
  "Penicillin",
  "Sulfa Drugs",
  "Aspirin",
  "Peanuts",
  "Latex",
  "Shellfish",
];

const SEVERITY_CONFIG: {
  label: Allergy["severity"];
  color: string;
  dot: string;
}[] = [
  { label: "Mild", color: "#F59E0B", dot: "#F59E0B" },
  { label: "Moderate", color: "#FB923C", dot: "#FB923C" },
  { label: "Severe", color: "#EF4444", dot: "#EF4444" },
];

export const AllergyModal = forwardRef<AllergyModalHandle, Props>(
  ({ onSave }, ref) => {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    const [visible, setVisible] = useState(false);
    const [allergen, setAllergen] = useState("");
    const [reaction, setReaction] = useState("");
    const [severity, setSeverity] = useState<Allergy["severity"]>("Mild");

    useImperativeHandle(ref, () => ({
      snapToIndex: () => setVisible(true),
      close: () => setVisible(false),
    }));

    const reset = () => {
      setAllergen("");
      setReaction("");
      setSeverity("Mild");
    };

    const handleClose = () => {
      reset();
      setVisible(false);
    };

    const handleSave = () => {
      if (!allergen.trim()) return;
      onSave({
        allergen: allergen.trim(),
        reaction: reaction.trim(),
        severity,
      });
      handleClose();
    };

    if (!visible) return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    paddingBottom: Math.max(insets.bottom, 20),
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.headerRow}>
                  <View>
                    <Text
                      style={[
                        styles.headerTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Add Allergy
                    </Text>
                    <Text
                      style={[
                        styles.headerSub,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Record allergen and reaction severity.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleClose}
                    activeOpacity={0.7}
                    style={[
                      styles.closeBtn,
                      {
                        backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                      },
                    ]}
                  >
                    <X size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Allergen Input */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Allergen Name
                  </Text>
                  <TextInput
                    value={allergen}
                    onChangeText={setAllergen}
                    placeholder="e.g. Penicillin, Sulfa"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDark ? "#0D1117" : "#F8FAFC",
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                  />

                  {/* Chips */}
                  <View style={styles.chipRow}>
                    {AUTOCOMPLETE_CHIPS.map((chip) => (
                      <TouchableOpacity
                        key={chip}
                        onPress={() => setAllergen(chip)}
                        activeOpacity={0.7}
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              allergen === chip
                                ? isDark
                                  ? "rgba(56, 189, 248, 0.2)"
                                  : "#E0F2FE"
                                : isDark
                                ? "#141822"
                                : "#F1F5F9",
                            borderColor:
                              allergen === chip
                                ? colors.tabBarActive
                                : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color:
                                allergen === chip
                                  ? colors.tabBarActive
                                  : colors.textSecondary,
                            },
                          ]}
                        >
                          {chip}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Reaction Input */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Reaction
                  </Text>
                  <TextInput
                    value={reaction}
                    onChangeText={setReaction}
                    placeholder="e.g. Skin rash, Anaphylaxis"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDark ? "#0D1117" : "#F8FAFC",
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                  />
                </View>

                {/* Severity Selector */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Severity
                  </Text>
                  <View style={styles.severityRow}>
                    {SEVERITY_CONFIG.map((s) => (
                      <TouchableOpacity
                        key={s.label}
                        onPress={() => setSeverity(s.label)}
                        activeOpacity={0.7}
                        style={[
                          styles.severityBtn,
                          {
                            backgroundColor:
                              severity === s.label
                                ? `${s.color}22`
                                : isDark
                                ? "#141822"
                                : "#F1F5F9",
                            borderColor:
                              severity === s.label ? s.color : colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.severityDot,
                            { backgroundColor: s.dot },
                          ]}
                        />
                        <Text
                          style={[
                            styles.severityText,
                            {
                              color:
                                severity === s.label
                                  ? s.color
                                  : colors.textSecondary,
                              fontWeight:
                                severity === s.label ? "700" : "500",
                            },
                          ]}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                  onPress={handleSave}
                  activeOpacity={0.8}
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: colors.tabBarActive,
                    },
                  ]}
                >
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Allergy</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  severityRow: {
    flexDirection: "row",
    gap: 10,
  },
  severityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  severityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 12,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
