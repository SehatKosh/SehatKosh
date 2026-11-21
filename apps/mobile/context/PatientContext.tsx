import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  BASELINE_TELEMETRY,
  computeSevenDayBaseline,
  DailyTelemetrySummary,
  DayHistoryPoint,
  fetchLiveTelemetry,
  getDailyTelemetryRollup,
  getHealthConnectedStatus,
  getUseDemoBaselineStatus,
  HealthConnectDiagnostics,
  HourlyTelemetryBreakdown,
  requestHealthPermissions,
  setHealthConnectedStatus,
  setUseDemoBaselineStatus,
  SevenDayBaseline,
  syncDailySummaryToEmr,
  UnifiedTelemetrySnapshot,
} from "../services/telemetryService";

export interface PatientRecord {
  id: string;
  fullName: string;
  greetingName: string;
  initials: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  uhid: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  activeMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    timeOfDay?: string;
  }>;
}

export interface PatientTelemetry {
  steps: number;
  stepGoal: number;
  distanceKm: number;
  activeKcal: number | null;
  activeCalories?: number | null; // Alias for activeKcal
  kcalGoal: number;
  restingHr: number | null;
  spo2: number | null;
  bloodPressure: string | null;
  sleepDuration: string | null;
  glucoseMgDl: number | null;
  medicationsTaken: number;
  medicationsTotal: number;
  lastSyncedAt?: string | null;
  dataSource?: "health_connect" | "healthkit" | "simulated" | "fallback";
  hourlyBreakdown: HourlyTelemetryBreakdown;
  dailyHistory: DayHistoryPoint[];
  diagnostics?: HealthConnectDiagnostics;
}

export interface PatientContextType {
  patient: PatientRecord;
  telemetry: PatientTelemetry;
  sevenDayBaseline: SevenDayBaseline;
  dailyRollup: DailyTelemetrySummary[];
  isHealthConnected: boolean;
  isSyncing: boolean;
  useDemoData: boolean;
  diagnostics: HealthConnectDiagnostics | null;
  setUseDemoData: (enabled: boolean) => Promise<void>;
  updateTelemetry: (partial: Partial<PatientTelemetry>) => void;
  connectHealth: () => Promise<boolean>;
  disconnectHealth: () => Promise<void>;
  syncTelemetryNow: (silent?: boolean) => Promise<void>;
}

export const UNIFIED_PATIENT: PatientRecord = {
  id: "patient-ahsan-01",
  fullName: "Muhammad Ahsan",
  greetingName: "Ahsan",
  initials: "MA",
  age: 22,
  gender: "Male",
  uhid: "SK-2026-0553",
  bloodGroup: "O+",
  allergies: ["Penicillin", "Sulfa Drugs"],
  chronicConditions: [
    "Stage 1 Essential Hypertension (ICD-10: I10)",
    "Reactive Airway Component (Mild)",
  ],
  activeMedications: [
    {
      name: "Atenolol",
      dosage: "50mg",
      frequency: "Once daily",
      timeOfDay: "Morning",
    },
    {
      name: "Salbutamol Inhaler",
      dosage: "100mcg",
      frequency: "2 puffs PRN as needed",
      timeOfDay: "PRN",
    },
  ],
};

export const UNIFIED_TELEMETRY: PatientTelemetry = {
  ...BASELINE_TELEMETRY,
  activeCalories: BASELINE_TELEMETRY.activeKcal,
  medicationsTaken: 2,
  medicationsTotal: 2,
  lastSyncedAt: "Just now",
  dataSource: "fallback",
};

export const DEFAULT_7D_BASELINE: SevenDayBaseline = {
  avgSteps: 6850,
  avgRestingHr: 71,
  avgSpo2: 98,
  avgSleepHours: 7.4,
  avgDistanceKm: 5.1,
  daysRecorded: 7,
};

