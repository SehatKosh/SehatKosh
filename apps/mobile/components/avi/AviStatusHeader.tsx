import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Server,
  Settings,
  WifiOff,
  X,
} from "lucide-react-native";
import {
  AviHealthResponse,
  AviHealthStatus,
  checkAviHealth,
  getAviBaseUrl,
  getDefaultAviBaseUrl,
  resetAviBaseUrl,
  setAviBaseUrl,
} from "../../services/aviClient";

interface AviStatusHeaderProps {
  health: AviHealthResponse;
  onRefreshHealth: () => void;
  isChecking?: boolean;
}

export function AviStatusHeader({
  health,
  onRefreshHealth,
  isChecking = false,
}: AviStatusHeaderProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AviHealthResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const openConfigModal = async () => {
    const currentUrl = await getAviBaseUrl();
    setInputUrl(currentUrl);
    setTestResult(null);
    setModalVisible(true);
  };

  const handleTestConnection = async () => {
    if (!inputUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await checkAviHealth(inputUrl.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        status: "unreachable",
        message: err.message || "Failed to reach server.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!inputUrl.trim()) return;
    setSaving(true);
    try {
      await setAviBaseUrl(inputUrl);
      setModalVisible(false);
      onRefreshHealth();
    } catch (err) {
      console.error("[AviStatusHeader] Failed to save URL:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    setSaving(true);
    try {
      const defUrl = await resetAviBaseUrl();
      setInputUrl(defUrl);
      setModalVisible(false);
      onRefreshHealth();
    } catch (err) {
      console.error("[AviStatusHeader] Failed to reset URL:", err);
    } finally {
      setSaving(false);
    }
  };

  const getPillStyle = (status: AviHealthStatus) => {
    switch (status) {
      case "ready":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-emerald-700",
          dot: "bg-emerald-500",
          label: "Avi Ready (MedGemma 1.5 4B)",
        };
      case "loading":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-800",
          dot: "bg-amber-500",
          label: "Warming GPU... (~30s)",
        };
      case "unavailable":
        return {
          bg: "bg-orange-50",
          border: "border-orange-200",
          text: "text-orange-800",
          dot: "bg-orange-500",
          label: "GPU Busy / Unavailable",
        };
      case "unreachable":
      default:
        return {
          bg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-700",
          dot: "bg-rose-500",
          label: "Lab Server Offline",
        };
    }
  };

  const pill = getPillStyle(health.status);

  return (
    <>
      <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        {/* Status Pill (Clickable to open endpoint modal) */}
        <TouchableOpacity
          onPress={openConfigModal}
          activeOpacity={0.7}
          className={`flex-row items-center rounded-full border px-3 py-1.5 ${pill.bg} ${pill.border}`}
        >
          <View className={`mr-2 h-2.5 w-2.5 rounded-full ${pill.dot}`} />
          <Text className={`text-xs font-semibold ${pill.text}`}>
            {pill.label}
          </Text>
          <Settings size={13} color="#64748B" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* Retry / Refresh Button */}
        <TouchableOpacity
          onPress={onRefreshHealth}
          disabled={isChecking}
          activeOpacity={0.7}
          className="flex-row items-center rounded-lg bg-slate-100 px-2.5 py-1.5"
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#0284C7" />
          ) : (
            <>
              <RefreshCw size={13} color="#475569" />
              <Text className="ml-1 text-xs font-medium text-slate-700">Check</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Server Endpoint Config Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <View className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-row items-center">
                <Server size={18} color="#0284C7" />
                <Text className="ml-2 text-base font-bold text-slate-900">
                  Avi GPU Server Config
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text className="mt-3 text-xs leading-4 text-slate-600">
              Connect to the local lab GPU or remote Tailscale VPN IP running
              MedGemma 1.5 4B (<Text className="font-mono text-slate-800">port 10000</Text>).
            </Text>

            {/* Input Field */}
            <View className="mt-4">
              <Text className="text-xs font-semibold text-slate-700">
                Server Base URL
              </Text>
              <TextInput
                value={inputUrl}
                onChangeText={setInputUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="http://172.17.170.87:10000"
                placeholderTextColor="#94A3B8"
                className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs text-slate-900"
              />
            </View>

            {/* Test Connection Result */}
            {testResult && (
              <View
                className={`mt-3 rounded-xl border p-3 ${
                  testResult.status === "ready"
                    ? "border-emerald-200 bg-emerald-50"
                    : testResult.status === "loading"
                    ? "border-amber-200 bg-amber-50"
                    : "border-rose-200 bg-rose-50"
                }`}
              >
                <View className="flex-row items-center">
                  {testResult.status === "ready" ? (
                    <CheckCircle2 size={16} color="#059669" />
                  ) : testResult.status === "loading" ? (
                    <Cpu size={16} color="#D97706" />
                  ) : (
                    <WifiOff size={16} color="#E11D48" />
                  )}
                  <Text
                    className={`ml-2 text-xs font-bold ${
                      testResult.status === "ready"
                        ? "text-emerald-800"
                        : testResult.status === "loading"
                        ? "text-amber-800"
                        : "text-rose-800"
                    }`}
                  >
                    {testResult.message}
                  </Text>
                </View>
                {testResult.latencyMs !== undefined && (
                  <Text className="mt-1 text-[11px] text-slate-500">
                    Roundtrip Latency: {testResult.latencyMs}ms
                  </Text>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View className="mt-5 gap-2">
              <TouchableOpacity
                onPress={handleTestConnection}
                disabled={testing}
                activeOpacity={0.7}
                className="flex-row items-center justify-center rounded-xl border border-sky-600 bg-sky-50 py-2.5"
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <Text className="text-xs font-semibold text-sky-700">
                    Test Connection
                  </Text>
                )}
              </TouchableOpacity>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleResetDefault}
                  disabled={saving}
                  activeOpacity={0.7}
                  className="flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 py-2.5"
                >
                  <Text className="text-xs font-semibold text-slate-700">
                    Reset Default
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveUrl}
                  disabled={saving}
                  activeOpacity={0.8}
                  className="flex-1 items-center justify-center rounded-xl bg-sky-600 py-2.5"
                >
                  <Text className="text-xs font-bold text-white">
                    {saving ? "Saving..." : "Save Endpoint"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
