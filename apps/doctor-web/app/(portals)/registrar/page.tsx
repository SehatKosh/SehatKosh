"use client";

import React, { useState } from "react";
import { UserCheck, ShieldOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientLookup } from "@/components/registrar/PatientLookup";
import { ConsentPollingCard } from "@/components/registrar/ConsentPollingCard";
import { BreakGlassModal } from "@/components/registrar/BreakGlassModal";
import type { Patient } from "@/lib/mockData";
import { MOCK_HOSPITAL_STAFF } from "@/lib/mockData";

type Stage = "lookup" | "polling" | "queued";

export default function RegistrarPage() {
  const [stage, setStage] = useState<Stage>("lookup");
  const [dispatchedPatient, setDispatchedPatient] = useState<Patient | null>(null);
  const [dispatchedDoctorId, setDispatchedDoctorId] = useState("");
  const [dispatchedDuration, setDispatchedDuration] = useState("4h");
  const [breakGlassOpen, setBreakGlassOpen] = useState(false);

  const doctor = MOCK_HOSPITAL_STAFF.find((s) => s.id === dispatchedDoctorId);

  const handleDispatch = (patient: Patient, doctorId: string, duration: string) => {
    setDispatchedPatient(patient);
    setDispatchedDoctorId(doctorId);
    setDispatchedDuration(duration);
    setStage("polling");
  };

  const handleAddToQueue = () => setStage("queued");
  const handleReset = () => { setStage("lookup"); setDispatchedPatient(null); };

  return (
    <div className="p-6 max-w-2xl mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-emerald-700" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Patient Intake Desk</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Sana Perveen · Front Desk · Shifa International Hospital
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="gap-2 text-xs"
          onClick={() => setBreakGlassOpen(true)}
          id="break-glass-trigger"
        >
          <ShieldOff className="h-3.5 w-3.5" />
          Emergency Break-Glass
        </Button>
      </div>

      {/* Stage: Lookup */}
      {stage === "lookup" && (
        <PatientLookup onDispatch={handleDispatch} />
      )}

      {/* Stage: Polling */}
      {stage === "polling" && dispatchedPatient && (
        <div className="space-y-4">
          <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground">← Back to search</button>
          <ConsentPollingCard
            patient={dispatchedPatient}
            doctorId={dispatchedDoctorId}
            duration={dispatchedDuration}
            onAddToQueue={handleAddToQueue}
            onCancel={handleReset}
          />
        </div>
      )}

      {/* Stage: Queued */}
      {stage === "queued" && dispatchedPatient && (
        <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{dispatchedPatient.name} added to queue</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully assigned to <strong>{doctor?.name ?? "—"}</strong> ({doctor?.roomNumber}). <br />
              Access granted for <strong>{dispatchedDuration}</strong>.
            </p>
          </div>
          <Button onClick={handleReset} id="intake-another-btn">Intake Another Patient</Button>
        </div>
      )}

      {/* Break-glass modal */}
      <BreakGlassModal
        open={breakGlassOpen}
        onOpenChange={setBreakGlassOpen}
        onGranted={() => setBreakGlassOpen(false)}
      />
    </div>
  );
}
