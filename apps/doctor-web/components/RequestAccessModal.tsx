"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Loader2, SendHorizonal, CheckCircle2, Smartphone, Search, User, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MOCK_PATIENTS, type Patient } from "@/lib/mockData";
import { useToast } from "./ToastProvider";

interface RequestAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPatient?: Patient;
}

type Scope = "full_history" | "rx_allergies" | "emergency_vitals";
type Duration = "4h" | "24h" | "7d";

const SCOPE_OPTIONS: { value: Scope; label: string; desc: string }[] = [
  { value: "full_history", label: "Full History", desc: "Complete records, prescriptions, and vitals" },
  { value: "rx_allergies", label: "Rx & Allergies", desc: "Active medications and safety flags" },
  { value: "emergency_vitals", label: "Emergency Vitals", desc: "Live vitals and critical allergies" },
];

const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: "4h", label: "4 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
];

const QUICK_PURPOSES = [
  "Routine Consultation",
  "Follow-up Review",
  "Second Opinion",
  "Emergency Evaluation",
];

export function RequestAccessModal({
  open,
  onOpenChange,
  preselectedPatient,
}: RequestAccessModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<"form" | "awaiting" | "approved">("form");
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [scope, setScope] = useState<Scope>("full_history");
  const [duration, setDuration] = useState<Duration>("24h");
  const [purpose, setPurpose] = useState("Routine Consultation");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (preselectedPatient) {
      setSelectedPatient(preselectedPatient);
      setPatientQuery(`${preselectedPatient.name} (${preselectedPatient.medicalId})`);
    } else {
      setSelectedPatient(null);
      setPatientQuery("");
    }
  }, [preselectedPatient, open]);

  const filteredPatients = useMemo(() => {
    if (!patientQuery.trim() || selectedPatient) return [];
    const q = patientQuery.toLowerCase();
    return MOCK_PATIENTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.medicalId.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [patientQuery, selectedPatient]);

  const handleSubmit = () => {
    try {
      setStep("awaiting");
      showToast("Access dispatch sent to patient device", "info");
      setTimeout(() => {
        setStep("approved");
        showToast("Access Granted by Patient!", "success");
      }, 2200);
    } catch (e) {
      console.warn("RequestAccessModal submit error:", e);
      setStep("form");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("form");
      setSelectedPatient(preselectedPatient ?? null);
      setPatientQuery(preselectedPatient ? `${preselectedPatient.name} (${preselectedPatient.medicalId})` : "");
      setPurpose("Routine Consultation");
      setShowDropdown(false);
    }, 300);
  };

  const targetId = selectedPatient?.medicalId || patientQuery.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-bold">Request Patient Access</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Sends an instant consent authorization prompt to the patient&apos;s mobile app.
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4 pt-2">
            {/* Patient Search / Selector */}
            <div className="relative">
              <label className="text-xs font-semibold text-foreground block mb-1">
                Patient (Name or Medical ID)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Type to search patients..."
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    setSelectedPatient(null);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="pl-8 text-xs h-9"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && filteredPatients.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden py-1">
                  {filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientQuery(`${p.name} (${p.medicalId})`);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between border-b last:border-b-0 border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <div>
                          <span className="font-semibold text-foreground">{p.name}</span>
                          <span className="text-muted-foreground ml-1.5 font-clinical">{p.medicalId}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">
                        {p.gender}, {p.age}y
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scope Selection */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Access Scope
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SCOPE_OPTIONS.map((opt) => {
                  const isSelected = scope === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setScope(opt.value)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-sm"
                          : "border-border hover:bg-slate-50"
                      }`}
                    >
                      <p className={`text-xs font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    className={`py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      duration === opt.value
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-border bg-white text-muted-foreground hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clinical Purpose & Quick Chips */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Clinical Purpose
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_PURPOSES.map((qp) => (
                  <button
                    key={qp}
                    type="button"
                    onClick={() => setPurpose(qp)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      purpose === qp
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {qp}
                  </button>
                ))}
              </div>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Specify clinical rationale..."
                rows={2}
                className="w-full border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1 text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!targetId || !purpose.trim()}
                className="flex-1 gap-2 text-xs"
              >
                <SendHorizonal className="h-3.5 w-3.5" />
                Send Request
              </Button>
            </div>
          </div>
        )}

        {step === "awaiting" && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-7 w-7 text-primary" />
              </div>
              <Loader2 className="h-5 w-5 text-primary animate-spin absolute -top-1 -right-1" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Waiting for Patient Authorization</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                A consent request has been pushed to the patient&apos;s mobile device.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
              Cancel Request
            </Button>
          </div>
        )}

        {step === "approved" && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-700">Access Granted!</p>
              <p className="text-xs text-muted-foreground mt-1">
                The patient approved access. Record unlocked for consultation.
              </p>
            </div>
            <Button onClick={handleClose} className="gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Proceed to Record
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
