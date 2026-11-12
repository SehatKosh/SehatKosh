"use client";

import React from "react";
import { Activity, Heart, Thermometer, Wind, Brain, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VitalsSnapshot {
  systolic_bp?: number;
  bp_systolic?: number;
  diastolic_bp?: number;
  bp_diastolic?: number;
  heart_rate?: number;
  pulse?: number;
  spo2?: number;
  temperature_f?: number;
  temperature?: number;
  respiratory_rate?: number;
  gcs?: number;
}

interface TriageVitalsCardProps {
  vitals?: VitalsSnapshot | null;
  priority?: string;
  admittedAt?: string;
  className?: string;
}

export function TriageVitalsCard({
  vitals,
  priority = "ROUTINE",
  admittedAt,
  className,
}: TriageVitalsCardProps) {
  if (!vitals || Object.keys(vitals).length === 0) {
    return (
      <div className={cn("p-4 border rounded-xl bg-slate-50 text-slate-500 text-sm", className)}>
        No intake vital signs recorded for this encounter.
      </div>
    );
  }

  const sysBp = vitals.systolic_bp ?? vitals.bp_systolic;
  const diaBp = vitals.diastolic_bp ?? vitals.bp_diastolic;
  const hr = vitals.heart_rate ?? vitals.pulse;
  const spo2 = vitals.spo2;
  const temp = vitals.temperature_f ?? vitals.temperature;
  const rr = vitals.respiratory_rate;
  const gcs = vitals.gcs;

  const getPriorityStyle = () => {
    switch (priority) {
      case "CRITICAL_RESUSCITATION":
        return {
          bg: "bg-red-500",
          border: "border-red-200",
          text: "text-red-700",
          badgeBg: "bg-red-100",
          label: "CRITICAL RESUSCITATION",
        };
      case "URGENT":
        return {
          bg: "bg-amber-500",
          border: "border-amber-200",
          text: "text-amber-700",
          badgeBg: "bg-amber-100",
          label: "URGENT",
        };
      case "ROUTINE":
      default:
        return {
          bg: "bg-emerald-500",
          border: "border-emerald-200",
          text: "text-emerald-700",
          badgeBg: "bg-emerald-100",
          label: "ROUTINE",
        };
    }
  };

  const priorityStyle = getPriorityStyle();

  return (
    <div className={cn("p-5 border rounded-2xl bg-white shadow-xs", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-900 text-base">Triage Vital Signs</h3>
          {admittedAt && (
            <span className="text-xs text-slate-400">
              Recorded at {new Date(admittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
            priorityStyle.badgeBg,
            priorityStyle.text
          )}
        >
          <span className={cn("w-2 h-2 rounded-full animate-pulse", priorityStyle.bg)} />
          {priorityStyle.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {/* Blood Pressure */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>Blood Pressure</span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {sysBp && diaBp ? `${sysBp}/${diaBp}` : sysBp ? `${sysBp}/-` : "--"}
            <span className="text-[10px] text-slate-400 font-normal ml-1">mmHg</span>
          </div>
        </div>

        {/* Heart Rate / Pulse */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Activity className="w-3.5 h-3.5 text-red-500" />
            <span>Pulse</span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {hr ?? "--"}
            <span className="text-[10px] text-slate-400 font-normal ml-1">bpm</span>
          </div>
        </div>

        {/* SpO2 */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-cyan-500" />
            <span>SpO2</span>
          </div>
          <div
            className={cn(
              "text-lg font-bold",
              spo2 && spo2 < 90 ? "text-red-600" : spo2 && spo2 <= 94 ? "text-amber-600" : "text-slate-900"
            )}
          >
            {spo2 ? `${spo2}%` : "--"}
          </div>
        </div>

        {/* Temperature */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            <span>Temperature</span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {temp ? `${temp}°F` : "--"}
          </div>
        </div>

        {/* Respiratory Rate */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Wind className="w-3.5 h-3.5 text-blue-500" />
            <span>Resp Rate</span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {rr ?? "--"}
            <span className="text-[10px] text-slate-400 font-normal ml-1">/min</span>
          </div>
        </div>

        {/* GCS */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            <span>GCS</span>
          </div>
          <div className="text-lg font-bold text-slate-900">
            {gcs ? `${gcs}/15` : "--"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TriageVitalsCard;

