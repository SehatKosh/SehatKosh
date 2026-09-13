"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Activity, ShieldOff, Users, TrendingUp,
  Hospital, Globe, ShieldCheck, DatabaseZap, ChevronRight,
} from "lucide-react";
import {
  MOCK_SUPER_ADMIN_METRICS,
  MOCK_AUDIT_LOGS,
  MOCK_HOSPITAL_LICENSES,
  MOCK_QUORUM_ACTIONS,
} from "@/lib/mockData";
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

export default function SuperAdminOverviewPage() {
  const metrics = MOCK_SUPER_ADMIN_METRICS;
  const recentActivity = [...MOCK_AUDIT_LOGS].slice(0, 5);
  const pendingLicenses = MOCK_HOSPITAL_LICENSES.filter((h) => h.status === "pending");
  const openQuorum = MOCK_QUORUM_ACTIONS.filter((q) => q.status === "pending");

  const tiles = [
    {
      label: "Connected Hospitals",
      value: metrics.connectedHospitals,
      icon: Hospital,
      bg: "bg-indigo-50 border-indigo-200",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
      pulse: false,
      href: "/admin/hospitals",
    },
    {
      label: "Registered Physicians",
      value: metrics.registeredPhysicians,
      icon: Users,
      bg: "bg-violet-50 border-violet-200",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      pulse: false,
      href: null,
    },
    {
      label: "Active Patient Consents",
      value: metrics.activeConsents.toLocaleString(),
      icon: Activity,
      bg: "bg-blue-50 border-blue-200",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      pulse: false,
      href: null,
    },
    {
      label: "Research Exports Issued",
      value: metrics.researchExportsIssued,
      icon: DatabaseZap,
      bg: "bg-emerald-50 border-emerald-200",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      pulse: false,
      href: "/admin/anonymize",
    },
    {
      label: "Pending License Requests",
      value: metrics.pendingLicenseRequests,
      icon: Globe,
      bg: metrics.pendingLicenseRequests > 0 ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-border",
      iconBg: metrics.pendingLicenseRequests > 0 ? "bg-amber-100" : "bg-slate-100",
      iconColor: metrics.pendingLicenseRequests > 0 ? "text-amber-600" : "text-slate-400",
      pulse: metrics.pendingLicenseRequests > 0,
      href: "/admin/hospitals",
    },
    {
      label: "Open Quorum Actions",
      value: metrics.quorumActionsOpen,
      icon: ShieldOff,
      bg: metrics.quorumActionsOpen > 0 ? "bg-red-50 border-red-300" : "bg-slate-50 border-border",
      iconBg: metrics.quorumActionsOpen > 0 ? "bg-red-100" : "bg-slate-100",
      iconColor: metrics.quorumActionsOpen > 0 ? "text-red-600" : "text-slate-400",
      pulse: metrics.quorumActionsOpen > 0,
      href: "/admin/quorum",
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
          <h1 className="text-xl font-bold text-foreground">Platform Overview Matrix</h1>
        </div>
        <p className="text-xs text-muted-foreground">SehatKosh · Super Admin · Platform Engineering & Governance</p>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const inner = (
            <div className={cn("rounded-2xl border p-5 flex flex-col gap-3", tile.bg, tile.href && "hover:shadow-md cursor-pointer transition-shadow")}>
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
          return tile.href ? (
            <Link key={tile.label} href={tile.href} id={`metric-tile-${tile.label.replace(/\s/g, "-").toLowerCase()}`}>
              {inner}
            </Link>
          ) : (
            <div key={tile.label}>{inner}</div>
          );
        })}
      </div>

      {/* Pending Licenses + Open Quorum — 2 col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Licenses */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Pending Hospital Applications
            </h2>
            <Link href="/admin/hospitals" className="text-xs text-primary hover:underline" id="view-all-licenses">View all →</Link>
          </div>
          <div className="space-y-2">
            {pendingLicenses.slice(0, 3).map((h) => (
              <div key={h.id} className="bg-white border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Hospital className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{h.hospitalName}</p>
                  <p className="text-[10px] text-muted-foreground">{h.city}, {h.province} · {h.bedCount} beds · {h.type}</p>
                </div>
                <Link href="/admin/hospitals" className="text-[10px] font-semibold text-amber-600 hover:text-amber-700 shrink-0" id={`review-lic-${h.id}`}>Review →</Link>
              </div>
            ))}
            {pendingLicenses.length === 0 && (
              <div className="bg-white border border-border rounded-xl px-4 py-6 text-center text-xs text-muted-foreground">No pending applications.</div>
            )}
          </div>
        </div>

        {/* Open Quorum */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Open Quorum Actions
            </h2>
            <Link href="/admin/quorum" className="text-xs text-primary hover:underline" id="view-all-quorum">View all →</Link>
          </div>
          <div className="space-y-2">
            {openQuorum.map((q) => (
              <div key={q.id} className="bg-white border border-red-200 bg-red-50/30 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {q.severity.toUpperCase()}
                  </span>
                  <p className="text-xs font-semibold text-foreground truncate flex-1">{q.title}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sign-offs: <span className="font-clinical font-semibold text-foreground">{q.signoffs.length} of {q.requiredSignoffs}</span> — Awaiting co-admin confirmation
                </p>
                <Link href="/admin/quorum" className="text-[10px] text-red-600 hover:underline mt-1 inline-block" id={`quorum-action-${q.id}`}>
                  View & Co-Sign →
                </Link>
              </div>
            ))}
            {openQuorum.length === 0 && (
              <div className="bg-white border border-border rounded-xl px-4 py-6 text-center text-xs text-muted-foreground">No open quorum actions.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Recent Platform Activity
          </h2>
          <Link href="/admin/audit-logs" className="text-xs text-primary hover:underline" id="view-full-log">View full log →</Link>
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
