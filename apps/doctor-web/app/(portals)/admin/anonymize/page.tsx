"use client";

import React, { useState } from "react";
import {
  DatabaseZap, Users, Loader2, CheckCircle2, Download, ShieldCheck,
  EyeOff, Filter, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_PATIENTS } from "@/lib/mockData";
import { cn } from "@/lib/utils";

type PipelineStep = 0 | 1 | 2 | 3 | 4;

interface AnonymizationConfig {
  cohortCondition: string;
  ageBinning: boolean;
  stripName: boolean;
  stripCnic: boolean;
  stripPhone: boolean;
  stripAddress: boolean;
  outputFormat: "FHIR-R4" | "CSV" | "JSON";
}

const PIPELINE_STEPS = [
  "Configure Cohort",
  "Strip PII",
  "Apply Binning",
  "Generate Export",
  "Download",
];

const CONDITIONS = ["All Conditions", "Hypertension", "Type 2 Diabetes Mellitus", "COPD", "Migraine"];

const STEP_MESSAGES = [
  { icon: "🔍", text: "Scanning patient cohort & applying condition filters..." },
  { icon: "🛡️", text: "Stripping direct PII: CNIC, names, phone, address..." },
  { icon: "📊", text: "Applying 5-year age binning & gender normalization..." },
  { icon: "🏥", text: "Packaging sanitized FHIR R4 MedicationRequest entities..." },
];

