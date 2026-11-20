import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_RELEASES_API =
  "https://api.github.com/repos/AHSANooo/SehatKosh-v1/releases/latest";

// Fallback to the public releases web page if the GitHub API cannot be reached or rate limits
const FALLBACK_RELEASES_PAGE_URL =
  "https://github.com/AHSANooo/SehatKosh-v1/releases/latest";

// Server-side in-memory cache to prevent GitHub unauthenticated rate limiting (60 req/hr per IP)
let cachedApkUrl: string | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

function createRedirectResponse(targetUrl: string): NextResponse {
  const response = NextResponse.redirect(targetUrl, 307);
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

/**
 * Dynamic Android APK Download Endpoint
 *
 * Directs users to the newest compiled release APK hosted on public repository
 * AHSANooo/SehatKosh-v1 without requiring authentication or hardcoded version links.
 * Automatically resolves subsequent releases (v1.0.2, v1.0.3, v2.0.0, etc.) dynamically.
 */
export async function GET() {
  const now = Date.now();

  // Return cached direct download URL if fresh within 5 minutes
  if (cachedApkUrl && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return createRedirectResponse(cachedApkUrl);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "SehatKosh-Web-Portal",
    };

    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(GITHUB_RELEASES_API, {
      headers,
      signal: controller.signal,
      next: { revalidate: 300 },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const release = await response.json();
      if (Array.isArray(release.assets)) {
        const apkAsset = release.assets.find(
          (a: { name?: string; browser_download_url?: string }) =>
            typeof a.name === "string" && a.name.toLowerCase().endsWith(".apk")
        );

        if (apkAsset?.browser_download_url) {
          cachedApkUrl = apkAsset.browser_download_url;
          lastFetchTimestamp = now;
          return createRedirectResponse(apkAsset.browser_download_url);
        }
      }
      console.warn(
        `[DownloadRoute] Latest release (${release.tag_name}) has no .apk asset attached.`
      );
    } else {
      console.warn(
        `[DownloadRoute] GitHub API returned status ${response.status}: ${response.statusText}`
      );
    }
  } catch (err) {
    console.warn(
      "[DownloadRoute] Failed to fetch latest release from GitHub API:",
      err
    );
  }

  // If GitHub API failed or rate-limited but we have a previously cached APK URL, use it
  if (cachedApkUrl) {
    return createRedirectResponse(cachedApkUrl);
  }

  // Graceful fallback to the latest releases overview page
  return createRedirectResponse(FALLBACK_RELEASES_PAGE_URL);
}
