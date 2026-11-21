import { Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { saveEncounter } from "./apiClient";

export const HEALTH_CONNECTED_STORAGE_KEY = "@sehatkosh/health_connected";
export const USE_DEMO_BASELINE_STORAGE_KEY = "@sehatkosh/use_demo_baseline";
export const LAST_TELEMETRY_STORAGE_KEY = "@sehatkosh/last_telemetry";
export const TELEMETRY_30D_ROLLUP_STORAGE_KEY = "@sehatkosh/telemetry_30d_rollup";
export const LAST_EMR_TELEMETRY_SYNC_PREFIX = "@sehatkosh/last_emr_telemetry_sync_";

// ─── Telemetry Interfaces ───────────────────────────────────────────────────

export interface HealthConnectDiagnostics {
  grantedPermissions: string[];
  recordCounts: {
    Steps: number;
    Distance: number;
    HeartRate: number;
    ActiveCaloriesBurned: number;
    OxygenSaturation: number;
    SleepSession: number;
    BloodPressure: number;
    BloodGlucose: number;
  };
  lastError: string | null;
  lastSyncedIso: string;
}

export interface HourlyTelemetryBreakdown {
  hourlySteps: number[]; // 16 daytime slots (06:00 to 22:00)
  hourlyDistance: number[];
  hourlyCalories: number[];
  hourlyHr: Array<number | null>;
}

export interface DayHistoryPoint {
  date: string; // YYYY-MM-DD
  label: string; // "Mon", "Tue", etc.
  steps: number;
  distanceKm: number;
  restingHr: number | null;
  calories: number;
}

export interface UnifiedTelemetrySnapshot {
  steps: number;
  stepGoal: number;
  distanceKm: number;
  activeKcal: number | null;
  kcalGoal: number;
  restingHr: number | null;
  spo2: number | null;
  bloodPressure: string | null;
  sleepDuration: string | null;
  glucoseMgDl: number | null;
  lastSyncedAt: string | null;
  dataSource: "health_connect" | "healthkit" | "simulated" | "fallback";
  diagnostics?: HealthConnectDiagnostics;
  hourlyBreakdown: HourlyTelemetryBreakdown;
  dailyHistory: DayHistoryPoint[];
}

export interface DailyTelemetrySummary {
  date: string; // YYYY-MM-DD
  steps: number;
  distanceKm: number;
  activeCalories: number;
  restingHr: number | null;
  minHr?: number | null;
  maxHr?: number | null;
  avgSpo2: number | null;
  sleepMinutes: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  bloodGlucose?: number | null;
  source: "Health Connect" | "Apple Health" | "Demo Baseline";
}

export interface SevenDayBaseline {
  avgSteps: number;
  avgRestingHr: number | null;
  avgSpo2: number | null;
  avgSleepHours: number | null;
  avgDistanceKm: number;
  daysRecorded: number;
}

// ─── Demo Baseline Data ─────────────────────────────────────────────────────

export const BASELINE_HOURLY: HourlyTelemetryBreakdown = {
  hourlySteps: [120, 280, 450, 620, 810, 540, 720, 930, 410, 320, 210, 340, 290, 180, 120, 80],
  hourlyDistance: [0.09, 0.21, 0.34, 0.46, 0.61, 0.4, 0.54, 0.7, 0.31, 0.24, 0.16, 0.25, 0.22, 0.13, 0.09, 0.06],
  hourlyCalories: [8, 18, 30, 42, 54, 36, 48, 62, 28, 22, 14, 23, 20, 12, 8, 5],
  hourlyHr: [68, 70, 75, 78, 82, 74, 76, 85, 72, 71, 69, 73, 72, 70, 68, 67],
};

export function generateDefault7DayHistory(): DayHistoryPoint[] {
  const points: DayHistoryPoint[] = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const baseSteps = [5900, 6800, 7200, 6100, 7500, 6900, 6420];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const steps = baseSteps[6 - i] ?? 6400;
    points.push({
      date: dateStr,
      label: days[d.getDay()],
      steps,
      distanceKm: Number((steps * 0.00075).toFixed(2)),
      restingHr: 70 + ((6 - i) % 4) - 1,
      calories: Math.round(steps * 0.044),
    });
  }
  return points;
}

