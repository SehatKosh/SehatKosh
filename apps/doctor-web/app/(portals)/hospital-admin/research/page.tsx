"use client";

import React, { useState } from "react";
import {
  FileArchive, CheckCircle2, XCircle, Clock, ChevronRight, Send, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_CLEARINGHOUSE_REQUESTS, type ResearchClearinghouseRequest } from "@/lib/mockData";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ResearchClearinghouseRequest["status"], string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  forwarded: "bg-blue-100 text-blue-700 border-blue-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<ResearchClearinghouseRequest["status"], string> = {
  pending: "Pending Review",
  forwarded: "Forwarded to Super Admin",
  rejected: "Rejected",
};

export default function ResearchClearinghousePage() {
  const [requests, setRequests] = useState<ResearchClearinghouseRequest[]>(MOCK_CLEARINGHOUSE_REQUESTS);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleForward = (id: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "forwarded" as const } : r));
    showToast("Request forwarded to Super Admin for anonymization approval.", "success");
  };

  const handleReject = (id: string) => {
    const req = requests.find((r) => r.id === id);
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" as const } : r));
    showToast(`Request from ${req?.requestingDoctor ?? "doctor"} rejected.`, "error");
  };

  const pending = requests.filter((r) => r.status === "pending");
  const processed = requests.filter((r) => r.status !== "pending");

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all",
          toast.type === "success"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        )}>
          {toast.type === "success"
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <XCircle className="h-4 w-4 text-red-600" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <FileArchive className="h-4 w-4 text-amber-700" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Research & Case Study Clearinghouse</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Review anonymous case study requests submitted by hospital doctors. Approve to relay to Super Admin for anonymization.
        </p>
      </div>

      {/* Workflow explainer */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <BookOpen className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 space-y-0.5">
          <p className="font-bold">Clearinghouse Workflow</p>
          <p>
            Doctors submit anonymized case study requests → Hospital Admin reviews & forwards → Super Admin runs PII stripping
            pipeline → Sanitized FHIR R4 dataset issued to requesting physician.
          </p>
        </div>
      </div>

      {/* Pending Requests */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          Pending Review ({pending.length})
        </h2>
        {pending.length === 0 && (
          <div className="bg-white border border-border rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            No pending requests. Clearinghouse is clear.
          </div>
        )}
        <div className="space-y-4">
          {pending.map((req) => (
            <div key={req.id} className="bg-white border border-amber-200 rounded-2xl p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-foreground font-clinical">{req.caseRef}</h3>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUS_STYLES[req.status])}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {req.requestingDoctor} · {req.department} · Submitted {formatDateTime(req.submittedAt)}
                  </p>
                </div>
              </div>

              {/* Case details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Condition</p>
                  <p className="font-semibold text-foreground">{req.condition}</p>
                  <p className="text-muted-foreground">Age range: {req.patientAgeRange}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Research Purpose</p>
                  <p className="text-muted-foreground leading-relaxed">{req.purpose}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="flex-1 gap-2 text-xs bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleForward(req.id)}
                  id={`forward-req-${req.id}`}
                >
                  <Send className="h-3.5 w-3.5" />
                  Approve & Forward to Super Admin
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 gap-2 text-xs"
                  onClick={() => handleReject(req.id)}
                  id={`reject-req-${req.id}`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject Request
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Processed Requests */}
      {processed.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">Processed Requests ({processed.length})</h2>
          <div className="space-y-2">
            {processed.map((req) => (
              <div key={req.id} className="bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                  req.status === "forwarded" ? "bg-blue-100" : "bg-red-100")}>
                  {req.status === "forwarded"
                    ? <Send className="h-4 w-4 text-blue-600" />
                    : <XCircle className="h-4 w-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-foreground font-clinical">{req.caseRef}</p>
                    <p className="text-xs text-muted-foreground">— {req.requestingDoctor}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{req.condition} · {formatDateTime(req.submittedAt)}</p>
                </div>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUS_STYLES[req.status])}>
                  {STATUS_LABELS[req.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
