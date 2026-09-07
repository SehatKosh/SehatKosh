"use client";

import React, { useState } from "react";
import { Sparkles, Copy, Check, TrendingUp, AlertCircle, Activity } from "lucide-react";
import type { Patient, Encounter } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface ClinicalSummaryCardProps {
  patient: Patient;
  latestEncounter?: Encounter;
}

function buildBullets(patient: Patient, encounter?: Encounter) {
  const condition = patient.chronicConditions[0] ?? (encounter?.soap?.assessment.primaryDiagnosis ?? "No chronic conditions on record");
  const duration = encounter ? `Active since ${encounter.date.split("T")[0]}` : "Ongoing";
  const meds = encounter?.soap?.plan.medications
    ? encounter.soap.plan.medications.map((m) => `${m.name} ${m.strength}`).join(", ")
    : patient.activeDrugCount > 0
    ? `${patient.activeDrugCount} active medication(s) on file`
    : "No active medications";

  const vitalsNote =
    patient.vitalsStatus === "warning"
      ? `HR ${patient.lastHR} bpm (elevated) · SpO₂ ${patient.lastSpO2}% — review wearable trends`
      : patient.vitalsStatus === "critical"
      ? `⚠ Critical vitals: HR ${patient.lastHR} · SpO₂ ${patient.lastSpO2}% — immediate review required`
      : `Vitals stable — HR ${patient.lastHR} bpm · SpO₂ ${patient.lastSpO2}% within normal limits`;

  return [
    { icon: TrendingUp, label: "Primary Condition", text: `${condition}. ${duration}.` },
    { icon: Activity, label: "Active Regimen", text: meds + (patient.hasContraindication ? " ⚠ Contraindication detected." : " — adherence flags: none.") },
    { icon: AlertCircle, label: "14-Day Signal", text: vitalsNote },
  ];
}

export function ClinicalSummaryCard({ patient, latestEncounter }: ClinicalSummaryCardProps) {
  const [copied, setCopied] = useState(false);
  const bullets = buildBullets(patient, latestEncounter);

  const summaryText = bullets.map((b) => `• ${b.label}: ${b.text}`).join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summaryText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-5 mt-4 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-emerald-200 bg-emerald-100/60">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-700" />
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
            10-Second Clinical Intelligence Snapshot
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-700">AI</span>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-all",
            copied
              ? "bg-emerald-600 text-white border-emerald-600"
              : "text-emerald-700 border-emerald-300 hover:bg-emerald-200"
          )}
          id="copy-clinical-summary"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy Summary"}
        </button>
      </div>

      {/* Bullets */}
      <div className="px-4 py-3 space-y-2.5">
        {bullets.map((b, i) => {
          const Icon = b.icon;
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-md bg-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-3 w-3 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-emerald-800">{b.label}: </span>
                <span className="text-[11px] text-emerald-900">{b.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
