import {
  Activity,
  ChevronRight,
  Clock,
  FileCode2,
  Fingerprint,
  LogOut,
  MoonStar,
  Shield,
  ShieldCheck,
  Sun,
  Watch,
} from "lucide-react-native";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { usePatient } from "../../context/PatientContext";

// ── Reusable Row Component ──────────────────────────────────────────────────
function SettingRow({
  icon,
  title,
  detail,
  control,
  onPress,
  destructive,
  isLast,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  control?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  isLast?: boolean;
}) {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.settingRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#F1F5F9",
          },
        ]}
      >
        {icon}
      </View>
      <View style={styles.settingTextContainer}>
        <Text
          style={[
            styles.settingTitle,
            { color: destructive ? "#EF4444" : colors.textPrimary },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.settingDetail,
            { color: colors.textSecondary },
          ]}
        >
          {detail}
        </Text>
      </View>
      {control ?? <ChevronRight size={18} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

// ── Consent Card ────────────────────────────────────────────────────────────
type ConsentStatus = "pending" | "approved";

type ConsentEntry = {
  id: string;
  doctor: string;
  specialty: string;
  facility: string;
  scope: string;
  status: ConsentStatus;
  expiresLabel?: string;
};

function ConsentCard({
  entry,
  onApprove,
  onRevoke,
  onReject,
}: {
  entry: ConsentEntry;
  onApprove?: () => void;
  onRevoke?: () => void;
  onReject?: () => void;
}) {
  const { colors, isDark } = useTheme();

  if (entry.status === "pending") {
    return (
      <View
        style={[
          styles.consentCard,
          {
            backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "#FFFBEB",
            borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A",
          },
        ]}
      >
        <View style={styles.consentHeader}>
          <Shield size={22} color="#F59E0B" />
          <View style={styles.consentMeta}>
            <Text style={styles.pendingBadgeText}>Pending Request</Text>
            <Text
              style={[
                styles.doctorName,
                { color: colors.textPrimary },
              ]}
            >
              {entry.doctor}
            </Text>
            <Text
              style={[
                styles.facilityText,
                { color: colors.textSecondary },
              ]}
            >
              {entry.specialty} · {entry.facility}
            </Text>
            <Text
              style={[
                styles.scopeText,
                { color: colors.textPrimary },
              ]}
            >
              {entry.scope}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={onReject}
            activeOpacity={0.7}
            style={[
              styles.actionBtn,
              {
                backgroundColor: isDark ? "#141822" : "#FFFFFF",
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.actionBtnText,
                { color: colors.textSecondary },
              ]}
            >
              Reject
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onApprove}
            activeOpacity={0.7}
            style={[styles.actionBtn, styles.approveBtn]}
          >
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.consentCard,
        {
          backgroundColor: isDark ? "rgba(16, 185, 129, 0.12)" : "#ECFDF5",
          borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
        },
      ]}
    >
      <View style={styles.approvedHeader}>
        <View style={styles.approvedLeft}>
          <ShieldCheck size={22} color="#10B981" />
          <View style={styles.consentMeta}>
            <Text style={styles.approvedBadgeText}>Access Authorized</Text>
            <Text
              style={[
                styles.doctorName,
                { color: colors.textPrimary },
              ]}
            >
              {entry.doctor}
            </Text>
            <Text
              style={[
                styles.facilityText,
                { color: colors.textSecondary },
              ]}
            >
              {entry.specialty} · {entry.facility}
            </Text>
            <Text
              style={[
                styles.scopeText,
                { color: colors.textPrimary },
              ]}
            >
              {entry.scope}
            </Text>
            {entry.expiresLabel && (
              <View style={styles.expiryRow}>
                <Clock size={12} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.expiryText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {entry.expiresLabel}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={onRevoke}
          activeOpacity={0.7}
          style={[
            styles.revokeBtn,
            {
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2",
              borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "#FECDD3",
            },
          ]}
        >
          <Text style={styles.revokeBtnText}>Revoke</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Settings Screen ────────────────────────────────────────────────────
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { patient, isHealthConnected, connectHealth, disconnectHealth } = usePatient();

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  const [consents, setConsents] = useState<ConsentEntry[]>([
    {
      id: "c1",
      doctor: "Dr. Ayesha Malik",
      specialty: "Cardiology",
      facility: "PIMS Hospital",
      scope: "Full History · 24 Hours Access",
      status: "pending",
    },
    {
      id: "c2",
      doctor: "Dr. Tariq Khan",
      specialty: "Cardiology",
      facility: "Shifa International",
      scope: "Full History · Read-only",
      status: "approved",
      expiresLabel: "Expires in 3h 15m",
    },
  ]);

  const handleApprove = (id: string) =>
    setConsents((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: "approved", expiresLabel: "Expires in 24h 00m" }
          : c
      )
    );

  const handleReject = (id: string) =>
    setConsents((prev) => prev.filter((c) => c.id !== id));

  const handleRevoke = (id: string) => {
    Alert.alert(
      "Revoke Access",
      "This doctor will immediately lose access to your records.",
      [
        { text: "Cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () => setConsents((prev) => prev.filter((c) => c.id !== id)),
        },
      ]
    );
  };

  const topPadding = Math.max(insets.top, 16) + 4;

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.canvas }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: topPadding,
            paddingBottom: 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header: Strict Theme Toggle (Location 2 of 2) ─────────── */}
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.screenTitle,
              { color: colors.textPrimary },
            ]}
          >
            Settings
          </Text>

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
              <Sun size={17} color="#FBBF24" />
            ) : (
              <MoonStar size={17} color="#6366F1" />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Synchronized Patient Profile Card ─────────────────────────── */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.profileHeader}>
            <View
              style={[
                styles.avatarContainer,
                {
                  backgroundColor: isDark
                    ? "rgba(14, 165, 233, 0.2)"
                    : "#E0F2FE",
                },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  { color: isDark ? "#38BDF8" : "#0284C7" },
                ]}
              >
                {patient.initials}
              </Text>
            </View>
            <View style={styles.profileMeta}>
              <Text
                style={[
                  styles.profileName,
                  { color: colors.textPrimary },
                ]}
              >
                {patient.fullName}
              </Text>
              <Text
                style={[
                  styles.profileSub,
                  { color: colors.textSecondary },
                ]}
              >
                {patient.uhid} · Blood type {patient.bloodGroup}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.editProfileBtn,
              {
                backgroundColor: isDark ? "#1E2536" : "#F8FAFC",
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.editProfileText,
                { color: colors.textPrimary },
              ]}
            >
              Edit Personal Information
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Section: Connections ──────────────────────────────────────── */}
        <Text
          style={[
            styles.sectionHeading,
            { color: colors.textSecondary },
          ]}
        >
          Connections
        </Text>
        <View
          style={[
            styles.cardGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <SettingRow
            icon={<Activity size={19} color="#10B981" />}
            title="Apple Health / Health Connect"
            detail={isHealthConnected ? "Connected" : "Not Connected"}
            control={
              <Switch
                value={isHealthConnected}
                onValueChange={async (val) => {
                  if (val) {
                    await connectHealth();
                  } else {
                    await disconnectHealth();
                  }
                }}
                trackColor={{ false: "#64748B", true: "#86EFAC" }}
                thumbColor={isHealthConnected ? "#10B981" : "#F1F5F9"}
              />
            }
          />
          <SettingRow
            icon={<Watch size={19} color="#0284C7" />}
            title="Bluetooth Smart Bands"
            detail="Fitbit Charge 6 paired"
            isLast
          />
        </View>

        {/* ── Section: Clinical Access & Approvals ──────────────────────── */}
        <Text
          style={[
            styles.sectionHeading,
            { color: colors.textSecondary },
          ]}
        >
          Clinical Access & Approvals
        </Text>

        {consents.length === 0 ? (
          <View
            style={[
              styles.emptyConsentCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ShieldCheck size={28} color={colors.textMuted} />
            <Text
              style={[
                styles.emptyConsentText,
                { color: colors.textSecondary },
              ]}
            >
              No pending requests or active approvals.
            </Text>
          </View>
        ) : (
          consents.map((entry) => (
            <ConsentCard
              key={entry.id}
              entry={entry}
              onApprove={() => handleApprove(entry.id)}
              onReject={() => handleReject(entry.id)}
              onRevoke={() => handleRevoke(entry.id)}
            />
          ))
        )}

        {/* ── Section: Security & Privacy ──────────────────────────────── */}
        <Text
          style={[
            styles.sectionHeading,
            { color: colors.textSecondary },
          ]}
        >
          Security & Privacy
        </Text>
        <View
          style={[
            styles.cardGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <SettingRow
            icon={<Fingerprint size={19} color={colors.textSecondary} />}
            title="Require biometrics on launch"
            detail="Protect your health records"
            control={
              <Switch
                value={biometricsEnabled}
                onValueChange={setBiometricsEnabled}
                trackColor={{ false: "#64748B", true: "#86EFAC" }}
                thumbColor={biometricsEnabled ? "#10B981" : "#F1F5F9"}
              />
            }
          />
          <SettingRow
            icon={<FileCode2 size={19} color={colors.textSecondary} />}
            title="Export HL7 Health Record"
            detail="Standardized HL7 FHIR R4 JSON format compatible with hospital EHR systems"
            isLast
            onPress={() =>
              Alert.alert(
                "HL7 FHIR Export",
                "Preparing your complete health record as an HL7 FHIR R4 JSON bundle.",
                [{ text: "Cancel" }, { text: "Export & Share" }]
              )
            }
          />
        </View>

        {/* ── Log Out Button ────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Log out",
              "Local health data will be safely cached.",
              [{ text: "Cancel" }, { text: "Log Out", style: "destructive" }]
            )
          }
          activeOpacity={0.7}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: isDark
                ? "rgba(239, 68, 68, 0.12)"
                : "#FEF2F2",
              borderColor: isDark
                ? "rgba(239, 68, 68, 0.25)"
                : "#FECDD3",
            },
          ]}
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 8,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  profileSub: {
    fontSize: 13,
    marginTop: 2,
  },
  editProfileBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
  },
  cardGroup: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  settingDetail: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  consentCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  consentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  consentMeta: {
    flex: 1,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#D97706",
  },
  approvedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#059669",
  },
  doctorName: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  facilityText: {
    fontSize: 12,
    marginTop: 1,
  },
  scopeText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 6,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  expiryText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  approveBtn: {
    backgroundColor: "#0284C7",
    borderColor: "#0284C7",
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  approvedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  approvedLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  revokeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  revokeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
  },
  emptyConsentCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyConsentText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 28,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
});