export const BASELINE_TELEMETRY: UnifiedTelemetrySnapshot = {
  steps: 6420,
  stepGoal: 8000,
  distanceKm: 4.82,
  activeKcal: 285,
  kcalGoal: 400,
  restingHr: 72,
  spo2: 98,
  bloodPressure: "118/76",
  sleepDuration: "7h 24m",
  glucoseMgDl: 94,
  lastSyncedAt: null,
  dataSource: "fallback",
  hourlyBreakdown: BASELINE_HOURLY,
  dailyHistory: generateDefault7DayHistory(),
};

// ─── Safe Dynamic Loading of react-native-health-connect ─────────────────────

let HealthConnect: any = null;
try {
  HealthConnect = require("react-native-health-connect");
} catch {
  HealthConnect = null;
}

export function isHealthConnectAvailable(): boolean {
  return (
    Platform.OS === "android" &&
    HealthConnect !== null &&
    typeof HealthConnect.initialize === "function"
  );
}

export async function checkHealthSdkStatus(): Promise<{
  available: boolean;
  needsInstall: boolean;
  needsUpdate: boolean;
}> {
  if (!isHealthConnectAvailable()) {
    return { available: false, needsInstall: false, needsUpdate: false };
  }
  try {
    const status = await HealthConnect.getSdkStatus();
    return {
      available: status === 3,
      needsInstall: status === 1,
      needsUpdate: status === 2,
    };
  } catch {
    return { available: false, needsInstall: false, needsUpdate: false };
  }
}

export async function getHealthConnectedStatus(): Promise<boolean> {
  try {
    const saved = await AsyncStorage.getItem(HEALTH_CONNECTED_STORAGE_KEY);
    return saved === "true";
  } catch {
    return false;
  }
}

export async function setHealthConnectedStatus(connected: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      HEALTH_CONNECTED_STORAGE_KEY,
      connected ? "true" : "false"
    );
  } catch {}
}

export async function getUseDemoBaselineStatus(): Promise<boolean> {
  try {
    const saved = await AsyncStorage.getItem(USE_DEMO_BASELINE_STORAGE_KEY);
    // Default to false on Android hardware when Health Connect is available; true in Expo Go
    if (saved === null) {
      return isRunningInExpoGo() || Platform.OS !== "android";
    }
    return saved === "true";
  } catch {
    return false;
  }
}

export async function setUseDemoBaselineStatus(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      USE_DEMO_BASELINE_STORAGE_KEY,
      enabled ? "true" : "false"
    );
  } catch {}
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS === "android") {
    if (!isHealthConnectAvailable()) {
      await setHealthConnectedStatus(true);
      return true;
    }
    try {
      const initialized = await HealthConnect.initialize();
      if (!initialized) {
        await setHealthConnectedStatus(false);
        return false;
      }

      const permissions = [
        { accessType: "read", recordType: "Steps" },
        { accessType: "read", recordType: "HeartRate" },
        { accessType: "read", recordType: "OxygenSaturation" },
        { accessType: "read", recordType: "Distance" },
        { accessType: "read", recordType: "ActiveCaloriesBurned" },
        { accessType: "read", recordType: "SleepSession" },
        { accessType: "read", recordType: "BloodPressure" },
        { accessType: "read", recordType: "BloodGlucose" },
      ];

      const granted = await HealthConnect.requestPermission(permissions);
      const isGranted = Array.isArray(granted) && granted.length > 0;
      await setHealthConnectedStatus(isGranted);
      return isGranted;
    } catch (err) {
      console.warn("[TelemetryService] Permission request failed:", err);
      return false;
    }
  }

  if (Platform.OS === "ios") {
    await setHealthConnectedStatus(true);
    return true;
  }

  return false;
}

export async function getGrantedHealthPermissions(): Promise<string[]> {
  if (Platform.OS === "android" && isHealthConnectAvailable()) {
    try {
      await HealthConnect.initialize();
      const perms = await HealthConnect.getGrantedPermissions();
      if (Array.isArray(perms)) {
        return perms.map((p: any) =>
          typeof p === "string"
            ? p
            : `${p.accessType || "read"}.${p.recordType || "Unknown"}`
        );
      }
    } catch (err) {
      console.warn("[TelemetryService] getGrantedPermissions failed:", err);
    }
  }
  return [];
}

