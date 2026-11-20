import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_RELEASES_API =
  "https://api.github.com/repos/AHSANooo/SehatKosh-v1/releases/latest";
const FALLBACK_LATEST_APK_URL =
  "https://github.com/AHSANooo/SehatKosh-v1/releases/latest/download/SehatKosh-latest.apk";

/**
 * Dynamic Android APK Download Endpoint
 *
 * Directs users to the newest compiled release APK hosted on public repository
 * AHSANooo/SehatKosh-v1 without requiring authentication or hardcoded version links.
 */
export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(GITHUB_RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "SehatKosh-Web-Portal",
      },
      next: { revalidate: 300 },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const release = await response.json();
      if (Array.isArray(release.assets)) {
        const apkAsset = release.assets.find(
          (a: any) =>
            typeof a.name === "string" && a.name.toLowerCase().endsWith(".apk")
        );

        if (apkAsset?.browser_download_url) {
          return NextResponse.redirect(apkAsset.browser_download_url, 307);
        }
      }
    }
  } catch (err) {
    console.warn(
      "[DownloadRoute] Failed to fetch latest release from GitHub API, using fallback:",
      err
    );
  }

  // Graceful fallback to permanent direct download URL
  return NextResponse.redirect(FALLBACK_LATEST_APK_URL, 307);
}
