/**
 * SehatKosh Mobile — GitHub Releases In-App Update Checker
 *
 * Checks for published releases from public repository AHSANooo/SehatKosh-v1.
 * Supports automated 24h-throttled startup checks and on-demand manual triggers
 * from the Settings tab without hardcoding release URLs or leaking tokens.
 */

import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const GITHUB_RELEASES_API =
  "https://api.github.com/repos/AHSANooo/SehatKosh-v1/releases/latest";
export const FALLBACK_LATEST_APK_URL =
  "https://github.com/AHSANooo/SehatKosh-v1/releases/latest";

const LAST_CHECK_TS_STORAGE_KEY = "@sehatkosh/last_update_check_ts";
const THROTTLE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  assetSizeMb?: string;
  releaseDate?: string;
  throttled?: boolean;
  error?: string;
}

/**
 * Clean version string by stripping leading 'v', build metadata, and whitespace.
 */
export function cleanVersion(versionStr: string): string {
  if (!versionStr) return "0.0.0";
  return versionStr.trim().replace(/^v/i, "").split("-")[0];
}

/**
 * Compare two SemVer strings numerically.
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, and 0 if equal.
 */
export function compareSemVer(v1: string, v2: string): number {
  const parts1 = cleanVersion(v1)
    .split(".")
    .map((num) => parseInt(num, 10) || 0);
  const parts2 = cleanVersion(v2)
    .split(".")
    .map((num) => parseInt(num, 10) || 0);

  const length = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < length; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Check GitHub Releases for newer APK versions.
 *
 * @param options.force If true, bypasses the 24-hour throttle (for manual button clicks).
 */
export async function checkForAppUpdates(options?: {
  force?: boolean;
}): Promise<UpdateCheckResult> {
  const currentVersion = Constants.expoConfig?.version || "1.0.0";

  // Check 24-hour throttle for automated background startup checks
  if (!options?.force) {
    try {
      const lastCheck = await AsyncStorage.getItem(LAST_CHECK_TS_STORAGE_KEY);
      if (lastCheck) {
        const lastTs = parseInt(lastCheck, 10);
        if (Date.now() - lastTs < THROTTLE_DURATION_MS) {
          return {
            updateAvailable: false,
            currentVersion,
            latestVersion: currentVersion,
            releaseNotes: "",
            downloadUrl: FALLBACK_LATEST_APK_URL,
            throttled: true,
          };
        }
      }
    } catch {
      // Non-fatal, continue with network check
    }
  }

  // Setup 4-second timeout to ensure launches never stall offline
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(GITHUB_RELEASES_API, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "SehatKosh-Mobile-App",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Save timestamp on check completion
    await AsyncStorage.setItem(
      LAST_CHECK_TS_STORAGE_KEY,
      Date.now().toString()
    ).catch(() => {});

    if (response.status === 403) {
      return {
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseNotes: "",
        downloadUrl: FALLBACK_LATEST_APK_URL,
        error: "GitHub API rate limit reached. Please try again later.",
      };
    }

    if (!response.ok) {
      return {
        updateAvailable: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseNotes: "",
        downloadUrl: FALLBACK_LATEST_APK_URL,
        error: `Release check failed (HTTP ${response.status})`,
      };
    }

    const release = await response.json();
    const tag = release.tag_name || "";
    const latestVersion = cleanVersion(tag);

    // Find the APK asset
    const apkAsset = Array.isArray(release.assets)
      ? release.assets.find(
          (a: any) =>
            typeof a.name === "string" && a.name.toLowerCase().endsWith(".apk")
        )
      : null;

    const downloadUrl =
      apkAsset?.browser_download_url || FALLBACK_LATEST_APK_URL;

    const assetSizeMb = apkAsset?.size
      ? (apkAsset.size / (1024 * 1024)).toFixed(1) + " MB"
      : undefined;

    const releaseNotes =
      typeof release.body === "string" ? release.body.trim() : "";

    const releaseDate = release.published_at
      ? new Date(release.published_at).toLocaleDateString()
      : undefined;

    const updateAvailable = compareSemVer(latestVersion, currentVersion) > 0;

    return {
      updateAvailable,
      currentVersion,
      latestVersion,
      releaseNotes,
      downloadUrl,
      assetSizeMb,
      releaseDate,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isAbort = err?.name === "AbortError";
    return {
      updateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseNotes: "",
      downloadUrl: FALLBACK_LATEST_APK_URL,
      error: isAbort
        ? "Network timeout checking for updates."
        : "Unable to check for updates.",
    };
  }
}
