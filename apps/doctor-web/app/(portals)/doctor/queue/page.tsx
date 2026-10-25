"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Search,
  ChevronRight,
  KeyRound,
  History,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchDoctorQueue } from "@/lib/api-client";
import { MOCK_PATIENTS, type QueueItem, type Patient } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ToastProvider";
import { RequestAccessModal } from "@/components/RequestAccessModal";

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

const DEFAULT_PHYSICIAN_ID = "11111111-1111-1111-1111-111111111111";

export default function DoctorQueuePage() {
  const router = useRouter();
  const { showToast, safeExecute } = useToast();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedPatientForAccess, setSelectedPatientForAccess] = useState<Patient | undefined>();

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchDoctorQueue(DEFAULT_PHYSICIAN_ID);
      setQueueItems(items);
    } catch (err: any) {
      console.error("Failed to load doctor queue:", err);
      setError("Unable to synchronize consultation queue with server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const filtered = queueItems.filter(
    (q) =>
      q.patientName.toLowerCase().includes(search.toLowerCase()) ||
      q.patientMrn.toLowerCase().includes(search.toLowerCase()) ||
      q.chiefComplaint.toLowerCase().includes(search.toLowerCase())
  );

  const waiting = filtered.filter((q) => q.status === "waiting").length;

  const handlePatientAction = (item: QueueItem, targetPatient?: Patient) => {
    safeExecute(async () => {
      // Determine action type based on status and consent
      if (item.status === "completed") {
        showToast(`Opening medical history for ${item.patientName}...`, "info");
        router.push(`/doctor/patients/${item.patientId}`);
        return;
      }

      if (targetPatient && (targetPatient.accessStatus === "pending" || targetPatient.accessStatus === "expired")) {
        setSelectedPatientForAccess(targetPatient);
        setRequestModalOpen(true);
        showToast(`Initiating access request for ${item.patientName}...`, "info");
        return;
      }

      showToast(`Starting consultation session for ${item.patientName}...`, "success");
      router.push(`/doctor/patients/${item.patientId}`);
    }, "Failed to initiate patient action");
  };

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
            <span className="font-semibold text-amber-600">
              {waiting} patient{waiting !== 1 ? "s" : ""} waiting
            </span>
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
              className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-52 font-medium"
              id="queue-search"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadQueue}
            disabled={loading}
            className="text-xs gap-1.5"
            title="Refresh Queue"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="ghost" onClick={loadQueue} className="text-xs underline text-red-800">
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-border rounded-xl p-4 flex items-center gap-4 animate-pulse"
            >
              <div className="h-11 w-11 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="h-8 w-28 bg-slate-200 rounded shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Queue list */}
      {!loading && (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white border border-dashed border-border rounded-2xl p-8 space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div className="text-foreground font-semibold text-sm">
                No patients currently waiting in your consultation queue.
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                New patients checked in by the registrar will automatically appear here once consent is granted.
              </p>
              <Button size="sm" variant="outline" onClick={loadQueue} className="text-xs gap-1.5 mt-2">
                <RefreshCw className="h-3 w-3" />
                <span>Refresh Queue</span>
              </Button>
            </div>
          )}

          {filtered.map((item) => {
            const patientObj = MOCK_PATIENTS.find((p) => p.id === item.patientId);
            const needsAccess =
              patientObj &&
              (patientObj.accessStatus === "pending" || patientObj.accessStatus === "expired");
            const isCompleted = item.status === "completed";

            // Dynamic CTA configuration
            let ctaText = "Start Consultation";
            let ctaIcon = <ChevronRight className="h-3.5 w-3.5" />;
            let ctaVariant: "default" | "secondary" | "outline" = "default";

            if (isCompleted) {
              ctaText = "View History";
              ctaIcon = <History className="h-3.5 w-3.5" />;
              ctaVariant = "outline";
            } else if (needsAccess) {
              ctaText = "Get Access";
              ctaIcon = <KeyRound className="h-3.5 w-3.5" />;
              ctaVariant = "secondary";
            }

            return (
              <div
                key={item.id}
                className={cn(
                  "bg-white border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all duration-200",
                  item.status === "in_consultation" && "border-primary/30 bg-primary/5 shadow-sm",
                  item.is_break_glass && "border-red-200 bg-red-50/30"
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
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        STATUS_COLORS[item.status]
                      )}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                    {item.is_break_glass && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-300 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>EMERGENCY BREAK-GLASS</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Chief Complaint: {item.chiefComplaint}
                  </p>
                </div>

                {/* CTA Button with Dynamic Label & Safe Handler */}
                <Button
                  size="sm"
                  variant={ctaVariant}
                  className={cn(
                    "gap-1.5 text-xs shrink-0 font-medium transition-all",
                    needsAccess && "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm",
                    !needsAccess && !isCompleted && "bg-primary text-white shadow-sm"
                  )}
                  onClick={() => handlePatientAction(item, patientObj)}
                  id={`queue-action-${item.id}`}
                >
                  <span>{ctaText}</span>
                  {ctaIcon}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Access Modal Integration */}
      <RequestAccessModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        preselectedPatient={selectedPatientForAccess}
      />
    </div>
  );
}
