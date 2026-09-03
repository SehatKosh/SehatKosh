"use client";

import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ConsentCountdownProps {
  expiresAt: string;
  className?: string;
}

export function ConsentCountdown({ expiresAt, className }: ConsentCountdownProps) {
  const [remainingMs, setRemainingMs] = useState(() => {
    return new Date(expiresAt).getTime() - Date.now();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(ms);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const isExpired = remainingMs <= 0;
  const isWarning = !isExpired && remainingMs < 2 * 60 * 60 * 1000; // < 2 hours

  if (isExpired) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-md px-2.5 py-1 text-xs font-semibold text-red-700",
          className
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Access Expired</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border",
        isWarning
          ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-green-50 border-green-200 text-green-700",
        className
      )}
    >
      <Clock className={cn("h-3.5 w-3.5", isWarning ? "animate-pulse" : "")} />
      <span>Access Active: {formatDuration(remainingMs)} remaining</span>
    </div>
  );
}
