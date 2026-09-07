"use client";

import React, { useState, use } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, EyeOff, Save, ChevronLeft, CheckCircle2 } from "lucide-react";
import { getAnonymizedCaseById } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ caseId: string }>;
}

const OUTCOME_COLORS: Record<string, string> = {
  Resolved: "bg-green-100 text-green-700 border-green-200",
  Maintenance: "bg-blue-100 text-blue-700 border-blue-200",
  Escalated: "bg-red-100 text-red-700 border-red-200",
};

function RedactedPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200 text-slate-500 text-[11px] font-clinical select-none">
      <EyeOff className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

export default function ResearchCasePage({ params }: PageProps) {
  const { caseId } = use(params);
  const router = useRouter();
  const caseData = getAnonymizedCaseById(caseId);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-3">
        <p className="text-sm font-semibold text-foreground">Case not found</p>
        <Button size="sm" onClick={() => router.push("/research/explorer")}>Back to Explorer</Button>
      </div>
    );
  }

  const soapSections = [
    { key: "subjective", label: "S — Subjective", text: caseData.soap.subjective, color: "border-blue-200 bg-blue-50/40" },
    { key: "objective", label: "O — Objective", text: caseData.soap.objective, color: "border-violet-200 bg-violet-50/40" },
    { key: "assessment", label: "A — Assessment", text: caseData.soap.assessment, color: "border-amber-200 bg-amber-50/40" },
    { key: "plan", label: "P — Plan", text: caseData.soap.plan, color: "border-green-200 bg-green-50/40" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-5">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <button onClick={() => router.push("/research/explorer")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Explorer
        </button>
        <div className="flex items-start gap-4">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="h-4.5 w-4.5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground font-clinical">{caseData.subjectHash}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-xs text-muted-foreground">Age Bracket: <strong>{caseData.ageBracket}</strong></span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">Gender: <strong>{caseData.gender}</strong></span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">ICD-10: <strong className="font-clinical">{caseData.icd10Code}</strong></span>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", OUTCOME_COLORS[caseData.outcome])}>
                {caseData.outcome}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PII Redaction notice */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-muted-foreground">
        <EyeOff className="h-3.5 w-3.5 shrink-0" />
        All patient identifiers have been cryptographically redacted per SehatKosh Privacy Protocol.
        <RedactedPill label="Name" />
        <RedactedPill label="CNIC" />
        <RedactedPill label="Phone" />
        <RedactedPill label="Address" />
      </div>

      {/* Case metadata */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-black text-foreground">{caseData.encounterCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Total Encounters</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-black text-foreground">{caseData.regimenLengthDays}<span className="text-sm font-semibold">d</span></p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Regimen Length</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Prescribed Molecules</p>
          <div className="flex flex-wrap gap-1">
            {caseData.prescribedMolecules.map((m) => (
              <span key={m} className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* SOAP viewer */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">Anonymized Clinical SOAP Note</h2>
        {soapSections.map((section) => (
          <div key={section.key} className={cn("border rounded-xl p-4", section.color)}>
            <h3 className="text-xs font-bold text-foreground mb-2 uppercase tracking-wide">{section.label}</h3>
            <p className="text-xs text-foreground leading-relaxed">{section.text}</p>
          </div>
        ))}
      </div>

      {/* Educational notes */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          Educational Notes
        </h2>
        <p className="text-xs text-muted-foreground">Annotate this case for clinical learning. Notes are saved locally to your research session.</p>
        <textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Record your clinical observations, drug interaction notes, or treatment pattern analysis..."
          className="w-full text-xs border border-border rounded-xl px-3.5 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          id="case-notes-textarea"
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">{note.length} characters</p>
          <Button
            size="sm"
            className="gap-2 text-xs"
            onClick={handleSave}
            disabled={!note.trim()}
            id="save-case-notes"
          >
            {saved ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved!</> : <><Save className="h-3.5 w-3.5" /> Save Bookmark</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
