"use client";

import React, { useState } from "react";
import {
  FileEdit,
  Download,
  Copy,
  CheckCircle2,
  Stethoscope,
  Eye,
  AlertCircle,
  FlaskConical,
  Utensils,
  Calendar,
} from "lucide-react";
import { Button } from "./ui/button";
import type { Encounter, Patient } from "@/lib/mockData";
import { exportAsFhirBundle } from "@/lib/fhirExporter";
import { copyToClipboard } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SoapViewerProps {
  encounter: Encounter;
  patient: Patient;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-primary transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function SoapSection({
  letter,
  title,
  color,
  children,
}: {
  letter: string;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border p-4 space-y-3", color)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold bg-current/10 text-current px-2 py-0.5 rounded font-mono">
          {letter}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function SoapViewer({ encounter, patient }: SoapViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const soap = encounter.soap;
  if (!soap) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <AlertCircle className="h-5 w-5 mr-2" />
        No SOAP note available for this encounter.
      </div>
    );
  }

  const handleExport = () => {
    exportAsFhirBundle(patient, encounter);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-semibold text-foreground">Clinical SOAP Breakdown</p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isEditing ? "success" : "outline"}
            onClick={() => setIsEditing((v) => !v)}
            className="text-xs"
          >
            <FileEdit className="h-3.5 w-3.5" />
            {isEditing ? "Save Note" : "Amend Clinical Note"}
          </Button>
          <Button
            size="sm"
            variant={exportDone ? "success" : "outline"}
            onClick={handleExport}
            className="text-xs"
          >
            {exportDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            {exportDone ? "Exported!" : "Export as HL7 FHIR Bundle"}
          </Button>
        </div>
      </div>

      {/* S: Subjective */}
      <SoapSection letter="S" title="Subjective — Patient Report" color="border-blue-200 bg-blue-50/40 text-blue-900">
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-semibold text-xs uppercase tracking-wider text-blue-600 block mb-0.5">Chief Complaints</span>
            <p className="text-foreground leading-relaxed">{soap.subjective.chiefComplaints}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-xs uppercase tracking-wider text-blue-600 block mb-0.5">Onset</span>
              <p className="text-foreground text-xs">{soap.subjective.onset}</p>
            </div>
            <div>
              <span className="font-semibold text-xs uppercase tracking-wider text-blue-600 block mb-0.5">Severity</span>
              <p className="text-foreground text-xs">{soap.subjective.severity}</p>
            </div>
          </div>
          <div>
            <span className="font-semibold text-xs uppercase tracking-wider text-blue-600 block mb-0.5">Patient Statement</span>
            <blockquote className="border-l-2 border-blue-300 pl-3 italic text-xs text-muted-foreground leading-relaxed">
              {soap.subjective.patientStatement}
            </blockquote>
          </div>
        </div>
      </SoapSection>

      {/* O: Objective */}
      <SoapSection letter="O" title="Objective — Clinical Observations" color="border-purple-200 bg-purple-50/40 text-purple-900">
        <div className="space-y-2 text-sm">
          <p className="text-foreground text-xs leading-relaxed">{soap.objective.observations}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {[
              { label: "Blood Pressure", value: soap.objective.bloodPressure },
              { label: "Heart Rate", value: `${soap.objective.heartRate} bpm` },
              { label: "SpO2", value: `${soap.objective.spO2}%` },
              { label: "Temperature", value: soap.objective.temperature },
            ].map((m) => (
              <div key={m.label} className="bg-white border border-purple-200 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">{m.label}</p>
                <p className="text-base font-bold font-mono text-foreground mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </SoapSection>

      {/* A: Assessment */}
      <SoapSection letter="A" title="Assessment — Diagnosis" color="border-amber-200 bg-amber-50/40 text-amber-900">
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-semibold text-xs uppercase tracking-wider text-amber-700 block mb-0.5">Primary Diagnosis</span>
            <p className="text-foreground font-semibold">{soap.assessment.primaryDiagnosis}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-md px-2 py-1 text-[11px] font-mono">
              <CopyButton text={soap.assessment.icd10Code} />
              <span className="text-amber-700 font-semibold">{soap.assessment.icd10Code}</span>
              <span className="text-muted-foreground">ICD-10</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-md px-2 py-1 text-[11px] font-mono">
              <CopyButton text={soap.assessment.snomedCode} />
              <span className="text-amber-700 font-semibold">{soap.assessment.snomedCode}</span>
              <span className="text-muted-foreground">SNOMED-CT</span>
            </div>
          </div>
          {soap.assessment.differentialDiagnoses.length > 0 && (
            <div>
              <span className="font-semibold text-xs uppercase tracking-wider text-amber-700 block mb-1">Differential Diagnoses</span>
              <ul className="space-y-0.5">
                {soap.assessment.differentialDiagnoses.map((dd) => (
                  <li key={dd} className="text-xs text-foreground flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                    {dd}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SoapSection>

      {/* P: Plan */}
      <SoapSection letter="P" title="Plan — Management & Orders" color="border-green-200 bg-green-50/40 text-green-900">
        <div className="space-y-3 text-sm">
          {/* Medications table */}
          <div>
            <span className="font-semibold text-xs uppercase tracking-wider text-green-700 block mb-2">Medication Orders</span>
            <div className="overflow-x-auto rounded-lg border border-green-200">
              <table className="w-full text-xs">
                <thead className="bg-green-100/80">
                  <tr>
                    {["Molecule", "Form", "Strength", "Frequency", "Duration", "Refills"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-green-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-200 bg-white">
                  {soap.plan.medications.map((med) => (
                    <tr key={med.name} className="hover:bg-green-50">
                      <td className="px-3 py-2 font-semibold text-foreground flex items-center gap-1.5">
                        <CopyButton text={med.name} />
                        {med.name}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{med.form}</td>
                      <td className="px-3 py-2 font-mono font-semibold">{med.strength}</td>
                      <td className="px-3 py-2 text-muted-foreground">{med.frequency}</td>
                      <td className="px-3 py-2 text-muted-foreground">{med.duration}</td>
                      <td className="px-3 py-2 text-center">{med.refills}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnostic orders */}
          {soap.plan.diagnosticOrders.length > 0 && (
            <div>
              <span className="font-semibold text-xs uppercase tracking-wider text-green-700 block mb-1 flex items-center gap-1.5">
                <FlaskConical className="h-3 w-3" /> Diagnostic Orders
              </span>
              <ul className="space-y-0.5">
                {soap.plan.diagnosticOrders.map((order) => (
                  <li key={order} className="flex items-center gap-2 text-xs text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    {order}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-white border border-green-200 rounded-lg p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700 flex items-center gap-1 mb-1">
                <Eye className="h-3 w-3" /> Doctor Instructions
              </p>
              <p className="text-xs text-foreground leading-relaxed">{soap.plan.instructions}</p>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700 flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3" /> Follow-up
              </p>
              <p className="text-xs text-foreground">{soap.plan.followUp}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700 flex items-center gap-1 mt-2 mb-1">
                <Utensils className="h-3 w-3" /> Dietary
              </p>
              <p className="text-xs text-foreground">{soap.plan.dietaryRestrictions}</p>
            </div>
          </div>
        </div>
      </SoapSection>
    </div>
  );
}
