"use client";

import React, { useState } from "react";
import { Globe, CheckCircle2, XCircle, Clock, Building2, Hospital, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MOCK_HOSPITAL_LICENSES,
  type HospitalLicenseRequest,
} from "@/lib/mockData";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<HospitalLicenseRequest["status"], string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const TYPE_STYLES: Record<string, string> = {
  Teaching: "bg-blue-100 text-blue-700",
  Private: "bg-violet-100 text-violet-700",
  Government: "bg-slate-100 text-slate-600",
};

export default function HospitalLicensingPage() {
  const [licenses, setLicenses] = useState<HospitalLicenseRequest[]>(MOCK_HOSPITAL_LICENSES);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = (id: string) => {
    setLicenses((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "approved" } : l))
    );
    showToast("Hospital license approved. Onboarding email dispatched.", "success");
  };

  const handleReject = (id: string) => {
    setLicenses((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "rejected" } : l))
    );
    showToast("Hospital license rejected. Rejection notice sent.", "error");
  };

  const pending = licenses.filter((l) => l.status === "pending");
  const processed = licenses.filter((l) => l.status !== "pending");

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all",
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Globe className="h-4 w-4 text-indigo-700" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Hospital Licensing & Onboarding</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Verification desk for new hospital entities · {pending.length} pending approval{pending.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Pending Applications */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          Pending Approval ({pending.length})
        </h2>
        {pending.length === 0 && (
          <div className="bg-white border border-border rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
            All applications reviewed. No pending items.
          </div>
        )}
        <div className="space-y-3">
          {pending.map((lic) => (
            <div key={lic.id} className="bg-white border border-amber-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Hospital className="h-5 w-5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-foreground">{lic.hospitalName}</h3>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", TYPE_STYLES[lic.type])}>{lic.type}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUS_STYLES[lic.status])}>
                      {lic.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{lic.city}, {lic.province} · {lic.bedCount} beds</p>
                </div>
                <p className="text-[11px] font-clinical text-muted-foreground shrink-0">{formatDateTime(lic.submittedAt)}</p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Accreditation ID</p>
                  <p className="font-clinical font-semibold text-foreground">{lic.accreditationId}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Admin Contact</p>
                  <p className="font-semibold text-foreground">{lic.adminContact}</p>
                  <p className="text-muted-foreground font-clinical">{lic.adminEmail}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  size="sm"
                  className="gap-2 text-xs flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(lic.id)}
                  id={`approve-lic-${lic.id}`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve & Onboard
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-2 text-xs flex-1"
                  onClick={() => handleReject(lic.id)}
                  id={`reject-lic-${lic.id}`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject Application
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Processed Applications */}
      {processed.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Processed Applications ({processed.length})
          </h2>
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-border">
                  <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Hospital</th>
                  <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Location</th>
                  <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Accreditation ID</th>
                  <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {processed.map((lic) => (
                  <tr key={lic.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{lic.hospitalName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lic.city}, {lic.province}</td>
                    <td className="px-4 py-3 font-clinical text-muted-foreground">{lic.accreditationId}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", STATUS_STYLES[lic.status])}>
                        {lic.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-clinical text-muted-foreground">{formatDateTime(lic.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
