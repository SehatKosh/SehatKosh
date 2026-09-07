"use client";

import React, { useState, useRef } from "react";
import { Upload, Search, Loader2, CheckCircle2, ChevronRight, FileText, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_PATIENTS, type Patient } from "@/lib/mockData";
import { cn } from "@/lib/utils";

type IngestStep = 1 | 2 | 3 | 4 | 5;

interface ExtractedField {
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
  editable: boolean;
}

const DUMMY_EXTRACTED_FIELDS: ExtractedField[] = [
  { label: "Drug 1", value: "Amoxicillin 500mg Caps", confidence: "high", editable: true },
  { label: "Drug 2", value: "Paracetamol 500mg Tabs", confidence: "high", editable: true },
  { label: "Drug 3", value: "Salbutamol Inhaler 100mcg", confidence: "medium", editable: true },
  { label: "Ordering Clinician", value: "Dr. Tariq Khan (PMDC-12345)", confidence: "high", editable: false },
  { label: "Dosage Frequency", value: "TDS, PRN, QID", confidence: "medium", editable: true },
  { label: "Prescription Date", value: "30 Aug 2026", confidence: "high", editable: false },
];

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-red-100 text-red-700",
};

export default function AdminIngestPage() {
  const [step, setStep] = useState<IngestStep>(1);
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [fields, setFields] = useState<ExtractedField[]>(DUMMY_EXTRACTED_FIELDS);
  const fileRef = useRef<HTMLInputElement>(null);

  const patientMatches = MOCK_PATIENTS.filter(
    (p) => p.name.toLowerCase().includes(patientQuery.toLowerCase()) || p.medicalId.toLowerCase().includes(patientQuery.toLowerCase())
  );

  const runOcr = async () => {
    setOcrLoading(true);
    await new Promise((r) => setTimeout(r, 2200));
    setOcrLoading(false);
    setStep(4);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setUploadedFile(file.name); setStep(3); }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setUploadedFile(file.name); setStep(3); }
  };

  const updateField = (i: number, val: string) => {
    setFields((prev) => prev.map((f, idx) => idx === i ? { ...f, value: val } : f));
  };

  const steps = ["Select Patient", "Upload Scan", "Run OCR", "Verify Fields", "Commit"];

  return (
    <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Upload className="h-4 w-4 text-amber-700" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Paper Ingestion & OCR Desk</h1>
        </div>
        <p className="text-xs text-muted-foreground">Digitize physical prescriptions and hospital records via OCR pipeline</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => {
          const n = (i + 1) as IngestStep;
          const done = step > n;
          const active = step === n;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  done ? "bg-primary text-white" : active ? "bg-primary/10 text-primary border-2 border-primary" : "bg-slate-100 text-muted-foreground")}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : n}
                </div>
                <p className={cn("text-[10px] mt-1 font-medium", active ? "text-primary" : "text-muted-foreground")}>{s}</p>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("flex-1 h-0.5 mb-4 mx-1 transition-all", done ? "bg-primary" : "bg-slate-200")} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1: Patient selection */}
      {step === 1 && (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Step 1 — Select Patient</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              placeholder="Search by name or MRN..."
              className="w-full pl-9 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              id="ingest-patient-search"
            />
          </div>
          {patientQuery && patientMatches.map((p) => (
            <button key={p.id} onClick={() => { setSelectedPatient(p); setStep(2); }}
              className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-slate-50 transition-all">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{p.initials}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.medicalId} · {p.age}y {p.gender}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Upload */}
      {step === 2 && selectedPatient && (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Patient:</span>
            <span className="font-semibold text-foreground">{selectedPatient.name}</span>
            <span>·</span>
            <span className="font-clinical">{selectedPatient.medicalId}</span>
          </div>
          <h3 className="text-sm font-bold text-foreground">Step 2 — Upload Prescription Scan</h3>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={cn("border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-slate-50")}
          >
            <FileText className={cn("h-10 w-10 mx-auto mb-3", dragOver ? "text-primary" : "text-muted-foreground")} />
            <p className="text-sm font-semibold text-foreground">Drag & drop prescription scan</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse · PDF, JPG, PNG accepted</p>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileInput} id="ingest-file-input" />
          </div>
          {/* Demo bypass */}
          <button onClick={() => { setUploadedFile("prescription_demo.jpg"); setStep(3); }}
            className="w-full text-xs text-muted-foreground hover:text-primary text-center py-2 hover:underline">
            Use demo scan (skip upload)
          </button>
        </div>
      )}

      {/* Step 3: OCR trigger */}
      {step === 3 && (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Step 3 — Run OCR Pipeline</h3>
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-border rounded-xl">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground">{uploadedFile}</p>
          </div>
          {ocrLoading ? (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Running SehatKosh OCR & FHIR parsing pipeline…</p>
            </div>
          ) : (
            <Button className="w-full gap-2" onClick={runOcr} id="run-ocr-btn">
              <Upload className="h-4 w-4" /> Trigger OCR & FHIR Parsing
            </Button>
          )}
        </div>
      )}

      {/* Step 4: Verify extracted fields */}
      {step === 4 && (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Step 4 — Review Extracted Fields</h3>
          <p className="text-xs text-muted-foreground">Verify and correct OCR results before committing to patient ledger.</p>
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.label} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-slate-50/60">
                <p className="text-xs font-semibold text-muted-foreground w-36 shrink-0">{field.label}</p>
                {field.editable ? (
                  <input value={field.value} onChange={(e) => updateField(i, e.target.value)}
                    className="flex-1 text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 font-clinical" />
                ) : (
                  <p className="flex-1 text-xs font-clinical text-foreground">{field.value}</p>
                )}
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", CONFIDENCE_BADGE[field.confidence])}>
                  {field.confidence}
                </span>
              </div>
            ))}
          </div>
          <Button className="w-full gap-2" onClick={() => setStep(5)} id="proceed-commit-btn">
            Confirm Fields <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 5: Commit */}
      {step === 5 && selectedPatient && (
        <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Record Committed to Patient Ledger</h2>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>{fields.length} extracted fields</strong> have been written to <strong>{selectedPatient.name}</strong>&apos;s SehatKosh cloud record.
            </p>
          </div>
          <Button onClick={() => { setStep(1); setSelectedPatient(null); setUploadedFile(null); setPatientQuery(""); setFields(DUMMY_EXTRACTED_FIELDS); }} id="ingest-another-btn">
            Ingest Another Record
          </Button>
        </div>
      )}
    </div>
  );
}
