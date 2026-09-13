import {
  Activity,
  ChevronRight,
  FileCode2,
  Fingerprint,
  LogOut,
  Shield,
  ShieldCheck,
  Clock,
  Watch,
} from "lucide-react-native";
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";

// ── Reusable Row Component ──────────────────────────────────────────────────
function SettingRow({
  icon,
  title,
  detail,
  control,
  onPress,
  destructive,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  control?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center border-b border-slate-100 py-4"
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
        {icon}
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm font-semibold ${
            destructive ? "text-red-600" : "text-slate-800"
          }`}
        >
          {title}
        </Text>
        <Text className="mt-1 text-xs text-slate-500">{detail}</Text>
      </View>
      {control ?? <ChevronRight size={18} color="#94A3B8" />}
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
  if (entry.status === "pending") {
    return (
      <View className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <View className="flex-row items-start gap-3">
          <Shield size={22} color="#F59E0B" />
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Pending Request
            </Text>
            <Text className="mt-1 font-bold text-slate-900">{entry.doctor}</Text>
            <Text className="mt-0.5 text-xs text-slate-600">
              {entry.specialty} · {entry.facility}
            </Text>
            <Text className="mt-2 text-sm text-slate-700">{entry.scope}</Text>
          </View>
        </View>
        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity
            onPress={onReject}
            className="flex-1 rounded-xl border border-slate-300 py-3"
          >
            <Text className="text-center text-sm font-semibold text-slate-700">
              Reject
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onApprove}
            className="flex-1 rounded-xl bg-sky-600 py-3"
          >
            <Text className="text-center text-sm font-semibold text-white">
              Approve
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-start gap-3 flex-1">
          <ShieldCheck size={22} color="#10B981" />
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Access Authorized
            </Text>
            <Text className="mt-1 font-bold text-slate-900">{entry.doctor}</Text>
            <Text className="mt-0.5 text-xs text-slate-600">
              {entry.specialty} · {entry.facility}
            </Text>
            <Text className="mt-2 text-sm text-slate-700">{entry.scope}</Text>
            {entry.expiresLabel && (
              <View className="mt-2 flex-row items-center gap-1.5">
                <Clock size={12} color="#6B7280" />
                <Text className="text-xs text-slate-500">{entry.expiresLabel}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={onRevoke}
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5"
        >
          <Text className="text-xs font-bold text-red-600">Revoke</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Settings Screen ────────────────────────────────────────────────────
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [healthConnected, setHealthConnected] = useState(true);

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

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{
        padding: 20,
        paddingTop: Math.max(insets.top, 16) + 8,
        paddingBottom: Math.max(insets.bottom, 16) + 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Page Header ─────────────────────────────────── */}
      <Text className="text-3xl font-bold text-slate-900">Settings</Text>
      <Text className="mt-1 text-sm text-slate-500">
        Your identity, devices, and privacy controls
      </Text>

      {/* ── Profile Card ─────────────────────────────────── */}
      <View className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-row items-center">
          <View className="mr-4 h-16 w-16 items-center justify-center rounded-full bg-sky-100">
            <Text className="text-xl font-bold text-sky-700">MA</Text>
          </View>
          <View>
            <Text className="text-lg font-bold text-slate-900">
              Muhammad Ahsan
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              SK-8921-X · Blood type O+
            </Text>
          </View>
        </View>
        <TouchableOpacity className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
          <Text className="text-center text-sm font-semibold text-slate-700">
            Edit Personal Information
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Connections ──────────────────────────────────── */}
      <Text className="mb-2 mt-7 text-xs font-bold uppercase tracking-wider text-slate-400">
        Connections
      </Text>
      <View className="rounded-2xl border border-slate-200 bg-white px-4">
        <SettingRow
          icon={<Activity size={19} color="#10B981" />}
          title="Apple Health / Health Connect"
          detail="Connected"
          control={
            <Switch
              value={healthConnected}
              onValueChange={setHealthConnected}
              trackColor={{ true: "#86EFAC" }}
              thumbColor="#10B981"
            />
          }
        />
        <SettingRow
          icon={<Watch size={19} color="#0284C7" />}
          title="Bluetooth Smart Bands"
          detail="Fitbit Charge 6 paired"
        />
      </View>

      {/* ── Clinical Access & Approvals ───────────────────── */}
      <Text className="mb-3 mt-7 text-xs font-bold uppercase tracking-wider text-slate-400">
        Clinical Access & Approvals
      </Text>

      {consents.length === 0 ? (
        <View className="rounded-2xl border border-slate-200 bg-white p-5 items-center">
          <ShieldCheck size={28} color="#CBD5E1" />
          <Text className="mt-2 text-sm text-slate-400 text-center">
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

      {/* ── Security & Privacy ───────────────────────────── */}
      <Text className="mb-2 mt-7 text-xs font-bold uppercase tracking-wider text-slate-400">
        Security & Privacy
      </Text>
      <View className="rounded-2xl border border-slate-200 bg-white px-4">
        <SettingRow
          icon={<Fingerprint size={19} color="#475569" />}
          title="Require biometrics on launch"
          detail="Protect your health records"
          control={
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
            />
          }
        />
        <SettingRow
          icon={<FileCode2 size={19} color="#475569" />}
          title="Export HL7 Health Record"
          detail="Standardized HL7 FHIR R4 JSON format compatible with hospital EHR systems"
          onPress={() =>
            Alert.alert(
              "HL7 FHIR Export",
              "Preparing your complete health record as an HL7 FHIR R4 JSON bundle.",
              [{ text: "Cancel" }, { text: "Export & Share" }]
            )
          }
        />
      </View>

      {/* ── Log Out ──────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() =>
          Alert.alert(
            "Log out",
            "Local mock data will be safely cached.",
            [{ text: "Cancel" }, { text: "Log Out", style: "destructive" }]
          )
        }
        className="mt-8 flex-row items-center justify-center gap-2 rounded-xl bg-slate-100 py-4"
      >
        <LogOut size={18} color="#EF4444" />
        <Text className="font-semibold text-red-500">Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
