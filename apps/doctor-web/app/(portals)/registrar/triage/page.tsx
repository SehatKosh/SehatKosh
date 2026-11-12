"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Activity,
  Search,
  UserCheck,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Loader2,
  Heart,
  Thermometer,
  Wind,
  Brain,
  Building2,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ToastProvider";
import {
  searchPatientByCnic,
  calculateTriagePriority,
  enqueueTriagePatient,
  type PatientDemographics,
  type TriageCalculateResponse,
} from "@/lib/api-client";

// Canonical facility and department IDs (PIMS)
const DEFAULT_FACILITY_ID = "11111111-1111-1111-1111-111111111111";
const DEPARTMENTS = [
  { id: "bbbbbbbb-1111-1111-1111-111111111111", name: "OPD (Outpatient Department)", code: "OPD" },
  { id: "bbbbbbbb-1111-1111-1111-111111111112", name: "Emergency & Trauma Ward", code: "ER" },
];

export default function TriageIntakePage() {
  const { showToast } = useToast();

  // Patient Lookup state
  const [cnicQuery, setCnicQuery] = useState("37405-1234567-1");
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [patient, setPatient] = useState<PatientDemographics | null>(null);

  // Department selection
  const [selectedDeptId, setSelectedDeptId] = useState(DEPARTMENTS[0].id);

  // Chief Complaint
  const [chiefComplaint, setChiefComplaint] = useState("Severe acute headache and chest tightness");

  // Vitals inputs
  const [vitals, setVitals] = useState({
    bp_systolic: 135,
    bp_diastolic: 88,
    pulse: 82,
    temperature_f: 99.1,
    spo2: 97,
    respiratory_rate: 18,
    gcs: 15,
  });

  // Triage Priority live preview
  const [triageResult, setTriageResult] = useState<TriageCalculateResponse>({
    priority: "ROUTINE",
    reasoning: "Vital parameters within routine range.",
  });
  const [isCalculatingPriority, setIsCalculatingPriority] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enqueuedResult, setEnqueuedResult] = useState<{
    token_number: string;
    local_mrn: string;
    priority: string;
    department_name: string;
  } | null>(null);

  // Search Patient handler
  const handleSearchPatient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cnicQuery.trim()) return;

    setIsSearchingPatient(true);
    try {
      const result = await searchPatientByCnic(cnicQuery.trim());
      setPatient(result);
      showToast(`Patient found: ${result.name}`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to locate patient by CNIC", "error");
    } finally {
      setIsSearchingPatient(false);
    }
  };

  // Initial lookup on mount
  useEffect(() => {
    handleSearchPatient();
  }, []);

  // Update vitals helper
  const handleVitalChange = (field: keyof typeof vitals, val: string) => {
    const num = val === "" ? undefined : Number(val);
    setVitals((prev) => ({ ...prev, [field]: num }));
  };

  // Debounced Triage Priority calculation
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsCalculatingPriority(true);
      try {
        const res = await calculateTriagePriority({
          bp_systolic: vitals.bp_systolic,
          bp_diastolic: vitals.bp_diastolic,
          pulse: vitals.pulse,
          spo2: vitals.spo2,
          temperature_f: vitals.temperature_f,
          respiratory_rate: vitals.respiratory_rate,
          gcs: vitals.gcs,
        });
        setTriageResult(res);
      } catch (err) {
        console.warn("Triage calculation error:", err);
      } finally {
        setIsCalculatingPriority(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [vitals]);

  // Submit intake & enqueue
  const handleEnqueue = async () => {
    if (!patient) {
      showToast("Please search and select a verified patient first.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedDept = DEPARTMENTS.find((d) => d.id === selectedDeptId);
      const res = await enqueueTriagePatient(DEFAULT_FACILITY_ID, {
        patient_id: patient.id,
        department_id: selectedDeptId,
        triage_priority: triageResult.priority,
        chief_complaint: chiefComplaint,
        vitals_snapshot: vitals,
      });

      if (res.success && res.data) {
        const token = res.data.token_number || `${selectedDept?.code || "Q"}-042`;
        const mrn = res.data.local_mrn || patient.mrn;
        setEnqueuedResult({
          token_number: token,
          local_mrn: mrn,
          priority: triageResult.priority,
          department_name: selectedDept?.name || "General OPD",
        });
        showToast(`Patient enqueued successfully with Token ${token}`, "success");
      } else {
        throw new Error(res.error || "Failed to enqueue patient into triage queue");
      }
    } catch (err: any) {
      showToast(err?.message || "Enqueue error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to triage another patient
  const handleReset = () => {
    setEnqueuedResult(null);
    setCnicQuery("");
    setPatient(null);
    setChiefComplaint("");
    setVitals({
      bp_systolic: 120,
      bp_diastolic: 80,
      pulse: 75,
      temperature_f: 98.6,
      spo2: 98,
      respiratory_rate: 16,
      gcs: 15,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/registrar"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mr-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Intake Desk
            </Link>
            <span className="text-muted-foreground">•</span>
            <div className="h-6 w-6 rounded-md bg-emerald-100 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-emerald-700" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Triage Intake & Vitals Desk</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            PIMS Emergency & Outpatient Registrar · Real-time Deterministic Triage Scoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Building2 className="w-3.5 h-3.5" />
            PIMS Islamabad
          </span>
        </div>
      </div>

      {/* Confirmation View after Enqueueing */}
      {enqueuedResult ? (
        <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center space-y-5 shadow-sm">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Triage Intake Confirmed</span>
            <h2 className="text-2xl font-bold text-foreground">{patient?.name} Enqueued</h2>
            <p className="text-xs text-muted-foreground">
              Clinical ticket generated for {enqueuedResult.department_name}
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-around">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Token Number</span>
              <span className="text-2xl font-mono font-black text-primary">{enqueuedResult.token_number}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Local MRN</span>
              <span className="text-sm font-mono font-bold text-foreground">{enqueuedResult.local_mrn}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Priority</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                  enqueuedResult.priority === "CRITICAL_RESUSCITATION"
                    ? "bg-red-100 text-red-700"
                    : enqueuedResult.priority === "URGENT"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {enqueuedResult.priority}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleReset} className="gap-2">
              <Ticket className="w-4 h-4" />
              Triage Another Patient
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Patient Identity Search */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">1. Patient Demographic Verification</h2>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">Search by CNIC</span>
            </div>

            <form onSubmit={handleSearchPatient} className="flex gap-2">
              <Input
                value={cnicQuery}
                onChange={(e) => setCnicQuery(e.target.value)}
                placeholder="Enter CNIC e.g. 37405-1234567-1"
                className="font-mono text-sm"
                disabled={isSearchingPatient}
              />
              <Button
                type="submit"
                disabled={isSearchingPatient || !cnicQuery.trim()}
                className="gap-2 shrink-0"
              >
                {isSearchingPatient ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search
                  </>
                )}
              </Button>
            </form>

            {patient && (
              <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-sm">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{patient.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Age: <strong className="text-foreground">{patient.age}y</strong> · Gender:{" "}
                      <strong className="text-foreground">{patient.gender}</strong> · Blood:{" "}
                      <strong className="text-foreground">{patient.blood_group}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">SehatKosh MRN</span>
                  <span className="text-xs font-mono font-bold text-primary">{patient.mrn}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Department & Complaint */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">2. Department Routing & Chief Complaint</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Assigned Clinical Department
                </label>
                <div className="space-y-2">
                  {DEPARTMENTS.map((dept) => (
                    <label
                      key={dept.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedDeptId === dept.id
                          ? "border-primary bg-primary/5 text-foreground font-semibold shadow-xs"
                          : "border-border bg-white text-muted-foreground hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="department"
                        value={dept.id}
                        checked={selectedDeptId === dept.id}
                        onChange={() => setSelectedDeptId(dept.id)}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-xs">{dept.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Chief Complaint / Primary Symptom
                </label>
                <textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  rows={4}
                  placeholder="Describe intake presentation..."
                  className="w-full text-xs p-3 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vitals Matrix */}
          <div className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">3. Intake Vital Signs</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">Deterministic triage criteria</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {/* Systolic BP */}
              <div className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Systolic BP</span>
                  <span className="text-[10px] font-normal">mmHg</span>
                </label>
                <Input
                  type="number"
                  value={vitals.bp_systolic ?? ""}
                  onChange={(e) => handleVitalChange("bp_systolic", e.target.value)}
                  placeholder="120"
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* Diastolic BP */}
              <div className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Diastolic BP</span>
                  <span className="text-[10px] font-normal">mmHg</span>
                </label>
                <Input
                  type="number"
                  value={vitals.bp_diastolic ?? ""}
                  onChange={(e) => handleVitalChange("bp_diastolic", e.target.value)}
                  placeholder="80"
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* Heart Rate / Pulse */}
              <div className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-500" /> Pulse
                  </span>
                  <span className="text-[10px] font-normal">bpm</span>
                </label>
                <Input
                  type="number"
                  value={vitals.pulse ?? ""}
                  onChange={(e) => handleVitalChange("pulse", e.target.value)}
                  placeholder="72"
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* Temperature */}
              <div className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-amber-500" /> Temp
                  </span>
                  <span className="text-[10px] font-normal">°F</span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={vitals.temperature_f ?? ""}
                  onChange={(e) => handleVitalChange("temperature_f", e.target.value)}
                  placeholder="98.6"
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* SpO2 */}
              <div className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Wind className="w-3 h-3 text-sky-500" /> SpO2
                  </span>
                  <span className="text-[10px] font-normal">%</span>
                </label>
                <Input
                  type="number"
                  value={vitals.spo2 ?? ""}
                  onChange={(e) => handleVitalChange("spo2", e.target.value)}
                  placeholder="98"
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* Respiratory Rate */}
              <div className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Resp Rate</span>
                  <span className="text-[10px] font-normal">/min</span>
                </label>
                <Input
                  type="number"
                  value={vitals.respiratory_rate ?? ""}
                  onChange={(e) => handleVitalChange("respiratory_rate", e.target.value)}
                  placeholder="16"
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* GCS */}
              <div className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Brain className="w-3 h-3 text-purple-500" /> GCS
                  </span>
                  <span className="text-[10px] font-normal">3 - 15</span>
                </label>
                <Input
                  type="number"
                  min="3"
                  max="15"
                  value={vitals.gcs ?? ""}
                  onChange={(e) => handleVitalChange("gcs", e.target.value)}
                  placeholder="15"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Live Triage Priority Banner */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                triageResult.priority === "CRITICAL_RESUSCITATION"
                  ? "bg-red-50 border-red-300 text-red-950"
                  : triageResult.priority === "URGENT"
                  ? "bg-amber-50 border-amber-300 text-amber-950"
                  : "bg-emerald-50 border-emerald-300 text-emerald-950"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      triageResult.priority === "CRITICAL_RESUSCITATION"
                        ? "bg-red-100 text-red-700"
                        : triageResult.priority === "URGENT"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {triageResult.priority === "CRITICAL_RESUSCITATION" ? (
                      <AlertOctagon className="w-5 h-5 animate-pulse" />
                    ) : triageResult.priority === "URGENT" ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider">
                        Calculated Priority: {triageResult.priority.replace("_", " ")}
                      </span>
                      {isCalculatingPriority && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                    </div>
                    <p className="text-xs opacity-90 mt-0.5">{triageResult.reasoning}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider inline-block ${
                      triageResult.priority === "CRITICAL_RESUSCITATION"
                        ? "bg-red-600 text-white shadow-xs"
                        : triageResult.priority === "URGENT"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-emerald-600 text-white shadow-xs"
                    }`}
                  >
                    {triageResult.priority === "CRITICAL_RESUSCITATION"
                      ? "Immediate Care"
                      : triageResult.priority === "URGENT"
                      ? "< 30 Minutes"
                      : "Standard Queue"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Action Footer */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-border rounded-xl">
            <p className="text-xs text-muted-foreground">
              Patient will receive an automated SMS notification with token and wait-time estimate.
            </p>

            <Button
              size="lg"
              disabled={isSubmitting || !patient}
              onClick={handleEnqueue}
              className={`gap-2 min-w-[200px] ${
                triageResult.priority === "CRITICAL_RESUSCITATION"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Triage...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Enqueue Patient ({triageResult.priority})
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

