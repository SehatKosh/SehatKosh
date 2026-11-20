import { Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { saveEncounter } from "./apiClient";

export const HEALTH_CONNECTED_STORAGE_KEY = "@sehatkosh/health_connected";
export const LAST_TELEMETRY_STORAGE_KEY = "@sehatkosh/last_telemetry";
export const TELEMETRY_30D_ROLLUP_STORAGE_KEY = "@sehatkosh/telemetry_30d_rollup";
export const LAST_EMR_TELEMETRY_SYNC_PREFIX = "@sehatkosh/last_emr_telemetry_sync_";

// ─── Telemetry Interfaces ───────────────────────────────────────────────────

export interface UnifiedTelemetrySnapshot {
  steps: number;
  stepGoal: number;
  distanceKm: number;
  activeKcal: number;
  kcalGoal: number;
  restingHr: number | null;
  spo2: number | null;
  bloodPressure: string | null;
  sleepDuration: string | null;
  glucoseMgDl: number | null;
  lastSyncedAt: string | null;
  dataSource: "health_connect" | "healthkit" | "simulated" | "fallback";
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

export const BASELINE_TELEMETRY: UnifiedTelemetrySnapshot = {
  steps: 6420,
  stepGoal: 8000,
  distanceKm: 4.8,
  activeKcal: 285,
  kcalGoal: 400,
  restingHr: 72,
  spo2: 98,
  bloodPressure: "118/76",
  sleepDuration: "7h 24m",
  glucoseMgDl: 94,
  lastSyncedAt: null,
  dataSource: "fallback",
};

// ─── Safe Dynamic Loading of react-native-health-connect ─────────────────────
let HealthConnect: any = null;
try {
  HealthConnect = require("react-native-health-connect");
} catch {
  HealthConnect = null;
}

export function isHealthConnectAvailable(): boolean {
  return Platform.OS === "android" && HealthConnect !== null && typeof HealthConnect.initialize === "function";
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
    await AsyncStorage.setItem(HEALTH_CONNECTED_STORAGE_KEY, connected ? "true" : "false");
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

export async function openHealthSettings(): Promise<void> {
  if (Platform.OS === "android") {
    if (isHealthConnectAvailable() && typeof HealthConnect.openHealthConnectSettings === "function") {
      try {
        await HealthConnect.openHealthConnectSettings();
        return;
      } catch {}
    }
    try {
      await Linking.openURL("market://details?id=com.google.android.apps.healthdata");
    } catch {
      await Linking.openURL("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata");
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

// ─── 30-Day Rolling Storage & Tier 2 Cache ──────────────────────────────────

/**
 * Generates realistic 14-day history if cache is completely empty
 */
function generateBaseline30dHistory(): DailyTelemetrySummary[] {
  const history: DailyTelemetrySummary[] = [];
  const baseSteps = [6800, 7200, 6100, 7500, 6900, 6400, 7100, 5900, 6700, 7300, 6500, 7000, 6850, 6420];
  const now = new Date();

  for (let i = 0; i < baseSteps.length; i++) {
    const d = new Date(now.getTime() - (baseSteps.length - 1 - i) * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const steps = baseSteps[i];
    history.push({
      date: dateStr,
      steps,
      distanceKm: Number((steps * 0.00075).toFixed(1)),
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
  await AsyncStorage.setItem(TELEMETRY_30D_ROLLUP_STORAGE_KEY, JSON.stringify(defaultHistory));
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

    await AsyncStorage.setItem(TELEMETRY_30D_ROLLUP_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("[TelemetryService] Failed to save daily summary rollup:", err);
    return [summary];
  }
}

export function computeSevenDayBaseline(summaries: DailyTelemetrySummary[]): SevenDayBaseline {
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
    avgDistanceKm: Number((totalDistance / count).toFixed(1)),
    avgRestingHr: hrCount > 0 ? Math.round(hrSum / hrCount) : 71,
    avgSpo2: spo2Count > 0 ? Math.round(spo2Sum / spo2Count) : 98,
    avgSleepHours:
      sleepCount > 0 ? Number(((sleepMinSum / sleepCount) / 60).toFixed(1)) : 7.4,
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

  // 1. Resting Heart Rate (LOINC 40443-4 / 8867-4)
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

// ─── Tier 3 Cloud EMR Sync Helper (Throttled max once per 6 hours) ───────────

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
    console.warn("[TelemetryService] EMR sync failed gracefully:", err?.message || err);
    return { synced: false, reason: err?.message || "Network or persistence error" };
  }
}

// ─── Live Telemetry Aggregator ──────────────────────────────────────────────

export async function fetchLiveTelemetry(): Promise<UnifiedTelemetrySnapshot> {
  const isConnected = await getHealthConnectedStatus();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  // If running on Android with Health Connect available and connected:
  if (Platform.OS === "android" && isHealthConnectAvailable() && isConnected) {
    try {
      await HealthConnect.initialize();
      const timeRangeFilter = {
        operator: "between",
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
      };

      // 1. Steps Aggregate
      let steps = 0;
      try {
        const stepsAgg = await HealthConnect.aggregateRecord({
          recordType: "Steps",
          timeRangeFilter,
        });
        steps = Math.round(stepsAgg?.COUNT_TOTAL ?? 0);
      } catch {}

      // 2. Active Calories
      let activeKcal = 0;
      try {
        const calAgg = await HealthConnect.aggregateRecord({
          recordType: "ActiveCaloriesBurned",
          timeRangeFilter,
        });
        activeKcal = Math.round(calAgg?.ENERGY_TOTAL?.inKilocalories ?? 0);
      } catch {}

      // 3. Distance
      let distanceKm = 0;
      try {
        const distAgg = await HealthConnect.aggregateRecord({
          recordType: "Distance",
          timeRangeFilter,
        });
        distanceKm = Number(((distAgg?.DISTANCE_TOTAL?.inMeters ?? 0) / 1000).toFixed(1));
      } catch {}

      // 4. Heart Rate (Latest)
      let restingHr: number | null = null;
      try {
        const hrRecords = await HealthConnect.readRecords("HeartRate", {
          timeRangeFilter,
        });
        if (hrRecords?.records?.length > 0) {
          const lastRecord = hrRecords.records[hrRecords.records.length - 1];
          const samples = lastRecord?.samples ?? [];
          if (samples.length > 0) {
            restingHr = Math.round(samples[samples.length - 1].beatsPerMinute);
          }
        }
      } catch {}

      // 5. Oxygen Saturation (SpO2)
      let spo2: number | null = null;
      try {
        const spo2Records = await HealthConnect.readRecords("OxygenSaturation", {
          timeRangeFilter,
        });
        if (spo2Records?.records?.length > 0) {
          const lastRecord = spo2Records.records[spo2Records.records.length - 1];
          spo2 = Math.round(lastRecord.percentage ?? 0);
        }
      } catch {}

      // 6. Sleep Session
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
        if (sleepRecords?.records?.length > 0) {
          const lastSleep = sleepRecords.records[sleepRecords.records.length - 1];
          const durationMs =
            new Date(lastSleep.endTime).getTime() - new Date(lastSleep.startTime).getTime();
          const totalMins = Math.floor(durationMs / (1000 * 60));
          sleepMinutes = totalMins;
          const hours = Math.floor(totalMins / 60);
          const mins = totalMins % 60;
          if (hours > 0 || mins > 0) {
            sleepDuration = `${hours}h ${mins}m`;
          }
        }
      } catch {}

      // 7. Blood Pressure
      let bloodPressure: string | null = null;
      let systolicBp: number | null = null;
      let diastolicBp: number | null = null;
      try {
        const bpRecords = await HealthConnect.readRecords("BloodPressure", {
          timeRangeFilter,
        });
        if (bpRecords?.records?.length > 0) {
          const lastBp = bpRecords.records[bpRecords.records.length - 1];
          systolicBp = Math.round(lastBp.systolic?.inMillimetersOfMercury ?? 0);
          diastolicBp = Math.round(lastBp.diastolic?.inMillimetersOfMercury ?? 0);
          if (systolicBp > 0 && diastolicBp > 0) {
            bloodPressure = `${systolicBp}/${diastolicBp}`;
          }
        }
      } catch {}

      // 8. Blood Glucose
      let glucoseMgDl: number | null = null;
      try {
        const glucoseRecords = await HealthConnect.readRecords("BloodGlucose", {
          timeRangeFilter,
        });
        if (glucoseRecords?.records?.length > 0) {
          const lastGl = glucoseRecords.records[glucoseRecords.records.length - 1];
          const mgdl = lastGl.level?.inMilligramsPerDeciliter;
          if (mgdl) glucoseMgDl = Math.round(mgdl);
        }
      } catch {}

      const effectiveSteps = steps > 0 ? steps : BASELINE_TELEMETRY.steps;
      const effectiveDist = distanceKm > 0 ? distanceKm : BASELINE_TELEMETRY.distanceKm;
      const effectiveKcal = activeKcal > 0 ? activeKcal : BASELINE_TELEMETRY.activeKcal;

      const snapshot: UnifiedTelemetrySnapshot = {
        steps: effectiveSteps,
        stepGoal: 8000,
        distanceKm: effectiveDist,
        activeKcal: effectiveKcal,
        kcalGoal: 400,
        restingHr,
        spo2,
        bloodPressure,
        sleepDuration,
        glucoseMgDl,
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        dataSource: "health_connect",
      };

      await AsyncStorage.setItem(LAST_TELEMETRY_STORAGE_KEY, JSON.stringify(snapshot));

      // Update 30-Day Daily Summary Cache
      const todaySummary: DailyTelemetrySummary = {
        date: now.toISOString().split("T")[0],
        steps: effectiveSteps,
        distanceKm: effectiveDist,
        activeCalories: effectiveKcal,
        restingHr,
        avgSpo2: spo2,
        sleepMinutes: sleepMinutes || 444, // 7h 24m baseline
        systolicBp,
        diastolicBp,
        bloodGlucose: glucoseMgDl,
        source: "Health Connect",
      };
      await saveDailyTelemetrySummary(todaySummary);

      return snapshot;
    } catch (err) {
      console.warn("[TelemetryService] Failed to read Health Connect, falling back:", err);
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
      };
    }
  } catch {}

  const todaySummary: DailyTelemetrySummary = {
    date: now.toISOString().split("T")[0],
    steps: BASELINE_TELEMETRY.steps,
    distanceKm: BASELINE_TELEMETRY.distanceKm,
    activeCalories: BASELINE_TELEMETRY.activeKcal,
    restingHr: BASELINE_TELEMETRY.restingHr,
    avgSpo2: BASELINE_TELEMETRY.spo2,
    sleepMinutes: 444,
    systolicBp: 118,
    diastolicBp: 76,
    bloodGlucose: BASELINE_TELEMETRY.glucoseMgDl,
    source: "Demo Baseline",
  };
  await saveDailyTelemetrySummary(todaySummary);

  return {
    ...BASELINE_TELEMETRY,
    lastSyncedAt: isConnected ? "Just now" : null,
    dataSource: isConnected ? "simulated" : "fallback",
  };
}