export async function openHealthSettings(): Promise<void> {
  if (Platform.OS === "android") {
    if (
      isHealthConnectAvailable() &&
      typeof HealthConnect.openHealthConnectSettings === "function"
    ) {
      try {
        await HealthConnect.openHealthConnectSettings();
        return;
      } catch {}
    }
    try {
      await Linking.openURL(
        "market://details?id=com.google.android.apps.healthdata"
      );
    } catch {
      await Linking.openURL(
        "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"
      );
    }
    return;
  }

  if (Platform.OS === "ios") {
    try {
      await Linking.openURL("x-apple-health://");
    } catch {
      await Linking.openSettings();
    }
  }
}

export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {}
}

export function isRunningInExpoGo(): boolean {
  try {
    return (
      Constants.appOwnership === "expo" ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    );
  } catch {
    return false;
  }
}

// ─── Time-of-Day Hourly Bucketing (16 Slots from 06:00 to 22:00) ───────────

export function getHourSlotIndex(date: Date): number {
  const hour = date.getHours();
  if (hour < 6) return 0;
  if (hour >= 22) return 15;
  return hour - 6; // 6 -> 0, 7 -> 1, ..., 21 -> 15
}

/**
 * Downsamples 16 one-hour daytime slots into 8 two-hour blocks for compact Bento cards
 */
export function downsample16To8(slots: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < 16; i += 2) {
    const sum = (slots[i] || 0) + (slots[i + 1] || 0);
    result.push(sum);
  }
  return result;
}

export function downsampleHr16To8(
  slots: Array<number | null>
): Array<number | null> {
  const result: Array<number | null> = [];
  for (let i = 0; i < 16; i += 2) {
    const a = slots[i];
    const b = slots[i + 1];
    if (a !== null && b !== null) {
      result.push(Math.round((a + b) / 2));
    } else if (a !== null) {
      result.push(a);
    } else if (b !== null) {
      result.push(b);
    } else {
      result.push(null);
    }
  }
  return result;
}

/**
 * Normalizes an array of numbers into 0-100 percentage heights for Bento card bars
 */
export function normalizeToPercentBars(values: number[]): number[] {
  const max = Math.max(...values, 0);
  if (max === 0) return [12, 12, 12, 12, 12, 12, 12, 12];
  return values.map((v) => Math.max(Math.round((v / max) * 88) + 12, 12));
}

// ─── 30-Day Rolling Storage & Tier 2 Cache ──────────────────────────────────

function generateBaseline30dHistory(): DailyTelemetrySummary[] {
  const history: DailyTelemetrySummary[] = [];
  const baseSteps = [
    6800, 7200, 6100, 7500, 6900, 6400, 7100, 5900, 6700, 7300, 6500, 7000,
    6850, 6420,
  ];
  const now = new Date();

  for (let i = 0; i < baseSteps.length; i++) {
    const d = new Date(
      now.getTime() - (baseSteps.length - 1 - i) * 24 * 60 * 60 * 1000
    );
    const dateStr = d.toISOString().split("T")[0];
    const steps = baseSteps[i];
    history.push({
      date: dateStr,
      steps,
      distanceKm: Number((steps * 0.00075).toFixed(2)),
      activeCalories: Math.round(steps * 0.044),
      restingHr: 70 + (i % 5) - 2,
      minHr: 58,
      maxHr: 112,
      avgSpo2: 98,
      sleepMinutes: 440 + (i % 4) * 15,
      systolicBp: 118,
      diastolicBp: 76,
      bloodGlucose: 94,
      source: "Demo Baseline",
    });
  }
  return history.reverse(); // Newest first
}

