"use client";

import React, { useState } from "react";
import { ShieldCheck, Clock, CheckCircle2, AlertCircle, RefreshCw, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_PATIENTS } from "@/lib/mockData";
import { formatDate } from "@/lib/utils";
import { RequestAccessModal } from "@/components/RequestAccessModal";

export default function ConsentHubPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Access Requests & Consent Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Time-bound cryptographic patient authorization management & audit logs
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} className="gap-2 text-xs">
          <KeyRound className="h-4 w-4" />
          Request New Access
        </Button>
      </div>

      {/* Active Consents */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Active Consent Sessions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_PATIENTS.filter((p) => p.accessStatus === "active").map((patient) => (
            <div key={patient.id} className="bg-white border border-border rounded-xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">{patient.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{patient.medicalId}</p>
                </div>
                <Badge variant="success" className="text-[10px]">
                  Active
                </Badge>
              </div>

              <div className="text-xs space-y-1 text-muted-foreground bg-slate-50 p-2.5 rounded-lg border border-border">
                <p><span className="font-medium text-foreground">Scope:</span> Full Longitudinal History</p>
                <p><span className="font-medium text-foreground">Expires:</span> {formatDate(patient.accessExpiresAt)}</p>
              </div>

              <div className="flex justify-end pt-1">
                <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                  Revoke Early
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending & Expired */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
        {/* Pending Requests */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Pending Approval ({MOCK_PATIENTS.filter((p) => p.accessStatus === "pending").length})
          </h2>

          {MOCK_PATIENTS.filter((p) => p.accessStatus === "pending").map((patient) => (
            <div key={patient.id} className="bg-white border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">{patient.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{patient.medicalId} • Sent 10m ago</p>
              </div>
              <Badge variant="pending">Awaiting Approval</Badge>
            </div>
          ))}
        </div>

        {/* Expired Sessions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            Expired Sessions ({MOCK_PATIENTS.filter((p) => p.accessStatus === "expired").length})
          </h2>

          {MOCK_PATIENTS.filter((p) => p.accessStatus === "expired").map((patient) => (
            <div key={patient.id} className="bg-white border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">{patient.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{patient.medicalId}</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setModalOpen(true)}>
                <RefreshCw className="h-3 w-3" /> Re-request Access
              </Button>
            </div>
          ))}
        </div>
      </div>

      <RequestAccessModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
