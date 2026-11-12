"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCode,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Building2,
  Database,
  FileText,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ToastProvider";
import {
  getStagingRecords,
  promoteStagingRecord,
  rejectStagingRecord,
  type StagingRecord,
} from "@/lib/api-client";

export default function HospitalAdminIngestPage() {
  const { showToast } = useToast();
  const [records, setRecords] = useState<StagingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Promote in-flight state
  const [promotingId, setPromotingId] = useState<string | null>(null);

  // Reject dialog state
  const [rejectingRecord, setRejectingRecord] = useState<StagingRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await getStagingRecords();
      setRecords(data);
    } catch (err: any) {
      showToast(err?.message || "Failed to load staging records", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handlePromote = async (record: StagingRecord) => {
    setPromotingId(record.id);
    try {
      // Default to seeded PIMS patient if none explicitly specified in raw payload
      const targetPatientId =
        record.raw_payload?.patient_id || "33333333-3333-3333-3333-333333333331";

      const res = await promoteStagingRecord(record.id, {
        patient_id: targetPatientId,
        encounter_date: new Date().toISOString().split("T")[0],
      });

      if (res.success) {
        showToast(`Record ${record.id.slice(0, 8)} successfully promoted to EMR.`, "success");
        await fetchRecords();
      } else {
        throw new Error(res.error || "Promotion failed.");
      }
    } catch (err: any) {
      showToast(err?.message || "Promotion rejected", "error");
    } finally {
      setPromotingId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRecord || !rejectReason.trim()) return;

    setIsRejecting(true);
    try {
      const res = await rejectStagingRecord(rejectingRecord.id, rejectReason.trim());
      if (res.success) {
        showToast(`Record ${rejectingRecord.id.slice(0, 8)} rejected.`, "error");
        setRejectingRecord(null);
        setRejectReason("");
        await fetchRecords();
      } else {
        throw new Error(res.error || "Rejection failed");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to reject record", "error");
    } finally {
      setIsRejecting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (filter === "ALL") return true;
    return r.status === filter;
  });

  const getAdapterBadge = (adapter: string) => {
    switch (adapter.toLowerCase()) {
      case "external_fhir":
        return { label: "FHIR R4 Bundle", class: "bg-blue-50 text-blue-700 border-blue-200" };
      case "legacy_csv":
        return { label: "Legacy CSV Import", class: "bg-purple-50 text-purple-700 border-purple-200" };
      case "pdf_lab":
        return { label: "PDF Lab Vision", class: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      default:
        return { label: adapter.toUpperCase(), class: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case "QUARANTINED":
        return {
          label: "Quarantined",
          class: "bg-amber-100 text-amber-800 border-amber-300",
          icon: ShieldAlert,
        };
      case "VALIDATION_FAILED":
        return {
          label: "Validation Failed",
          class: "bg-red-100 text-red-800 border-red-300",
          icon: AlertTriangle,
        };
      case "PROMOTED":
        return {
          label: "Promoted to EMR",
          class: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: CheckCircle2,
        };
      case "REJECTED":
      default:
        return {
          label: "Rejected",
          class: "bg-slate-100 text-slate-700 border-slate-300",
          icon: XCircle,
        };
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Database className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Quarantine Ingestion Review Queue</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Hospital Administration · Safe Ingestion Gate for External Hospital FHIR, CSV & Lab PDF Feeds
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Building2 className="w-3.5 h-3.5" />
            PIMS Islamabad
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={fetchRecords}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-white shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Ingested
          </span>
          <span className="text-2xl font-bold font-clinical text-foreground">{records.length}</span>
        </div>
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Quarantined (Review Needed)
          </span>
          <span className="text-2xl font-bold font-clinical text-amber-900">
            {records.filter((r) => r.status === "QUARANTINED").length}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">
            Validation Failed
          </span>
          <span className="text-2xl font-bold font-clinical text-red-900">
            {records.filter((r) => r.status === "VALIDATION_FAILED").length}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Promoted to EMR
          </span>
          <span className="text-2xl font-bold font-clinical text-emerald-900">
            {records.filter((r) => r.status === "PROMOTED").length}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2">
        {["ALL", "QUARANTINED", "VALIDATION_FAILED", "PROMOTED", "REJECTED"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === tab
                ? "bg-primary text-white shadow-xs"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Records Queue List */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs">Loading staging records from PostgreSQL...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-white border border-border rounded-xl">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No records found</p>
          <p className="text-xs text-slate-400">There are no staging records matching the selected status filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const adapterBadge = getAdapterBadge(record.adapter_name);
            const statusPill = getStatusPill(record.status);
            const StatusIcon = statusPill.icon;
            const isExpanded = expandedId === record.id;
            const isPromoting = promotingId === record.id;

            return (
              <div
                key={record.id}
                className="bg-white border border-border rounded-xl p-4 transition-all shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${adapterBadge.class}`}>
                        {adapterBadge.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusPill.class}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusPill.label}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        ID: {record.id.slice(0, 8)}...
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Received: <strong className="text-foreground">{new Date(record.created_at).toLocaleString()}</strong> · Schema v{record.schema_version}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="gap-1 text-xs"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      {isExpanded ? "Hide JSON" : "Inspect FHIR"}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>

                    {record.status === "QUARANTINED" && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setRejectingRecord(record);
                            setRejectReason("");
                          }}
                          className="gap-1 text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </Button>

                        <Button
                          size="sm"
                          disabled={isPromoting}
                          onClick={() => handlePromote(record)}
                          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {isPromoting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Promoting...
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              Promote to EMR
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Validation errors warning banner */}
                {record.validation_errors && record.validation_errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      Validation Errors / Quarantine Notes:
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {record.validation_errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Collapsible JSON Viewer */}
                {isExpanded && (
                  <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                      <span>Normalized FHIR R4 Bundle Preview:</span>
                      <span>JSON / UTF-8</span>
                    </div>
                    <pre className="max-h-64 overflow-y-auto overflow-x-auto text-[11px] leading-relaxed">
                      {JSON.stringify(record.normalized_fhir_preview || record.raw_payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Record Dialog */}
      <Dialog open={Boolean(rejectingRecord)} onOpenChange={(open) => !open && setRejectingRecord(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center text-red-700">
                <XCircle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Reject Quarantined Record</h2>
                <p className="text-xs text-muted-foreground">
                  Staging ID: {rejectingRecord?.id.slice(0, 8)}...
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Mismatched patient demographic identifier, corrupted CSV format"
                className="text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectingRecord(null)}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isRejecting || !rejectReason.trim()}
                className="gap-1.5"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
