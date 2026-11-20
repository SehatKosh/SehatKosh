/**
 * SehatKosh Mobile — Local Storage Schema Migrator
 *
 * Provides safe, forward-compatible schema versioning and idempotent data migrations
 * for on-device AsyncStorage. Ensures existing local patient health records, offline
 * OCR queues, and 30-day telemetry rollups are preserved across app upgrades.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyTelemetrySummary } from "./telemetryService";
import type { OfflineScanItem } from "./offlineQueue";

export const STORAGE_SCHEMA_VERSION_KEY = "@sehatkosh/storage_schema_version";
export const CURRENT_SCHEMA_VERSION = 1;

const TELEMETRY_30D_ROLLUP_KEY = "@sehatkosh/telemetry_30d_rollup";
const OFFLINE_OCR_QUEUE_KEY = "@sehatkosh/offline_ocr_queue";

export interface MigrationResult {
  previousVersion: number;
  currentVersion: number;
  migrated: boolean;
  error?: string;
}

/**
 * Retrieve the current local storage schema version integer.
 * Returns 0 if no version marker exists (legacy v0 installations).
 */
export async function getStorageSchemaVersion(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_SCHEMA_VERSION_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch (err) {
    console.warn("[storageMigrator] Failed to read schema version:", err);
    return 0;
  }
}

/**
 * Migration Step: v0 -> v1
 * Normalizes 30-day telemetry rollup and offline OCR queue items with safe default fields.
 */
async function migrateV0ToV1(): Promise<void> {
  // 1. Normalize 30-day telemetry rollup
  try {
    const rawTelemetry = await AsyncStorage.getItem(TELEMETRY_30D_ROLLUP_KEY);
    if (rawTelemetry) {
      const parsed = JSON.parse(rawTelemetry);
      if (Array.isArray(parsed)) {
        const normalized: DailyTelemetrySummary[] = parsed.map((item: any) => {
          const validSources = ["Health Connect", "Apple Health", "Demo Baseline"];
          const source = validSources.includes(item?.source)
            ? item.source
            : "Demo Baseline";

          return {
            date: typeof item?.date === "string" ? item.date : new Date().toISOString().split("T")[0],
            steps: typeof item?.steps === "number" ? Math.max(0, item.steps) : 0,
            distanceKm: typeof item?.distanceKm === "number" ? Math.max(0, item.distanceKm) : 0,
            activeCalories: typeof item?.activeCalories === "number" ? Math.max(0, item.activeCalories) : 0,
            restingHr: typeof item?.restingHr === "number" ? item.restingHr : null,
            minHr: typeof item?.minHr === "number" ? item.minHr : null,
            maxHr: typeof item?.maxHr === "number" ? item.maxHr : null,
            avgSpo2: typeof item?.avgSpo2 === "number" ? item.avgSpo2 : null,
            sleepMinutes: typeof item?.sleepMinutes === "number" ? item.sleepMinutes : null,
            systolicBp: typeof item?.systolicBp === "number" ? item.systolicBp : null,
            diastolicBp: typeof item?.diastolicBp === "number" ? item.diastolicBp : null,
            bloodGlucose: typeof item?.bloodGlucose === "number" ? item.bloodGlucose : null,
            source,
          };
        });

        await AsyncStorage.setItem(
          TELEMETRY_30D_ROLLUP_KEY,
          JSON.stringify(normalized)
        );
      }
    }
  } catch (err) {
    console.warn("[storageMigrator] Telemetry rollup migration warning:", err);
  }

  // 2. Normalize Offline OCR queue items
  try {
    const rawQueue = await AsyncStorage.getItem(OFFLINE_OCR_QUEUE_KEY);
    if (rawQueue) {
      const parsedQueue = JSON.parse(rawQueue);
      if (Array.isArray(parsedQueue)) {
        const validStatuses = ["PENDING_OCR_SYNC", "SYNCING", "SYNCED", "FAILED"];
        const normalizedQueue: OfflineScanItem[] = parsedQueue.map((item: any) => {
          const status = validStatuses.includes(item?.status)
            ? item.status
            : "PENDING_OCR_SYNC";

          return {
            id: String(item?.id || `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
            localUri: String(item?.localUri || ""),
            capturedAt: String(item?.capturedAt || new Date().toISOString()),
            status,
            metadata: typeof item?.metadata === "object" && item?.metadata !== null ? item.metadata : {},
            extractionResult: item?.extractionResult,
            error: item?.error,
            attempts: typeof item?.attempts === "number" ? item.attempts : 0,
          };
        });

        await AsyncStorage.setItem(
          OFFLINE_OCR_QUEUE_KEY,
          JSON.stringify(normalizedQueue)
        );
      }
    }
  } catch (err) {
    console.warn("[storageMigrator] Offline OCR queue migration warning:", err);
  }
}

/**
 * Sequential idempotent storage migration runner.
 * Safely migrates AsyncStorage structures up to CURRENT_SCHEMA_VERSION.
 * Safe to execute on every application boot.
 */
export async function migrateLocalStorage(): Promise<MigrationResult> {
  const previousVersion = await getStorageSchemaVersion();

  if (previousVersion >= CURRENT_SCHEMA_VERSION) {
    return {
      previousVersion,
      currentVersion: CURRENT_SCHEMA_VERSION,
      migrated: false,
    };
  }

  try {
    // Sequential migrations
    if (previousVersion < 1) {
      await migrateV0ToV1();
    }

    // Mark current schema version in AsyncStorage
    await AsyncStorage.setItem(
      STORAGE_SCHEMA_VERSION_KEY,
      String(CURRENT_SCHEMA_VERSION)
    );

    return {
      previousVersion,
      currentVersion: CURRENT_SCHEMA_VERSION,
      migrated: true,
    };
  } catch (err: any) {
    console.error("[storageMigrator] Storage migration failed:", err);
    return {
      previousVersion,
      currentVersion: previousVersion,
      migrated: false,
      error: err?.message || String(err),
    };
  }
}