export async function getDailyTelemetryRollup(): Promise<DailyTelemetrySummary[]> {
  try {
    const raw = await AsyncStorage.getItem(TELEMETRY_30D_ROLLUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyTelemetrySummary[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[TelemetryService] Failed to load 30d rollup cache:", err);
  }
  const defaultHistory = generateBaseline30dHistory();
  await AsyncStorage.setItem(
    TELEMETRY_30D_ROLLUP_STORAGE_KEY,
    JSON.stringify(defaultHistory)
  );
  return defaultHistory;
}

export async function saveDailyTelemetrySummary(
  summary: DailyTelemetrySummary
): Promise<DailyTelemetrySummary[]> {
  try {
    const current = await getDailyTelemetryRollup();
    const filtered = current.filter((item) => item.date !== summary.date);
    const updated = [summary, ...filtered]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30); // Maintain strictly at most 30 days (<10 KB total storage)

    await AsyncStorage.setItem(
      TELEMETRY_30D_ROLLUP_STORAGE_KEY,
      JSON.stringify(updated)
    );
    return updated;
  } catch (err) {
    console.warn("[TelemetryService] Failed to save daily summary rollup:", err);
    return [summary];
  }
}

export function computeSevenDayBaseline(
  summaries: DailyTelemetrySummary[]
): SevenDayBaseline {
  if (!summaries || summaries.length === 0) {
    return {
      avgSteps: 6850,
      avgRestingHr: 71,
      avgSpo2: 98,
      avgSleepHours: 7.4,
      avgDistanceKm: 5.1,
      daysRecorded: 7,
    };
  }

  const recent = summaries.slice(0, 7);
  const count = recent.length;

  let totalSteps = 0;
  let totalDistance = 0;
  let hrSum = 0;
  let hrCount = 0;
  let spo2Sum = 0;
  let spo2Count = 0;
  let sleepMinSum = 0;
  let sleepCount = 0;

  for (const s of recent) {
    totalSteps += s.steps;
    totalDistance += s.distanceKm;
    if (s.restingHr) {
      hrSum += s.restingHr;
      hrCount++;
    }
    if (s.avgSpo2) {
      spo2Sum += s.avgSpo2;
      spo2Count++;
    }
    if (s.sleepMinutes) {
      sleepMinSum += s.sleepMinutes;
      sleepCount++;
    }
  }

  return {
    avgSteps: Math.round(totalSteps / count),
    avgDistanceKm: Number((totalDistance / count).toFixed(2)),
    avgRestingHr: hrCount > 0 ? Math.round(hrSum / hrCount) : 71,
    avgSpo2: spo2Count > 0 ? Math.round(spo2Sum / spo2Count) : 98,
    avgSleepHours:
      sleepCount > 0 ? Number((sleepMinSum / sleepCount / 60).toFixed(1)) : 7.4,
    daysRecorded: count,
  };
}

// ─── HL7 FHIR R4 LOINC Observation Generator ────────────────────────────────

export function buildFhirTelemetryObservationBundle(
  patientId: string,
  summary: DailyTelemetrySummary
): any {
  const timestamp = `${summary.date}T12:00:00Z`;
  const entries: any[] = [];

  // 1. Resting Heart Rate (LOINC 40443-4)
  if (summary.restingHr) {
    entries.push({
      fullUrl: `urn:uuid:obs-hr-${summary.date}`,
      resource: {
        resourceType: "Observation",
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs",
                display: "Vital Signs",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "40443-4",
              display: "Resting heart rate",
            },
          ],
          text: "Resting Heart Rate",
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: timestamp,
        valueQuantity: {
          value: summary.restingHr,
          unit: "/min",
          system: "http://unitsofmeasure.org",
          code: "/min",
        },
      },
    });
  }

  // 2. Oxygen Saturation (LOINC 59408-5)
  if (summary.avgSpo2) {
    entries.push({
      fullUrl: `urn:uuid:obs-spo2-${summary.date}`,
      resource: {
        resourceType: "Observation",
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs",
                display: "Vital Signs",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "59408-5",
              display: "Oxygen saturation in Arterial blood by Pulse oximetry",
            },
          ],
          text: "Blood Oxygen Saturation (SpO2)",
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: timestamp,
        valueQuantity: {
          value: summary.avgSpo2,
          unit: "%",
          system: "http://unitsofmeasure.org",
          code: "%",
        },
      },
    });
  }

  // 3. Daily Step Count (LOINC 41950-7)
  entries.push({
    fullUrl: `urn:uuid:obs-steps-${summary.date}`,
    resource: {
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "activity",
              display: "Activity",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "41950-7",
            display: "Number of steps in 24 hour Measured",
          },
        ],
        text: "Daily Step Count",
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: timestamp,
      valueQuantity: {
        value: summary.steps,
        unit: "{steps}/d",
        system: "http://unitsofmeasure.org",
        code: "{steps}/d",
      },
    },
  });

  // 4. Step Distance (LOINC 41953-1)
  entries.push({
    fullUrl: `urn:uuid:obs-dist-${summary.date}`,
    resource: {
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "activity",
              display: "Activity",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "41953-1",
            display: "Distance walked or run in 24 hour Measured",
          },
        ],
        text: "Daily Step Distance",
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: timestamp,
      valueQuantity: {
        value: summary.distanceKm,
        unit: "km",
        system: "http://unitsofmeasure.org",
        code: "km",
      },
    },
  });

  // 5. Active Calories Burned (LOINC 41981-2)
  entries.push({
    fullUrl: `urn:uuid:obs-kcal-${summary.date}`,
    resource: {
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "activity",
              display: "Activity",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "41981-2",
            display: "Calories burned",
          },
        ],
        text: "Active Energy Burned",
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: timestamp,
      valueQuantity: {
        value: summary.activeCalories,
        unit: "kcal",
        system: "http://unitsofmeasure.org",
        code: "kcal",
      },
    },
  });

  // 6. Blood Pressure Panel (LOINC 85354-9) if present
  if (summary.systolicBp && summary.diastolicBp) {
    entries.push({
      fullUrl: `urn:uuid:obs-bp-${summary.date}`,
      resource: {
        resourceType: "Observation",
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs",
                display: "Vital Signs",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "85354-9",
              display: "Blood pressure panel with all children optional",
            },
          ],
          text: "Blood Pressure",
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: timestamp,
        component: [
          {
            code: {
              coding: [
                {
                  system: "http://loinc.org",
                  code: "8480-6",
                  display: "Systolic blood pressure",
                },
              ],
            },
            valueQuantity: {
              value: summary.systolicBp,
              unit: "mm[Hg]",
              system: "http://unitsofmeasure.org",
              code: "mm[Hg]",
            },
          },
          {
            code: {
              coding: [
                {
                  system: "http://loinc.org",
                  code: "8462-4",
                  display: "Diastolic blood pressure",
                },
              ],
            },
            valueQuantity: {
              value: summary.diastolicBp,
              unit: "mm[Hg]",
              system: "http://unitsofmeasure.org",
              code: "mm[Hg]",
            },
          },
        ],
      },
    });
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}

