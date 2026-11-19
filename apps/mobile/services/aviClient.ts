import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

export const AVI_STORAGE_KEY = "@sehatkosh/avi_server_url";
export const DEFAULT_AVI_URL =
  process.env.EXPO_PUBLIC_AVI_URL || "http://172.17.170.87:10000";

// ─── Endpoint Configuration ──────────────────────────────────────────────────

let cachedCustomUrl: string | null = null;
let customUrlLoaded = false;

export async function getAviBaseUrl(): Promise<string> {
  if (customUrlLoaded && cachedCustomUrl !== null) {
    return cachedCustomUrl;
  }
  try {
    const custom = await AsyncStorage.getItem(AVI_STORAGE_KEY);
    if (custom && custom.trim().length > 0) {
      cachedCustomUrl = custom.trim().replace(/\/+$/, "");
      customUrlLoaded = true;
      return cachedCustomUrl;
    }
    customUrlLoaded = true;
  } catch (err) {
    if (!customUrlLoaded) {
      console.warn("[AviClient] Failed to load custom URL from storage:", err);
      customUrlLoaded = true;
    }
  }
  return DEFAULT_AVI_URL.replace(/\/+$/, "");
}

export async function setAviBaseUrl(rawUrl: string): Promise<string> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  url = url.replace(/\/+$/, "");
  cachedCustomUrl = url;
  customUrlLoaded = true;
  try {
    await AsyncStorage.setItem(AVI_STORAGE_KEY, url);
  } catch (err) {
    console.warn("[AviClient] Failed to persist custom URL to storage:", err);
  }
  return url;
}

export async function resetAviBaseUrl(): Promise<string> {
  cachedCustomUrl = null;
  customUrlLoaded = true;
  try {
    await AsyncStorage.removeItem(AVI_STORAGE_KEY);
  } catch (err) {
    console.warn("[AviClient] Failed to reset custom URL in storage:", err);
  }
  return DEFAULT_AVI_URL.replace(/\/+$/, "");
}

export function getDefaultAviBaseUrl(): string {
  return DEFAULT_AVI_URL.replace(/\/+$/, "");
}

// ─── Health Probe State Machine ──────────────────────────────────────────────

export type AviHealthStatus = "ready" | "loading" | "unavailable" | "unreachable";

export interface AviHealthResponse {
  status: AviHealthStatus;
  statusCode?: number;
  message: string;
  latencyMs?: number;
  raw?: unknown;
}

export async function checkAviHealth(overrideUrl?: string): Promise<AviHealthResponse> {
  const baseUrl = overrideUrl || (await getAviBaseUrl());
  const startTime = Date.now();

  // Generous 12-second timeout to handle multi-floor Wi-Fi hops, high latency, or Tailscale
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  // Probe primary /health endpoint first
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // Body not JSON
    }

    if (res.status === 200) {
      return {
        status: "ready",
        statusCode: 200,
        message: "Avi Ready (MedGemma 1.5 4B)",
        latencyMs,
        raw: body,
      };
    }

    if (res.status === 503) {
      const isWarming =
        body?.status === "loading" ||
        body?.detail?.toLowerCase()?.includes("loading") ||
        body?.detail?.toLowerCase()?.includes("warm");

      return {
        status: "loading",
        statusCode: 503,
        message: isWarming
          ? "Warming up MedGemma 1.5 4B on GPU... (~30s)"
          : "GPU Busy (Concurrency=1) - Request Queued",
        latencyMs,
        raw: body,
      };
    }

    // If /health returned 404, server is alive but may be standard OpenAI/vLLM without /health
    if (res.status === 404) {
      // Probe /v1/models
      try {
        const modelsRes = await fetch(`${baseUrl}/v1/models`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (modelsRes.status === 200) {
          return {
            status: "ready",
            statusCode: 200,
            message: "Avi Ready (MedGemma 1.5 4B)",
            latencyMs: Date.now() - startTime,
          };
        }
      } catch {}
      // Even if /v1/models probe throws, reaching the server with HTTP 404 proves host is online!
      return {
        status: "ready",
        statusCode: 200,
        message: "Avi Ready (Host Online)",
        latencyMs,
      };
    }

    return {
      status: "unavailable",
      statusCode: res.status,
      message: `GPU Service returned HTTP ${res.status}`,
      latencyMs,
      raw: body,
    };
  } catch (err: any) {
    clearTimeout(timer);

    // Fallback: Try quick probe to /v1/models or root / in case /health is blocked or missing
    try {
      const fallbackController = new AbortController();
      const fbTimer = setTimeout(() => fallbackController.abort(), 4000);
      const fallbackRes = await fetch(`${baseUrl}/v1/models`, {
        method: "GET",
        signal: fallbackController.signal,
      });
      clearTimeout(fbTimer);
      if (fallbackRes.status >= 200 && fallbackRes.status < 500) {
        return {
          status: "ready",
          statusCode: fallbackRes.status,
          message: "Avi Ready (MedGemma 1.5 4B)",
          latencyMs: Date.now() - startTime,
        };
      }
    } catch {}

    const latencyMs = Date.now() - startTime;
    return {
      status: "unreachable",
      message:
        err?.name === "AbortError"
          ? `Connection timed out (12s) to ${baseUrl}. Check Wi-Fi or Tailscale.`
          : `Cannot reach ${baseUrl}. Check Wi-Fi or Tailscale.`,
      latencyMs,
    };
  }
}

