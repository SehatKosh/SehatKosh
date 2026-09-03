"use client";

import React, { useState } from "react";
import { Loader2, SendHorizonal, CheckCircle2, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Patient } from "@/lib/mockData";

interface RequestAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPatient?: Patient;
}

type Scope = "full_history" | "rx_allergies" | "emergency_vitals";
type Duration = "4h" | "24h" | "7d";

const SCOPE_OPTIONS: { value: Scope; label: string; desc: string }[] = [
  { value: "full_history", label: "Full Longitudinal History", desc: "All records, prescriptions, labs, and wearable data" },
  { value: "rx_allergies", label: "Prescriptions & Allergies Only", desc: "Active regimen, allergy list, and medication history" },
  { value: "emergency_vitals", label: "Emergency Vitals Only", desc: "Real-time vitals and active allergy flags" },
];

const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: "4h", label: "4 Hours (Single Visit)" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
];

export function RequestAccessModal({
  open,
  onOpenChange,
  preselectedPatient,
}: RequestAccessModalProps) {
  const [step, setStep] = useState<"form" | "awaiting" | "approved">("form");
  const [patientId, setPatientId] = useState(preselectedPatient?.medicalId ?? "");
  const [scope, setScope] = useState<Scope>("full_history");
  const [duration, setDuration] = useState<Duration>("24h");
  const [purpose, setPurpose] = useState("");

  const handleSubmit = () => {
    setStep("awaiting");
    // Simulate patient approving after 3 seconds
    setTimeout(() => setStep("approved"), 3000);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("form");
      setPatientId(preselectedPatient?.medicalId ?? "");
      setPurpose("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Patient Access</DialogTitle>
          <DialogDescription>
            A cryptographic authorization request will be sent to the patient&apos;s SehatKosh mobile app.
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4 pt-1">
            {/* Patient ID */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Patient Medical ID or Phone Number
              </label>
              <Input
                placeholder="e.g. SK-8921-X or +92 300 1234567"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              />
            </div>

            {/* Scope */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Requested Access Scope
              </label>
              <div className="space-y-2">
                {SCOPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      scope === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={opt.value}
                      checked={scope === opt.value}
                      onChange={() => setScope(opt.value)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Requested Duration
              </label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      duration === opt.value
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white text-muted-foreground hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Clinical Purpose
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Follow-up consultation for hypertension management..."
                rows={2}
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!patientId.trim() || !purpose.trim()}
                className="flex-1 gap-2"
              >
                <SendHorizonal className="h-4 w-4" />
                Send Access Request
              </Button>
            </div>
          </div>
        )}

        {step === "awaiting" && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <Loader2 className="h-5 w-5 text-primary animate-spin absolute -top-1 -right-1" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Awaiting patient approval on mobile device...</p>
              <p className="text-xs text-muted-foreground mt-1">
                A push notification has been sent to the patient&apos;s SehatKosh app.
                This request will expire in 5 minutes.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel Request
            </Button>
          </div>
        )}

        {step === "approved" && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-700">Access Granted!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Patient has approved your access request. You can now open their dossier.
              </p>
            </div>
            <Button onClick={handleClose} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Close & Open Dossier
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