// ─── Cloud EMR Sync Helper ─────────────────────────────────────────────────

export async function syncDailySummaryToEmr(
  patientId: string,
  summary: DailyTelemetrySummary,
  force = false
): Promise<{ synced: boolean; reason?: string }> {
  const syncKey = `${LAST_EMR_TELEMETRY_SYNC_PREFIX}${summary.date}`;
  const now = Date.now();
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

  try {
    const lastSyncStr = await AsyncStorage.getItem(syncKey);
    if (!force && lastSyncStr) {
      const lastSyncTime = Number(lastSyncStr);
      if (now - lastSyncTime < SIX_HOURS_MS) {
        return {
          synced: false,
          reason: "Throttled (already synced to EMR within last 6 hours)",
        };
      }
    }

    const bundle = buildFhirTelemetryObservationBundle(patientId, summary);
    const encounterPayload = {
      patient_id: patientId,
      physician_name: "Wearable Telemetry Engine",
      facility_name: "SehatKosh Telemetry Sync",
      encounter_date: summary.date,
      source_type: "WEARABLE_BLE",
      verification_status: "PATIENT_REPORTED",
      encounter_class: "TELEMETRY_SYNC",
      vitals_snapshot: {
        resting_hr: summary.restingHr,
        spo2: summary.avgSpo2,
        steps: summary.steps,
        distance_km: summary.distanceKm,
        calories: summary.activeCalories,
        systolic_bp: summary.systolicBp,
        diastolic_bp: summary.diastolicBp,
        blood_glucose: summary.bloodGlucose,
        sleep_minutes: summary.sleepMinutes,
        source: summary.source,
      },
      fhir_bundle: bundle,
    };

    await saveEncounter(encounterPayload);
    await AsyncStorage.setItem(syncKey, String(now));
    return { synced: true };
  } catch (err: any) {
    console.warn(
      "[TelemetryService] EMR sync failed gracefully:",
      err?.message || err
    );
    return {
      synced: false,
      reason: err?.message || "Network or persistence error",
    };
  }
}

// ─── Live Telemetry Aggregator ──────────────────────────────────────────────