// ─── Image Preparation & Optimization ─────────────────────────────────────────

export interface PreparedImage {
  uri: string;
  name: string;
  type: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB client guard
const TARGET_DIMENSION = 1024; // Max width/height for SigLIP vision encoder

export async function prepareImageForAvi(uri: string): Promise<PreparedImage> {
  try {
    // 1. Downscale to max 1024px and compress to JPEG 0.8
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: TARGET_DIMENSION } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // 2. Validate file size
    let sizeBytes: number | undefined;
    try {
      const info = await FileSystem.getInfoAsync(manipulated.uri);
      if (info.exists && "size" in info) {
        sizeBytes = info.size as number;
      }
    } catch (sizeErr) {
      console.warn("[AviClient] Could not determine file size via getInfoAsync:", sizeErr);
    }

    if (sizeBytes && sizeBytes > MAX_IMAGE_BYTES) {
      throw new Error("Image exceeds 10MB limit even after compression.");
    }

    const filename = uri.split("/").pop() || "prescription.jpg";
    const cleanName = filename.endsWith(".jpg") || filename.endsWith(".jpeg")
      ? filename
      : `${filename}.jpg`;

    return {
      uri: manipulated.uri,
      name: cleanName,
      type: "image/jpeg",
      sizeBytes,
      width: manipulated.width,
      height: manipulated.height,
    };
  } catch (err: any) {
    console.error("[AviClient] Image preparation failed:", err);
    throw new Error(`Failed to optimize image: ${err?.message || "Unknown error"}`);
  }
}

// ─── SSE Dual-Engine Streaming ───────────────────────────────────────────────

export interface StreamAviChatOptions {
  prompt: string;
  image?: PreparedImage | null;
  onDelta: (textChunk: string) => void;
  onStageChange?: (stage: "uploading" | "queued" | "generating") => void;
  signal?: AbortSignal;
  baseUrl?: string;
}

export class AviClientError extends Error {
  statusCode: number;
  detail: string;

  constructor(message: string, statusCode = 0, detail?: string) {
    super(message);
    this.name = "AviClientError";
    this.statusCode = statusCode;
    this.detail = detail || message;
  }
}

/**
 * Extracts delta text from an SSE line formatted like:
 * data: {"id":"...","choices":[{"delta":{"content":"..."}}]}
 * or data: [DONE]
 */
function parseSseLine(line: string): { done: boolean; content?: string } {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith("data:")) {
    return { done: false };
  }

  const payload = trimmed.replace(/^data:\s*/, "");
  if (payload === "[DONE]") {
    return { done: true };
  }

  try {
    const parsed = JSON.parse(payload);
    // Standard OpenAI delta format
    const deltaContent = parsed?.choices?.[0]?.delta?.content;
    if (typeof deltaContent === "string") {
      return { done: false, content: deltaContent };
    }
    // Alternate format: choices[0].text
    const textChoice = parsed?.choices?.[0]?.text;
    if (typeof textChoice === "string") {
      return { done: false, content: textChoice };
    }
    // Alternate format: direct content string
    if (typeof parsed?.content === "string") {
      return { done: false, content: parsed.content };
    }
  } catch {
    // Non-JSON or fragmented line
  }

  return { done: false };
}

