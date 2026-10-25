"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ScrollText, Search, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAuditLogs, type AuditLogEntry } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  "Dossier Viewed": "bg-blue-100 text-blue-700",
  DOSSIER_VIEW: "bg-blue-100 text-blue-700",
  "Document Zoomed": "bg-sky-100 text-sky-700",
  "Summary Copied": "bg-violet-100 text-violet-700",
  "Break-Glass Override": "bg-red-100 text-red-700",
  BREAK_GLASS_OVERRIDE: "bg-red-100 text-red-700",
  "Consent Dispatched": "bg-emerald-100 text-emerald-700",
  CONSENT_DISPATCH: "bg-emerald-100 text-emerald-700",
  "Record Ingested": "bg-amber-100 text-amber-700",
  ENCOUNTER_CREATE: "bg-amber-100 text-amber-700",
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchAuditLogs()
      .then((data) => {
        if (isMounted) {
          setLogs(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Failed to load audit logs:", err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        const pId = l.actor_id || l.physicianName || "";
        const pName = l.physicianName || l.actor_id || "";
        const mrn = l.patientMrn || l.patient_id || "";
        const action = l.action || l.action_type || "";
        return (
          pId.toLowerCase().includes(search.toLowerCase()) ||
          pName.toLowerCase().includes(search.toLowerCase()) ||
          mrn.toLowerCase().includes(search.toLowerCase()) ||
          action.toLowerCase().includes(search.toLowerCase())
        );
      }),
    [logs, search]
  );

  const handleExportCsv = () => {
    const header = [
      "Timestamp",
      "Actor",
      "Patient ID / MRN",
      "Action",
      "Severity",
      "IP Address",
    ];
    const rows = filtered.map((l) =>
      [
        l.timestamp,
        l.physicianName || l.actor_id,
        l.patientMrn || l.patient_id || "N/A",
        l.action || l.action_type,
        l.severity,
        l.ip_address || "127.0.0.1",
      ].join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <ScrollText className="h-4 w-4 text-slate-700" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              HIPAA & Access Compliance Ledger
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Immutable record of all clinical access events · {filtered.length}{" "}
            record{filtered.length !== 1 ? "s" : ""} shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by Actor, Patient ID, or Action..."
              className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
              id="audit-search"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={handleExportCsv}
            id="export-csv-btn"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-border">
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">
                  Timestamp
                </th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">
                  Actor / Physician
                </th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">
                  Patient MRN / ID
                </th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">
                  Action
                </th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">
                  Severity
                </th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Fetching audit logs from database...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    No records match your filter.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((log) => {
                  const displayAction = log.action || log.action_type;
                  const isCritical =
                    log.severity === "CRITICAL" || log.severity === "high";

                  return (
                    <tr
                      key={log.id}
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors",
                        isCritical && "bg-red-50/40"
                      )}
                    >
                      <td className="px-4 py-3 font-clinical text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">
                          {log.physicianName || log.actor_id}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-clinical font-semibold text-primary">
                        {log.patientMrn || log.patient_id || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold",
                            ACTION_COLORS[displayAction] ?? "bg-slate-100 text-slate-600"
                          )}
                        >
                          {displayAction}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-semibold",
                            isCritical
                              ? "bg-red-100 text-red-700 font-bold"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-clinical text-muted-foreground">
                        {log.ip_address || "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
