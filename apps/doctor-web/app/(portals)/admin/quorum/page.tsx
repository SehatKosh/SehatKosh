"use client";

import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Clock, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_QUORUM_ACTIONS, type QuorumAction } from "@/lib/mockData";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function QuorumSecurityPage() {
  const [actions, setActions] = useState<QuorumAction[]>(MOCK_QUORUM_ACTIONS);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleCoSign = (id: string) => {
    setActions((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              signoffs: [...a.signoffs, "Super Admin (Session: SA-003 — Co-Signer)"],
              status: "confirmed" as const,
            }
          : a
      )
    );
    setConfirmingId(null);
    showToast("Quorum confirmed. Action has been authorized and queued for execution.");
  };

  const handleCancel = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" as const } : a))
    );
    setConfirmingId(null);
    showToast("Quorum action cancelled. No changes were made.");
  };

  const pending = actions.filter((a) => a.status === "pending");
  const historical = actions.filter((a) => a.status !== "pending");

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border bg-slate-900 border-slate-700 text-white text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-red-700" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Multi-Admin Quorum Security</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Destructive platform actions require cryptographic sign-off from 2 of 3 Super Admins before execution.
        </p>
      </div>

      {/* Protocol explainer */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div className="text-xs text-red-800 space-y-1">
          <p className="font-bold">2-of-3 Approval Protocol Active</p>
          <p>
            Actions such as purging hospital records, revoking facility licenses, or force-resetting regional databases
            cannot be completed by a single administrator. Each destructive action creates a Pending Quorum item requiring
            cryptographic sign-off from a second verified Super Admin before execution.
          </p>
        </div>
      </div>

      {/* Pending Quorum Actions */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          Pending Quorum Actions ({pending.length})
        </h2>
        {pending.length === 0 && (
          <div className="bg-white border border-border rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
            <ShieldCheck className="h-8 w-8 text-green-500 mx-auto mb-2" />
            No pending quorum actions. All clear.
          </div>
        )}
        <div className="space-y-4">
          {pending.map((action) => {
            const progress = (action.signoffs.length / action.requiredSignoffs) * 100;
            return (
              <div
                key={action.id}
                className={cn(
                  "bg-white border-2 rounded-2xl p-5 space-y-4",
                  action.severity === "critical" ? "border-red-300" : "border-amber-300"
                )}
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    action.severity === "critical" ? "bg-red-100" : "bg-amber-100")}>
                    <ShieldAlert className={cn("h-5 w-5", action.severity === "critical" ? "text-red-600" : "text-amber-600")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground">{action.title}</h3>
                      <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full",
                        action.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                        {action.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Requested by {action.requestedBy} · {formatDateTime(action.requestedAt)}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-foreground leading-relaxed border border-border">
                  {action.description}
                </div>

                {/* Quorum progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Quorum Progress</span>
                    <span className="font-clinical text-muted-foreground">
                      {action.signoffs.length} of {action.requiredSignoffs} sign-offs obtained
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-border">
                    <div
                      className={cn("h-full rounded-full transition-all", action.severity === "critical" ? "bg-red-500" : "bg-amber-500")}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="space-y-1">
                    {action.signoffs.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <span className="font-clinical text-foreground">{s}</span>
                      </div>
                    ))}
                    {Array.from({ length: action.requiredSignoffs - action.signoffs.length }).map((_, i) => (
                      <div key={`pending-${i}`} className="flex items-center gap-2 text-[11px]">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground italic">Awaiting co-admin sign-off...</span>
                      </div>
                    ))}
                  </div>
                  <div className={cn("text-[11px] font-bold px-3 py-1.5 rounded-full inline-block",
                    action.signoffs.length < action.requiredSignoffs
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700")}>
                    [{action.signoffs.length} of {action.requiredSignoffs} Sign-offs Obtained
                    {action.signoffs.length < action.requiredSignoffs ? " — Awaiting Co-Admin Confirmation" : " — Ready to Execute"}]
                  </div>
                </div>

                {/* Actions */}
                {confirmingId === action.id ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-red-800">
                      ⚠ You are about to co-sign a {action.severity} quorum action. This will authorize irreversible platform changes.
                      Are you certain?
                    </p>
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-red-600 hover:bg-red-700 gap-2"
                        onClick={() => handleCoSign(action.id)}
                        id={`confirm-cosign-${action.id}`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Confirm & Co-Sign
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => setConfirmingId(null)}
                        id={`cancel-cosign-${action.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      className="flex-1 text-xs gap-2"
                      variant="destructive"
                      onClick={() => setConfirmingId(action.id)}
                      id={`cosign-btn-${action.id}`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Co-Sign & Authorize
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs gap-2 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleCancel(action.id)}
                      id={`cancel-action-${action.id}`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel Action
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Actions */}
      {historical.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">Historical Actions ({historical.length})</h2>
          <div className="space-y-2">
            {historical.map((action) => (
              <div key={action.id} className="bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                  action.status === "confirmed" ? "bg-green-100" : "bg-slate-100")}>
                  {action.status === "confirmed"
                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                    : <XCircle className="h-4 w-4 text-slate-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{action.title}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(action.requestedAt)}</p>
                </div>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                  action.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                  {action.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