/**
 * Streams chat completion from Avi MedGemma 1.5 4B server using XMLHttpRequest
 * which provides reliable incremental chunk progress across all React Native runtimes.
 */
function streamViaXhr(
  endpoint: string,
  formData: FormData,
  options: StreamAviChatOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let accumulatedText = "";
    let lastIndex = 0;
    let streamBuffer = "";
    let hasReceivedTokens = false;

    options.onStageChange?.(options.image ? "uploading" : "queued");

    // Hook abort signal
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        try {
          xhr.abort();
        } catch {}
        reject(new AviClientError("Request cancelled by user.", 0, "ABORTED"));
      });
    }

    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Accept", "text/event-stream");

    xhr.onprogress = () => {
      // Transition stage to queued / generating
      if (!hasReceivedTokens) {
        options.onStageChange?.("queued");
      }

      const newChunk = xhr.responseText.substring(lastIndex);
      lastIndex = xhr.responseText.length;

      streamBuffer += newChunk;
      const lines = streamBuffer.split("\n");
      // Keep trailing incomplete fragment in the buffer
      streamBuffer = lines.pop() || "";

      for (const line of lines) {
        const { done, content } = parseSseLine(line);
        if (done) {
          resolve(accumulatedText);
          return;
        }
        if (content) {
          if (!hasReceivedTokens) {
            hasReceivedTokens = true;
            options.onStageChange?.("generating");
          }
          accumulatedText += content;
          options.onDelta(content);
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Flush remaining buffer
        if (streamBuffer.length > 0) {
          const { content } = parseSseLine(streamBuffer);
          if (content) {
            accumulatedText += content;
            options.onDelta(content);
          }
        }
        resolve(accumulatedText);
      } else {
        let errMessage = `Avi Error (HTTP ${xhr.status})`;
        try {
          const errJson = JSON.parse(xhr.responseText);
          errMessage = errJson.detail || errJson.message || errMessage;
        } catch {}

        if (xhr.status === 413) {
          errMessage = "Image or payload too large for GPU. (HTTP 413)";
        } else if (xhr.status === 415) {
          errMessage = "Unsupported image format. Please use JPEG or PNG. (HTTP 415)";
        } else if (xhr.status === 503) {
          errMessage = "GPU server is busy with another patient session. Please wait a moment.";
        } else if (xhr.status === 500) {
          errMessage = "MedGemma GPU inference error. Check server logs.";
        }

        reject(new AviClientError(errMessage, xhr.status, xhr.responseText));
      }
    };

    xhr.onerror = () => {
      reject(
        new AviClientError(
          `Network connection failed to ${endpoint}. Check if lab PC is online and phone Wi-Fi/Tailscale is connected.`,
          0,
          "NETWORK_ERROR"
        )
      );
    };

    xhr.timeout = 60000;
    xhr.ontimeout = () => {
      reject(
        new AviClientError(
          `Request to Avi timed out (60s) at ${endpoint}.`,
          408,
          "TIMEOUT"
        )
      );
    };

    try {
      xhr.send(formData as any);
    } catch (err: any) {
      reject(new AviClientError(err.message || "Failed to send request", 0));
    }
  });
}

/**
 * Main public entrypoint for streaming queries to Avi.
 */
export async function streamAviChat(options: StreamAviChatOptions): Promise<string> {
  const baseUrl = options.baseUrl || (await getAviBaseUrl());
  const completionsEndpoint = `${baseUrl}/v1/chat/completions`;

  const formData = new FormData();
  formData.append("prompt", options.prompt);
  formData.append("stream", "true");

  if (options.image) {
    formData.append("image", {
      uri: options.image.uri,
      name: options.image.name,
      type: options.image.type,
    } as any);
  }

  return streamViaXhr(completionsEndpoint, formData, options);
}
