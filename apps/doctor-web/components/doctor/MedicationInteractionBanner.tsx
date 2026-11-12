"use client";

import React from "react";
import { AlertOctagon, ShieldAlert } from "lucide-react";
import type { InteractionAlert } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface MedicationInteractionBannerProps {
  alerts: InteractionAlert[];
  overrideConfirmed?: boolean;
  onOverrideChange?: (confirmed: boolean) => void;
  showOverrideCheckbox?: boolean;
  className?: string;
}

export function MedicationInteractionBanner({
  alerts,
  overrideConfirmed = false,
  onOverrideChange,
  showOverrideCheckbox = true,
  className,
}: MedicationInteractionBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL").length;

  return (
    <div
      role="alert"
      className={cn(
        "p-4 rounded-xl border border-red-300 bg-red-50 text-red-950 shadow-sm transition-all",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-100 rounded-lg text-red-700 shrink-0">
          <AlertOctagon className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-red-900 text-sm">
              Clinical Safety Contraindication ({alerts.length} Detected)
            </h4>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-red-600 text-white rounded-md tracking-wider uppercase">
                {criticalCount} Critical
              </span>
            )}
          </div>
          <p className="text-xs text-red-800 mb-3 leading-relaxed">
            The safety engine detected drug interactions or allergy cross-sensitivities. Finalization requires clinical review or explicit override.
          </p>

          <div className="space-y-2 mb-3">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-white/80 border border-red-200 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-red-950 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    {alert.trigger}
                  </span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                      alert.severity === "CRITICAL"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed pl-5">
                  {alert.detail}
                </p>
              </div>
            ))}
          </div>

          {showOverrideCheckbox && onOverrideChange && (
            <div className="pt-2 border-t border-red-200/80 flex items-center gap-2.5">
              <input
                type="checkbox"
                id="clinical-override-ack"
                checked={overrideConfirmed}
                onChange={(e) => onOverrideChange(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500 cursor-pointer"
              />
              <label
                htmlFor="clinical-override-ack"
                className="text-xs font-medium text-red-900 cursor-pointer select-none"
              >
                I acknowledge these contraindications and certify clinical necessity to prescribe despite risk.
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MedicationInteractionBanner;

