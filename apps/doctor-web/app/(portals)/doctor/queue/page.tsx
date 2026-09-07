"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Search,
  Clock,
  AlertCircle,
  ChevronRight,
  Activity,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_QUEUE_ITEMS, type QueueItem } from "@/lib/mockData";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<QueueItem["status"], string> = {
  waiting: "Waiting",
  in_consultation: "In Consultation",
  completed: "Completed",
};

const STATUS_COLORS: Record<QueueItem["status"], string> = {
  waiting: "bg-amber-100 text-amber-700 border-amber-200",
  in_consultation: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
};

export default function DoctorQueuePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = MOCK_QUEUE_ITEMS.filter(
    (q) =>
      q.patientName.toLowerCase().includes(search.toLowerCase()) ||
      q.patientMrn.toLowerCase().includes(search.toLowerCase()) ||
      q.chiefComplaint.toLowerCase().includes(search.toLowerCase())
  );

  const waiting = filtered.filter((q) => q.status === "waiting").length;

  return (
    <div className="p-6 space-y-5 max-w-5xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-4.5 w-4.5 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Patient Queue</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Dr. Tariq Khan · Cardiology, Shifa International ·{" "}
            <span className="font-semibold text-amber-600">{waiting} patient{waiting !== 1 ? "s" : ""} waiting</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search queue... (/)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
              id="queue-search"
            />
          </div>
        </div>
      </div>

      {/* Queue list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No patients found.</div>
        )}
        {filtered.map((item) => {
          const expiresMs = new Date(item.consentExpiresAt).getTime() - Date.now();
          const expiresLabel = formatDuration(expiresMs);
          const isExpiringSoon = expiresMs < 60 * 60 * 1000; // < 1h

          return (
            <div
              key={item.id}
              className={cn(
                "bg-white border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all duration-200",
                item.status === "in_consultation" && "border-primary/30 bg-primary/5"
              )}
            >
              {/* Queue number */}
              <div className="h-11 w-11 rounded-xl bg-slate-100 border border-border flex items-center justify-center shrink-0">
                <span className="text-lg font-black text-foreground font-clinical">
                  {item.queueNumber}
                </span>
              </div>

              {/* Patient info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">{item.patientName}</span>
                  <span className="text-[11px] font-clinical text-muted-foreground">{item.patientMrn}</span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUS_COLORS[item.status])}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Chief Complaint: {item.chiefComplaint}
                </p>
              </div>

              {/* Wait time */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Clock className="h-3.5 w-3.5" />
                <span>{item.waitMinutes}m wait</span>
              </div>

              {/* Consent timer */}
              <div
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border shrink-0",
                  isExpiringSoon
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-slate-50 border-border text-muted-foreground"
                )}
              >
                <Activity className="h-3 w-3" />
                <span className="font-clinical">{expiresLabel}</span>
              </div>

              {/* CTA */}
              <Button
                size="sm"
                className="gap-1.5 text-xs shrink-0"
                disabled={item.status === "completed"}
                onClick={() => router.push(`/doctor/patients/${item.patientId}`)}
                id={`start-consult-${item.id}`}
              >
                Start Consultation
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
