/**
 * SehatKosh Mobile — Offline Ingestion Queue & Synchronization Service
 *
 * Facilitates offline-first prescription capture and background synchronization:
 * 1. Persists un-synced scans to AsyncStorage with status PENDING_OCR_SYNC
 * 2. Monitors network connectivity via NetInfo
 * 3. Automatically triggers vision OCR ingestion to /api/v1/prescriptions/extract
 *    as soon as cellular or Wi-Fi network connectivity is re-established.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { extractPrescription } from "./apiClient";

export interface OfflineScanItem {
  id: string;
  localUri: string;
  capturedAt: string;
  status: "PENDING_OCR_SYNC" | "SYNCING" | "SYNCED" | "FAILED";
  metadata?: {
    patient_id?: string;
    doctor_name?: string;
    notes?: string;
    [key: string]: any;
  };
  extractionResult?: any;
  error?: string;
  attempts?: number;
}

const STORAGE_KEY = "@sehatkosh/offline_ocr_queue";

/**
 * Retrieve all items in the offline OCR queue.
 */
export async function getOfflineQueue(): Promise<OfflineScanItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineScanItem[];
  } catch (err) {
    console.warn("[offlineQueue] Failed to read offline queue:", err);
    return [];
  }
}

/**
 * Save updated offline OCR queue.
 */
export async function saveOfflineQueue(queue: OfflineScanItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn("[offlineQueue] Failed to write offline queue:", err);
  }
}

/**
 * Enqueue a captured prescription image for background synchronization.
 */
export async function enqueueOfflineDocument(
  localUri: string,
  metadata?: Record<string, any>
): Promise<OfflineScanItem> {
  const newItem: OfflineScanItem = {
    id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    localUri,
    capturedAt: new Date().toISOString(),
    status: "PENDING_OCR_SYNC",
    metadata,
    attempts: 0,
  };

  const queue = await getOfflineQueue();
  queue.unshift(newItem);
  await saveOfflineQueue(queue);

  console.log(`[offlineQueue] Enqueued offline document: ${newItem.id}`);
  return newItem;
}

/**
 * Remove an item from the offline queue.
 */
export async function removeOfflineItem(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== id);
  await saveOfflineQueue(filtered);
}

/**
 * Clear all successfully synchronized items.
 */
export async function clearSyncedItems(): Promise<void> {
  const queue = await getOfflineQueue();
  const pending = queue.filter((item) => item.status !== "SYNCED");
  await saveOfflineQueue(pending);
}

/**
 * Synchronize a single queued item with the SehatKosh vision extraction API.
 */
export async function syncOfflineItem(
  item: OfflineScanItem
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Mark as SYNCING
    const currentQueue = await getOfflineQueue();
    const updated = currentQueue.map((q) =>
      q.id === item.id ? { ...q, status: "SYNCING" as const } : q
    );
    await saveOfflineQueue(updated);

    // Call vision extraction pipeline
    const result = await extractPrescription(item.localUri);

    // Mark as SYNCED
    const finalQueue = await getOfflineQueue();
    const syncedQueue = finalQueue.map((q) =>
      q.id === item.id
        ? {
            ...q,
            status: "SYNCED" as const,
            extractionResult: result,
            error: undefined,
          }
        : q
    );
    await saveOfflineQueue(syncedQueue);

    return { success: true, data: result };
  } catch (err: any) {
    console.warn(`[offlineQueue] Failed to sync item ${item.id}:`, err);

    const finalQueue = await getOfflineQueue();
    const failedQueue = finalQueue.map((q) =>
      q.id === item.id
        ? {
            ...q,
            status: "FAILED" as const,
            error: err.message || "Network sync failed",
            attempts: (q.attempts || 0) + 1,
          }
        : q
    );
    await saveOfflineQueue(failedQueue);

    return { success: false, error: err.message };
  }
}

/**
 * Synchronize all pending items in the offline queue.
 */
export async function syncAllPendingItems(): Promise<{ total: number; synced: number }> {
  const queue = await getOfflineQueue();
  const pending = queue.filter(
    (item) => item.status === "PENDING_OCR_SYNC" || item.status === "FAILED"
  );

  let syncedCount = 0;
  for (const item of pending) {
    const res = await syncOfflineItem(item);
    if (res.success) syncedCount++;
  }

  return { total: pending.length, synced: syncedCount };
}

/**
 * Initialize automatic background synchronization listener.
 * Listens for NetInfo connectivity transitions and triggers sync when connected.
 */
export function startAutoSyncListener(
  onSyncComplete?: (syncedCount: number) => void
): () => void {
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

    if (isOnline) {
      console.log("[offlineQueue] Network online detected. Triggering auto-sync...");
      syncAllPendingItems().then((res) => {
        if (res.synced > 0 && onSyncComplete) {
          onSyncComplete(res.synced);
        }
      });
    }
  });

  return unsubscribe;
}
