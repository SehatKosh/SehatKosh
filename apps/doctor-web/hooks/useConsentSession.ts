"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDuration } from "@/lib/utils";

interface ConsentSession {
  isExpired: boolean;
  remainingMs: number;
  formatted: string;
  isWarning: boolean;
}

/**
 * Monitors a consent session's expiry time.
 * Updates every second and signals when the session expires.
 *
 * @param expiresAt ISO date string for when access expires
 * @param onExpire optional callback invoked when the session first expires
 */
export function useConsentSession(
  expiresAt: string | undefined,
  onExpire?: () => void
): ConsentSession {
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (!expiresAt) return 0;
    return new Date(expiresAt).getTime() - Date.now();
  });

  const [hasExpiredFired, setHasExpiredFired] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(ms);

      if (ms <= 0 && !hasExpiredFired) {
        setHasExpiredFired(true);
        onExpire?.();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire, hasExpiredFired]);

  const isExpired = remainingMs <= 0;
  const isWarning = !isExpired && remainingMs < 2 * 60 * 60 * 1000;

  return {
    isExpired,
    remainingMs: Math.max(0, remainingMs),
    formatted: isExpired ? "Expired" : formatDuration(remainingMs),
    isWarning,
  };
}