export default function AnonymizationEnginePage() {
  const [step, setStep] = useState<PipelineStep>(0);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [config, setConfig] = useState<AnonymizationConfig>({
    cohortCondition: "All Conditions",
    ageBinning: true,
    stripName: true,
    stripCnic: true,
    stripPhone: true,
    stripAddress: true,
    outputFormat: "FHIR-R4",
  });
  const [exportReady, setExportReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const cohortSize = config.cohortCondition === "All Conditions"
    ? MOCK_PATIENTS.length
    : MOCK_PATIENTS.filter((p) =>
        p.chronicConditions.some((c) => c.includes(config.cohortCondition))
      ).length;

  const runPipeline = async () => {
    setProcessing(true);
    setStep(1);
    for (let s = 0; s < 4; s++) {
      setProcessingStep(s);
      await new Promise((r) => setTimeout(r, 700));
    }
    setProcessing(false);
    setStep(4);
    setExportReady(true);
  };

  const handleDownload = () => {
    const demoJson = JSON.stringify({
      resourceType: "Bundle",
      type: "collection",
      meta: { tag: [{ system: "SehatKosh", code: "anonymized", display: "De-Identified Export" }] },
      entry: MOCK_PATIENTS.map((p, i) => ({
        resource: {
          resourceType: "Patient",
          id: `anon-${i + 1}`,
          meta: { security: [{ code: "ANONYED" }] },
          gender: p.gender.toLowerCase(),
          birthDateRange: config.ageBinning ? `${Math.floor(p.age / 5) * 5}–${Math.floor(p.age / 5) * 5 + 4}` : undefined,
          condition: p.chronicConditions,
        },
      })),
    }, null, 2);
    const blob = new Blob([demoJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sehat_kosh_anon_export_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("FHIR R4 anonymized dataset downloaded successfully.");
    setTimeout(() => setToast(null), 3000);
  };

  const resetPipeline = () => {
    setStep(0);
    setExportReady(false);
    setProcessingStep(0);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border bg-green-50 border-green-200 text-green-800 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <DatabaseZap className="h-4 w-4 text-emerald-700" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Automated Data Anonymization Engine</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Pull patient cohorts, strip PII, apply binning, and issue sanitized FHIR R4 datasets for research partnerships.
        </p>
      </div>

      {/* Pipeline progress */}
      <div className="flex items-center gap-0">
        {PIPELINE_STEPS.map((s, i) => {
          const done = step > i;
          const active = step === i;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  done ? "bg-primary text-white" : active ? "bg-primary/10 text-primary border-2 border-primary" : "bg-slate-100 text-muted-foreground")}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <p className={cn("text-[9px] mt-1 font-medium text-center max-w-[60px]", active ? "text-primary" : "text-muted-foreground")}>{s}</p>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={cn("flex-1 h-0.5 mb-4 mx-1 transition-all", done ? "bg-primary" : "bg-slate-200")} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 0: Configure */}
      {step === 0 && (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Step 1 — Configure Patient Cohort
          </h3>

          {/* Condition filter */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1.5">
              Filter by Chronic Condition
            </label>
            <select
              value={config.cohortCondition}
              onChange={(e) => setConfig((c) => ({ ...c, cohortCondition: e.target.value }))}
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              id="anon-condition-filter"
            >
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Cohort size: <span className="font-semibold text-foreground font-clinical">{cohortSize} patient{cohortSize !== 1 ? "s" : ""}</span>
            </p>
          </div>

          {/* PII stripping */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-2">
              PII Fields to Strip
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "stripName", label: "Full Name" },
                { key: "stripCnic", label: "CNIC Number" },
                { key: "stripPhone", label: "Phone Number" },
                { key: "stripAddress", label: "Residential Address" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-border hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={config[key as keyof AnonymizationConfig] as boolean}
                    onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.checked }))}
                    className="rounded"
                    id={`strip-${key}`}
                  />
                  <span className="text-xs text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.ageBinning}
                onChange={(e) => setConfig((c) => ({ ...c, ageBinning: e.target.checked }))}
                id="age-binning-toggle"
              />
              <span className="text-xs text-foreground">Apply 5-year age binning</span>
            </label>
          </div>

          {/* Output format */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-2">
              Output Format
            </label>
            <div className="flex gap-2">
              {(["FHIR-R4", "CSV", "JSON"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setConfig((c) => ({ ...c, outputFormat: fmt }))}
                  className={cn("flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                    config.outputFormat === fmt
                      ? "bg-primary text-white border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40")}
                  id={`format-${fmt}`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full gap-2"
            onClick={runPipeline}
            disabled={cohortSize === 0}
            id="run-anon-pipeline"
          >
            <DatabaseZap className="h-4 w-4" />
            Run Anonymization Pipeline ({cohortSize} records)
          </Button>
        </div>
      )}

      {/* Steps 1–3: Processing */}
      {step >= 1 && step <= 3 && processing && (
        <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <div>
            <p className="text-2xl mb-2">{STEP_MESSAGES[processingStep]?.icon ?? "⚙️"}</p>
            <p className="text-sm font-semibold text-foreground">{STEP_MESSAGES[processingStep]?.text ?? "Processing..."}</p>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${((processingStep + 1) / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step 4: Export ready */}
      {step === 4 && exportReady && (
        <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-5">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Anonymization Pipeline Complete</h3>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>{cohortSize} patient records</strong> processed. All PII stripped. FHIR R4 MedicationRequest entities packaged.
            </p>
          </div>

          {/* Privacy summary */}
          <div className="text-left bg-slate-50 border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-foreground mb-2">Privacy Processing Summary</p>
            {[
              { label: "Full Names", done: config.stripName },
              { label: "CNIC Numbers", done: config.stripCnic },
              { label: "Phone Numbers", done: config.stripPhone },
              { label: "Residential Addresses", done: config.stripAddress },
              { label: "Age Binned (5-yr groups)", done: config.ageBinning },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                {done ? (
                  <EyeOff className="h-3.5 w-3.5 text-green-600 shrink-0" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                )}
                <span className={done ? "text-green-700 line-through" : "text-muted-foreground"}>{label}</span>
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {done ? "STRIPPED" : "RETAINED"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button className="flex-1 gap-2" onClick={handleDownload} id="download-anon-export">
              <Download className="h-4 w-4" />
              Download {config.outputFormat} Export
            </Button>
            <Button variant="outline" className="flex-1 text-xs" onClick={resetPipeline} id="reset-pipeline-btn">
              New Export
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