export async function fetchLiveTelemetry(): Promise<UnifiedTelemetrySnapshot> {
  const isConnected = await getHealthConnectedStatus();
  const useDemoData = await getUseDemoBaselineStatus();
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  );
  const sevenDaysAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
    0,
    0,
    0
  );

  // If user explicitly enabled Demo Mode, return rich sample data
  if (useDemoData) {
    const defaultHistory = generateDefault7DayHistory();
    return {
      ...BASELINE_TELEMETRY,
      lastSyncedAt: isConnected ? "Just now (Demo Mode)" : null,
      dataSource: isConnected ? "simulated" : "fallback",
      dailyHistory: defaultHistory,
      hourlyBreakdown: BASELINE_HOURLY,
    };
  }

  // If running on Android with Health Connect available and connected:
  if (Platform.OS === "android" && isHealthConnectAvailable() && isConnected) {
    let lastError: string | null = null;
    let grantedPerms: string[] = [];
    const recordCounts = {
      Steps: 0,
      Distance: 0,
      HeartRate: 0,
      ActiveCaloriesBurned: 0,
      OxygenSaturation: 0,
      SleepSession: 0,
      BloodPressure: 0,
      BloodGlucose: 0,
    };

    try {
      await HealthConnect.initialize();
      try {
        grantedPerms = await getGrantedHealthPermissions();
      } catch {}

      const todayFilter = {
        operator: "between",
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
      };

      const sevenDayFilter = {
        operator: "between",
        startTime: sevenDaysAgo.toISOString(),
        endTime: now.toISOString(),
      };

      // Hourly Buckets for Today (16 slots: 06:00 to 22:00)
      const hourlySteps = Array(16).fill(0);
      const hourlyDistance = Array(16).fill(0);
      const hourlyCalories = Array(16).fill(0);
      const hourlyHrSums = Array(16).fill(0);
      const hourlyHrCounts = Array(16).fill(0);

      // 1. Steps (Today Raw Records + 7-Day Total)
      let todaySteps = 0;
      const dailyStepsMap: Record<string, number> = {};
      try {
        const stepRecords = await HealthConnect.readRecords("Steps", {
          timeRangeFilter: sevenDayFilter,
        });
        const records = stepRecords?.records || [];
        recordCounts.Steps = records.length;

        for (const r of records) {
          const count = Number(r.count || 0);
          const rDate = new Date(r.startTime || r.endTime);
          const dateKey = rDate.toISOString().split("T")[0];
          dailyStepsMap[dateKey] = (dailyStepsMap[dateKey] || 0) + count;

          // Today's hourly breakdown
          if (rDate >= startOfDay && rDate <= now) {
            todaySteps += count;
            const slot = getHourSlotIndex(rDate);
            hourlySteps[slot] += count;
          }
        }
      } catch (e: any) {
        lastError = e?.message || String(e);
      }

      // 2. Distance (Raw Records)
      let todayDistanceMeters = 0;
      const dailyDistMap: Record<string, number> = {};
      try {
        const distRecords = await HealthConnect.readRecords("Distance", {
          timeRangeFilter: sevenDayFilter,
        });
        const records = distRecords?.records || [];
        recordCounts.Distance = records.length;

        for (const r of records) {
          const meters = Number(r.distance?.inMeters || 0);
          const rDate = new Date(r.startTime || r.endTime);
          const dateKey = rDate.toISOString().split("T")[0];
          dailyDistMap[dateKey] = (dailyDistMap[dateKey] || 0) + meters;

          if (rDate >= startOfDay && rDate <= now) {
            todayDistanceMeters += meters;
            const slot = getHourSlotIndex(rDate);
            hourlyDistance[slot] += Number((meters / 1000).toFixed(2));
          }
        }
      } catch (e: any) {
        if (!lastError) lastError = e?.message || String(e);
      }
      const distanceKm = Number((todayDistanceMeters / 1000).toFixed(2));

      // 3. Active Calories
      let todayCalories = 0;
      let hasCalories = false;
      const dailyCalMap: Record<string, number> = {};
      try {
        const calRecords = await HealthConnect.readRecords(
          "ActiveCaloriesBurned",
          {
            timeRangeFilter: sevenDayFilter,
          }
        );
        const records = calRecords?.records || [];
        recordCounts.ActiveCaloriesBurned = records.length;
        if (records.length > 0) hasCalories = true;

        for (const r of records) {
          const kcal = Number(r.energy?.inKilocalories || 0);
          const rDate = new Date(r.startTime || r.endTime);
          const dateKey = rDate.toISOString().split("T")[0];
          dailyCalMap[dateKey] = (dailyCalMap[dateKey] || 0) + kcal;

          if (rDate >= startOfDay && rDate <= now) {
            todayCalories += kcal;
            const slot = getHourSlotIndex(rDate);
            hourlyCalories[slot] += Math.round(kcal);
          }
        }
      } catch (e: any) {
        if (!lastError) lastError = e?.message || String(e);
      }
      const activeKcal = hasCalories ? Math.round(todayCalories) : null;

      // 4. Heart Rate (Latest Reading + Hourly Buckets)
      let restingHr: number | null = null;
      const dailyHrMap: Record<string, { sum: number; count: number }> = {};
      try {
        const hrRecords = await HealthConnect.readRecords("HeartRate", {
          timeRangeFilter: sevenDayFilter,
        });
        const records = hrRecords?.records || [];
        recordCounts.HeartRate = records.length;

        for (const r of records) {
          const samples = r.samples || [];
          for (const s of samples) {
            const bpm = Number(s.beatsPerMinute || 0);
            if (bpm > 30 && bpm < 220) {
              const sDate = new Date(s.time);
              const dateKey = sDate.toISOString().split("T")[0];
              if (!dailyHrMap[dateKey]) dailyHrMap[dateKey] = { sum: 0, count: 0 };
              dailyHrMap[dateKey].sum += bpm;
              dailyHrMap[dateKey].count++;

              if (sDate >= startOfDay && sDate <= now) {
                restingHr = Math.round(bpm); // Takes latest valid sample
                const slot = getHourSlotIndex(sDate);
                hourlyHrSums[slot] += bpm;
                hourlyHrCounts[slot]++;
              }
            }
          }
        }
      } catch (e: any) {
        if (!lastError) lastError = e?.message || String(e);
      }

      const hourlyHr: Array<number | null> = hourlyHrCounts.map((count, i) =>
        count > 0 ? Math.round(hourlyHrSums[i] / count) : null
      );

      // 5. Blood Oxygen (SpO2) - Honest null if 0 records
      let spo2: number | null = null;
      try {
        const spo2Records = await HealthConnect.readRecords(
          "OxygenSaturation",
          {
            timeRangeFilter: todayFilter,
          }
        );
        const records = spo2Records?.records || [];
        recordCounts.OxygenSaturation = records.length;
        if (records.length > 0) {
          const lastRecord = records[records.length - 1];
          const pct = Number(lastRecord.percentage ?? 0);
          if (pct > 50 && pct <= 100) spo2 = Math.round(pct);
        }
      } catch (e: any) {
        if (!lastError) lastError = e?.message || String(e);
      }

      // 6. Sleep Session - Honest null if 0 records
      let sleepDuration: string | null = null;
      let sleepMinutes: number | null = null;
      try {
        const sleepRecords = await HealthConnect.readRecords("SleepSession", {
          timeRangeFilter: {
            operator: "between",
            startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            endTime: now.toISOString(),
          },
        });
        const records = sleepRecords?.records || [];
        recordCounts.SleepSession = records.length;
        if (records.length > 0) {
          const lastSleep = records[records.length - 1];
          const durationMs =
            new Date(lastSleep.endTime).getTime() -
            new Date(lastSleep.startTime).getTime();
          const totalMins = Math.floor(durationMs / (1000 * 60));
          if (totalMins > 0) {
            sleepMinutes = totalMins;
            const hours = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            sleepDuration = `${hours}h ${mins}m`;
          }
        }
      } catch (e: any) {
        if (!lastError) lastError = e?.message || String(e);
      }

      // 7. Blood Pressure - Honest null if 0 records
      let bloodPressure: string | null = null;
      let systolicBp: number | null = null;
      let diastolicBp: number | null = null;
      try {
        const bpRecords = await HealthConnect.readRecords("BloodPressure", {
          timeRangeFilter: todayFilter,
        });
        const records = bpRecords?.records || [];
        recordCounts.BloodPressure = records.length;
        if (records.length > 0) {
          const lastBp = records[records.length - 1];
          systolicBp = Math.round(
            lastBp.systolic?.inMillimetersOfMercury ?? 0
          );
          diastolicBp = Math.round(
            lastBp.diastolic?.inMillimetersOfMercury ?? 0
          );
          if (systolicBp > 0 && diastolicBp > 0) {
            bloodPressure = `${systolicBp}/${diastolicBp}`;
          }
        }
      } catch (e: any) {
        if (!lastError) lastError = e?.message || String(e);
      }

      // 8. Blood Glucose - Honest null if 0 records
      let glucoseMgDl: number | null = null;
      try {
        const glucoseRecords = await HealthConnect.readRecords("BloodGlucose", {
          timeRangeFilter: todayFilter,
        });
        const records = glucoseRecords?.records || [];
        recordCounts.BloodGlucose = records.length;
        if (records.length > 0) {
          const lastGl = records[records.length - 1];
          const mgdl = lastGl.level?.inMilligramsPerDeciliter;
          if (mgdl) glucoseMgDl = Math.round(mgdl);
        }
      } catch (e: any) {
        if (!lastError) lastError = e?.message || String(e);
      }

      // ─── Build True 7-Day History Mon–Sun ──────────────────────────────────
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dailyHistory: DayHistoryPoint[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split("T")[0];
        const isToday = i === 0;

        const daySteps = isToday
          ? todaySteps
          : dailyStepsMap[dateStr] || 0;
        const dayDist = isToday
          ? distanceKm
          : Number(((dailyDistMap[dateStr] || 0) / 1000).toFixed(2));
        const dayCal = isToday
          ? activeKcal ?? 0
          : Math.round(dailyCalMap[dateStr] || 0);

        let dayHr: number | null = null;
        if (isToday) {
          dayHr = restingHr;
        } else if (dailyHrMap[dateStr] && dailyHrMap[dateStr].count > 0) {
          dayHr = Math.round(
            dailyHrMap[dateStr].sum / dailyHrMap[dateStr].count
          );
        }

        dailyHistory.push({
          date: dateStr,
          label: days[d.getDay()],
          steps: daySteps,
          distanceKm: dayDist,
          restingHr: dayHr,
          calories: dayCal,
        });
      }

      const diagnostics: HealthConnectDiagnostics = {
        grantedPermissions: grantedPerms,
        recordCounts,
        lastError,
        lastSyncedIso: new Date().toISOString(),
      };

      console.log(
        `[HealthConnect Sync] Live hardware sync complete: Steps: ${todaySteps}, Dist: ${distanceKm}km, HR: ${restingHr}, SpO2: ${spo2}, Records:`,
        recordCounts
      );

      const snapshot: UnifiedTelemetrySnapshot = {
        steps: todaySteps,
        stepGoal: 8000,
        distanceKm,
        activeKcal,
        kcalGoal: 400,
        restingHr,
        spo2,
        bloodPressure,
        sleepDuration,
        glucoseMgDl,
        lastSyncedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dataSource: "health_connect",
        diagnostics,
        hourlyBreakdown: {
          hourlySteps,
          hourlyDistance,
          hourlyCalories,
          hourlyHr,
        },
        dailyHistory,
      };

      await AsyncStorage.setItem(
        LAST_TELEMETRY_STORAGE_KEY,
        JSON.stringify(snapshot)
      );

      // Save Daily Telemetry Summary for EMR & 30D rollups
      const todaySummary: DailyTelemetrySummary = {
        date: now.toISOString().split("T")[0],
        steps: todaySteps,
        distanceKm,
        activeCalories: activeKcal ?? 0,
        restingHr,
        avgSpo2: spo2,
        sleepMinutes: sleepMinutes,
        systolicBp,
        diastolicBp,
        bloodGlucose: glucoseMgDl,
        source: "Health Connect",
      };
      await saveDailyTelemetrySummary(todaySummary);

      return snapshot;
    } catch (err: any) {
      console.warn(
        "[TelemetryService] Failed to read Health Connect, falling back:",
        err
      );
    }
  }

  // Fallback / cached / simulated mode for Expo Go and unlinked builds
  try {
    const cached = await AsyncStorage.getItem(LAST_TELEMETRY_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as UnifiedTelemetrySnapshot;
      return {
        ...parsed,
        lastSyncedAt: parsed.lastSyncedAt || "Synced",
        dataSource: isConnected ? "simulated" : "fallback",
        hourlyBreakdown: parsed.hourlyBreakdown || BASELINE_HOURLY,
        dailyHistory: parsed.dailyHistory || generateDefault7DayHistory(),
      };
    }
  } catch {}

  const defaultHistory = generateDefault7DayHistory();
  return {
    ...BASELINE_TELEMETRY,
    lastSyncedAt: isConnected ? "Just now" : null,
    dataSource: isConnected ? "simulated" : "fallback",
    dailyHistory: defaultHistory,
    hourlyBreakdown: BASELINE_HOURLY,
  };
}
