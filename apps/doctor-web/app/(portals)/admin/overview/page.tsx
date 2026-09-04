"use client";

import React from "react";
import { LayoutDashboard, Activity, ShieldOff, Users, Upload, TrendingUp } from "lucide-react";
import { MOCK_ADMIN_METRICS, MOCK_AUDIT_LOGS } from "@/lib/mockData";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  "Dossier Viewed": "bg-blue-100 text-blue-700",
  "Document Zoomed": "bg-sky-100 text-sky-700",
  "Summary Copied": "bg-violet-100 text-violet-700",
  "Break-Glass Override": "bg-red-100 text-red-700 font-bold",
  "Consent Dispatched": "bg-emerald-100 text-emerald-700",
  "Record Ingested": "bg-amber-100 text-amber-700",
};

export default function AdminOverviewPage() {
  const metrics = MOCK_ADMIN_METRICS;
  const recentActivity = [...MOCK_AUDIT_LOGS].slice(0, 6);

  const tiles = [
    {
      label: "Active Sessions",
      value: metrics.activeSessions,
      icon: Activity,
      bg: "bg-blue-50 border-blue-200",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      pulse: false,
    },
    {
      label: "Registered Patients",
      value: metrics.registeredPatients.toLocaleString(),
      icon: Users,
      bg: "bg-violet-50 border-violet-200",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      pulse: false,
    },
    {
      label: "Break-Glass Today",
      value: metrics.breakGlassToday,
      icon: ShieldOff,
      bg: metrics.breakGlassToday > 0 ? "bg-red-50 border-red-300" : "bg-slate-50 border-border",
      iconBg: metrics.breakGlassToday > 0 ? "bg-red-100" : "bg-slate-100",
      iconColor: metrics.breakGlassToday > 0 ? "text-red-600" : "text-slate-400",
      pulse: metrics.breakGlassToday > 0,
    },
    {
      label: "Ingest Queue",
      value: metrics.ingestQueue,
      icon: Upload,
      bg: "bg-amber-50 border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      pulse: false,
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <LayoutDashboard className="h-4 w-4 text-violet-700" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Operational Dashboard</h1>
        </div>
        <p className="text-xs text-muted-foreground">Shifa International Hospital · System Administrator</p>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className={cn("rounded-2xl border p-5 flex flex-col gap-3", tile.bg)}>
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center relative", tile.iconBg)}>
                <Icon className={cn("h-5 w-5", tile.iconColor)} />
                {tile.pulse && (
                  <span className="absolute -top-1 -right-1 h-3 w-3">
                    <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative block h-3 w-3 rounded-full bg-red-500" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{tile.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tile.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Recent Facility Activity
          </h2>
          <a href="/admin/audit-logs" className="text-xs text-primary hover:underline">View full log →</a>
        </div>
        <div className="space-y-2">
          {recentActivity.map((log) => (
            <div
              key={log.id}
              className={cn(
                "bg-white border rounded-xl px-4 py-3 flex items-center gap-4",
                log.severity === "high" ? "border-red-200 bg-red-50/40" : "border-border"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{log.physicianName}</span>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-600")}>
                    {log.action}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Patient MRN: <span className="font-clinical">{log.patientMrn}</span> · IP: {log.ipAddress}
                </p>
              </div>
              <p className="text-[11px] font-clinical text-muted-foreground shrink-0">{formatDateTime(log.timestamp)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