const PatientContext = createContext<PatientContextType>({
  patient: UNIFIED_PATIENT,
  telemetry: UNIFIED_TELEMETRY,
  sevenDayBaseline: DEFAULT_7D_BASELINE,
  dailyRollup: [],
  isHealthConnected: false,
  isSyncing: false,
  useDemoData: false,
  diagnostics: null,
  setUseDemoData: async () => {},
  updateTelemetry: () => {},
  connectHealth: async () => false,
  disconnectHealth: async () => {},
  syncTelemetryNow: async () => {},
});

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patient] = useState<PatientRecord>(UNIFIED_PATIENT);
  const [telemetry, setTelemetry] = useState<PatientTelemetry>(UNIFIED_TELEMETRY);
  const [sevenDayBaseline, setSevenDayBaseline] =
    useState<SevenDayBaseline>(DEFAULT_7D_BASELINE);
  const [dailyRollup, setDailyRollup] = useState<DailyTelemetrySummary[]>([]);
  const [isHealthConnected, setIsHealthConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [useDemoData, setUseDemoDataState] = useState<boolean>(false);
  const [diagnostics, setDiagnostics] =
    useState<HealthConnectDiagnostics | null>(null);

  const isConnectedRef = useRef(isHealthConnected);
  isConnectedRef.current = isHealthConnected;

  const syncTelemetryNow = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const snap = await fetchLiveTelemetry();
      setTelemetry((prev) => ({
        ...prev,
        steps: snap.steps,
        stepGoal: snap.stepGoal,
        distanceKm: snap.distanceKm,
        activeKcal: snap.activeKcal,
        activeCalories: snap.activeKcal,
        kcalGoal: snap.kcalGoal,
        restingHr: snap.restingHr,
        spo2: snap.spo2,
        bloodPressure: snap.bloodPressure,
        sleepDuration: snap.sleepDuration,
        glucoseMgDl: snap.glucoseMgDl,
        lastSyncedAt: snap.lastSyncedAt,
        dataSource: snap.dataSource,
        hourlyBreakdown: snap.hourlyBreakdown,
        dailyHistory: snap.dailyHistory,
        diagnostics: snap.diagnostics,
      }));

      if (snap.diagnostics) {
        setDiagnostics(snap.diagnostics);
      }

      // Load 30-day rolling summaries & compute 7-day baseline
      const rollup = await getDailyTelemetryRollup();
      setDailyRollup(rollup);
      const baseline = computeSevenDayBaseline(rollup);
      setSevenDayBaseline(baseline);

      // Throttled background sync to FastAPI EMR backend (max once per 6 hours)
      if (rollup.length > 0) {
        syncDailySummaryToEmr(patient.id, rollup[0]).catch(() => {});
      }
    } catch (err) {
      console.warn("[PatientContext] Failed to sync telemetry:", err);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const handleSetUseDemoData = async (enabled: boolean): Promise<void> => {
    await setUseDemoBaselineStatus(enabled);
    setUseDemoDataState(enabled);
    await syncTelemetryNow(false);
  };

  const connectHealth = async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const granted = await requestHealthPermissions();
      setIsHealthConnected(granted);
      isConnectedRef.current = granted;
      if (granted) {
        await syncTelemetryNow(false);
      }
      return granted;
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnectHealth = async (): Promise<void> => {
    await setHealthConnectedStatus(false);
    setIsHealthConnected(false);
    isConnectedRef.current = false;
  };

  const updateTelemetry = (partial: Partial<PatientTelemetry>) => {
    setTelemetry((prev) => ({ ...prev, ...partial }));
  };

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [connected, demoMode] = await Promise.all([
        getHealthConnectedStatus(),
        getUseDemoBaselineStatus(),
      ]);
      if (mounted) {
        setIsHealthConnected(connected);
        isConnectedRef.current = connected;
        setUseDemoDataState(demoMode);
        syncTelemetryNow(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 15-Second Foreground Polling (Silent Background Refresh)
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        AppState.currentState === "active" &&
        isConnectedRef.current &&
        !useDemoData
      ) {
        syncTelemetryNow(true);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [useDemoData]);

  // Foreground Auto-Sync on AppState resume
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        syncTelemetryNow(true);
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, []);

  return (
    <PatientContext.Provider
      value={{
        patient,
        telemetry,
        sevenDayBaseline,
        dailyRollup,
        isHealthConnected,
        isSyncing,
        useDemoData,
        diagnostics,
        setUseDemoData: handleSetUseDemoData,
        updateTelemetry,
        connectHealth,
        disconnectHealth,
        syncTelemetryNow,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient(): PatientContextType {
  return useContext(PatientContext);
}
