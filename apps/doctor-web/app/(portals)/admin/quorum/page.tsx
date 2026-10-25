"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Lock,
  RefreshCw,
  PlusCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchQuorumRequests,
  submitQuorumVote,
  createQuorumRequest,
  type QuorumAction,
} from "@/lib/api-client";
import { MOCK_QUORUM_ACTIONS } from "@/lib/mockData";
import { formatDateTime, cn } from "@/lib/utils";

export default function QuorumSecurityPage() {
  const [actions, setActions] = useState<QuorumAction[]>(MOCK_QUORUM_ACTIONS);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // New action form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newActionType, setNewActionType] = useState("PURGE_FACILITY_RECORDS");
  const [newTargetId, setNewTargetId] = useState("");
  const [newJustification, setNewJustification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadActions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQuorumRequests();
      setActions(data);
    } catch (err) {
      console.warn("Error loading quorum actions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const handleCoSign = async (id: string) => {
    setLoading(true);
    try {
      const result = await submitQuorumVote(id, "APPROVE");
      if (result.error) {
        showToast(`Vote recorded locally: ${result.error}`);
      } else {
        showToast("Quorum vote recorded: APPROVE. Status updated.");
      }

      // Optimistically update UI
      setActions((prev) =>
        prev.map((a) => {
          if (a.id === id) {
            const nextSignoffs = [...a.signoffs, "Super Admin (Session: SA-002 — Co-Signer)"];
            const isConfirmed = nextSignoffs.length >= a.requiredSignoffs;
            return {
              ...a,
              signoffs: nextSignoffs,
              status: isConfirmed ? ("confirmed" as const) : ("pending" as const),
            };
          }
          return a;
        })
      );
    } catch (err) {
      console.error("Co-sign error:", err);
      showToast("Co-sign recorded in local session.");
    } finally {
      setConfirmingId(null);
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setLoading(true);
    try {
      const result = await submitQuorumVote(id, "REJECT");
      if (result.error) {
        showToast(`Rejection recorded: ${result.error}`);
      } else {
        showToast("Quorum vote recorded: REJECT. Action cancelled.");
      }

      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" as const } : a))
      );
    } catch (err) {
      console.error("Rejection error:", err);
      showToast("Action cancelled.");
    } finally {
      setConfirmingId(null);
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetId.trim() || newJustification.trim().length < 10) {
      showToast("Please provide a valid Target ID and justification (min 10 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createQuorumRequest({
        action_type: newActionType,
        target_id: newTargetId.trim(),
        justification: newJustification.trim(),
      });

      if (res.data) {
        showToast("New critical quorum action registered and awaiting co-admin sign-off.");
        setIsModalOpen(false);
        setNewTargetId("");
        setNewJustification("");
        loadActions();
      }
    } catch (err) {
      console.error("Create quorum error:", err);
      showToast("Failed to create quorum action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pending = actions.filter((a) => a.status === "pending");
  const historical = actions.filter((a) => a.status !== "pending");

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border bg-slate-900 border-slate-700 text-white text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center text-red-700 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Multi-Admin Quorum Security</h1>
              <p className="text-xs text-muted-foreground">
                FR-SEC-01 Compliant · 2-of-3 Super Administrator Cryptographic Multi-Signatures Required
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadActions}
            disabled={loading}
            className="text-xs gap-1.5 h-9"
            id="refresh-quorum-btn"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5 h-9 shadow-sm"
            id="new-quorum-request-btn"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Propose Critical Action</span>
          </Button>
        </div>
      </div>

      {/* Protocol explainer banner */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div className="text-xs text-red-800 space-y-1">
          <p className="font-bold">2-of-3 Approval Protocol Active (FR-SEC-01)</p>
          <p className="leading-relaxed">
            Destructive platform actions such as purging hospital records, revoking facility licenses, or mass research
            data exports cannot be completed by a single administrator. Each critical action generates an immutable Quorum
            Request requiring verified cryptographic / authenticated session approval from at least 2 of 3 registered Super
            Administrators.
          </p>
        </div>
      </div>

      {/* Propose Action Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in">
          <div className="bg-white border border-border rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <h3 className="text-sm font-bold text-foreground">Propose Critical Quorum Action</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1">Action Type</label>
                <select
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  id="action-type-select"
                >
                  <option value="PURGE_FACILITY_RECORDS">PURGE_FACILITY_RECORDS (Destructive)</option>
                  <option value="REVOKE_HOSPITAL_LICENSE">REVOKE_HOSPITAL_LICENSE (Suspension)</option>
                  <option value="MASS_DATA_EXPORT">MASS_DATA_EXPORT (National Cohort)</option>
                  <option value="RESET_REGIONAL_DATABASE">RESET_REGIONAL_DATABASE (Emergency)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Target Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. HOSP-LAHORE-042 or REGION-KPK-01"
                  value={newTargetId}
                  onChange={(e) => setNewTargetId(e.target.value)}
                  required
                  className="w-full border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  id="target-id-input"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  Compliance Justification (Min 10 characters)
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide detailed statutory or operational grounds for this destructive operation..."
                  value={newJustification}
                  onChange={(e) => setNewJustification(e.target.value)}
                  required
                  minLength={10}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  id="justification-input"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                  id="submit-quorum-request-btn"
                >
                  {isSubmitting ? "Submitting..." : "Initiate 2-of-3 Quorum Item"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Quorum Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <span>Pending Quorum Actions ({pending.length})</span>
        </h2>

        {pending.length === 0 && (
          <div className="bg-white border border-border rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground shadow-sm">
            <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-foreground">No pending quorum actions</p>
            <p className="text-xs text-muted-foreground mt-0.5">All critical platform changes have achieved quorum or been resolved.</p>
          </div>
        )}

        <div className="space-y-4">
          {pending.map((action) => {
            const progress = (action.signoffs.length / action.requiredSignoffs) * 100;
            return (
              <div
                key={action.id}
                className={cn(
                  "bg-white border-2 rounded-2xl p-5 space-y-4 shadow-sm transition-all",
                  action.severity === "critical" ? "border-red-300" : "border-amber-300"
                )}
                id={`quorum-card-${action.id}`}
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      action.severity === "critical" ? "bg-red-100" : "bg-amber-100"
                    )}
                  >
                    <ShieldAlert
                      className={cn(
                        "h-5 w-5",
                        action.severity === "critical" ? "text-red-600" : "text-amber-600"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground">{action.title}</h3>
                      <span
                        className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                          action.severity === "critical"
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
                        )}
                      >
                        {action.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Requested by {action.requestedBy} · {formatDateTime(action.requestedAt)}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-foreground leading-relaxed border border-border">
                  {action.description}
                </div>

                {/* Quorum Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Sign-Off Progress</span>
                    <span className="font-mono text-muted-foreground">
                      {action.signoffs.length} of {action.requiredSignoffs} sign-offs obtained
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-border">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        action.severity === "critical" ? "bg-red-500" : "bg-amber-500"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="space-y-1 pt-1">
                    {action.signoffs.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono text-foreground">{s}</span>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, action.requiredSignoffs - action.signoffs.length) }).map((_, i) => (
                      <div key={`pending-${i}`} className="flex items-center gap-2 text-[11px]">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground italic">Awaiting Super Admin co-signature...</span>
                      </div>
                    ))}
                  </div>

                  <div
                    className={cn(
                      "text-[11px] font-bold px-3 py-1.5 rounded-full inline-block mt-1",
                      action.signoffs.length < action.requiredSignoffs
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    )}
                  >
                    [{action.signoffs.length} of {action.requiredSignoffs} Sign-offs Obtained
                    {action.signoffs.length < action.requiredSignoffs
                      ? " — Awaiting Second Verified Super Admin"
                      : " — Quorum Achieved: Ready to Execute"}]
                  </div>
                </div>

                {/* Action Controls */}
                {confirmingId === action.id ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 animate-in fade-in">
                    <p className="text-xs font-bold text-red-800">
                      ⚠ You are about to co-sign this critical quorum action. This authorization will trigger irreversible platform changes. Are you certain?
                    </p>
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        disabled={loading}
                        className="flex-1 text-xs bg-red-600 hover:bg-red-700 gap-2 font-bold"
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
                  <div className="flex gap-3 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 text-xs gap-2 font-bold"
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
                      className="flex-1 text-xs gap-2 text-red-600 border-red-200 hover:bg-red-50 font-semibold"
                      onClick={() => handleReject(action.id)}
                      id={`reject-action-${action.id}`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject / Cancel Action
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Actions Ledger */}
      {historical.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-foreground">Historical Actions Ledger ({historical.length})</h2>
          <div className="space-y-2">
            {historical.map((action) => (
              <div
                key={action.id}
                className="bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm"
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    action.status === "confirmed" ? "bg-emerald-100" : "bg-slate-100"
                  )}
                >
                  {action.status === "confirmed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{action.title}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDateTime(action.requestedAt)}</p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                    action.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  )}
                >
                  {action.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
