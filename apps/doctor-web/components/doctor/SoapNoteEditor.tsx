"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Trash2, Stethoscope, FileText, ClipboardList, Pill } from "lucide-react";
import { searchICD10, type ICD10Item } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface SoapNoteEditorProps {
  subjective: string;
  objective: string;
  assessment: {
    icd10_codes?: ICD10Item[];
    clinical_impression?: string;
    [key: string]: any;
  };
  plan: string;
  medications?: Array<{ name: string; dosage?: string; frequency?: string; duration?: string }>;
  onChange: (field: "subjective" | "objective" | "assessment" | "plan", value: any) => void;
  onMedicationsChange?: (meds: Array<{ name: string; dosage?: string; frequency?: string; duration?: string }>) => void;
  readOnly?: boolean;
  className?: string;
}

export function SoapNoteEditor({
  subjective,
  objective,
  assessment,
  plan,
  medications = [],
  onChange,
  onMedicationsChange,
  readOnly = false,
  className,
}: SoapNoteEditorProps) {
  const [activeTab, setActiveTab] = useState<"S" | "O" | "A" | "P">("S");

  // ICD-10 live search state
  const [icdQuery, setIcdQuery] = useState("");
  const [icdResults, setIcdResults] = useState<ICD10Item[]>([]);
  const [isSearchingIcd, setIsSearchingIcd] = useState(false);

  // New medication builder state
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("1-0-1 (Twice daily)");
  const [medDuration, setMedDuration] = useState("5 days");

  useEffect(() => {
    if (!icdQuery.trim()) {
      setIcdResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingIcd(true);
      try {
        const results = await searchICD10(icdQuery);
        setIcdResults(results);
      } finally {
        setIsSearchingIcd(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [icdQuery]);

  const selectedIcdCodes: ICD10Item[] = assessment?.icd10_codes || [];

  const handleAddIcd = (item: ICD10Item) => {
    if (selectedIcdCodes.some((c) => c.code === item.code)) return;
    const updated = [...selectedIcdCodes, item];
    onChange("assessment", { ...assessment, icd10_codes: updated });
    setIcdQuery("");
    setIcdResults([]);
  };

  const handleRemoveIcd = (code: string) => {
    const updated = selectedIcdCodes.filter((c) => c.code !== code);
    onChange("assessment", { ...assessment, icd10_codes: updated });
  };

  const handleAddMedication = () => {
    if (!medName.trim() || !onMedicationsChange) return;
    const newMed = {
      name: medName.trim(),
      dosage: medDosage.trim() || "500mg",
      frequency: medFrequency,
      duration: medDuration,
    };
    const updated = [...medications, newMed];
    onMedicationsChange(updated);
    setMedName("");
    setMedDosage("");
  };

  const handleRemoveMedication = (index: number) => {
    if (!onMedicationsChange) return;
    const updated = medications.filter((_, idx) => idx !== index);
    onMedicationsChange(updated);
  };

  return (
    <div className={cn("border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden", className)}>
      {/* 4-Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("S")}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer",
            activeTab === "S"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <FileText className="w-4 h-4 text-indigo-500" />
          <span>Subjective (S)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("O")}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer",
            activeTab === "O"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <Stethoscope className="w-4 h-4 text-emerald-500" />
          <span>Objective (O)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("A")}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer",
            activeTab === "A"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <ClipboardList className="w-4 h-4 text-amber-500" />
          <span>Assessment (A)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("P")}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer",
            activeTab === "P"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <Pill className="w-4 h-4 text-rose-500" />
          <span>Plan & Rx (P)</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-5">
        {/* SUBJECTIVE */}
        {activeTab === "S" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Patient Subjective Complaints & History
              </label>
              <span className="text-[11px] text-slate-400">Chief complaint, presenting illness, review of systems</span>
            </div>
            <textarea
              value={subjective}
              onChange={(e) => onChange("subjective", e.target.value)}
              disabled={readOnly}
              rows={6}
              placeholder="Record patient complaints, onset, duration, severity, and reported timeline..."
              className="w-full p-3.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 leading-relaxed resize-y"
            />
          </div>
        )}

        {/* OBJECTIVE */}
        {activeTab === "O" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Physical Examination & Objective Findings
              </label>
              <span className="text-[11px] text-slate-400">General appearance, systemic examination, diagnostics</span>
            </div>
            <textarea
              value={objective}
              onChange={(e) => onChange("objective", e.target.value)}
              disabled={readOnly}
              rows={6}
              placeholder="Record physical examination findings, cardiovascular, respiratory, abdominal exam..."
              className="w-full p-3.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 leading-relaxed resize-y"
            />
          </div>
        )}

        {/* ASSESSMENT with ICD-10 Search */}
        {activeTab === "A" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Standardized ICD-10 Diagnosis Search
              </label>
              {!readOnly && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={icdQuery}
                    onChange={(e) => setIcdQuery(e.target.value)}
                    placeholder="Search condition or code (e.g., 'Diabetes', 'Hypertension', 'I10')..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                  />
                  {isSearchingIcd && (
                    <span className="text-xs text-slate-400 absolute right-3 top-3">Searching...</span>
                  )}
                  {icdResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                      {icdResults.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleAddIcd(item)}
                          className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0 cursor-pointer"
                        >
                          <span className="font-semibold text-slate-800">{item.description}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-mono font-bold text-[10px]">
                            {item.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected ICD-10 Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedIcdCodes.map((item) => (
                  <span
                    key={item.code}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-amber-50 border border-amber-200 text-amber-900"
                  >
                    <span className="font-mono font-bold text-amber-700">[{item.code}]</span>
                    <span>{item.description}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIcd(item.code)}
                        className="text-amber-500 hover:text-amber-800 ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {selectedIcdCodes.length === 0 && (
                  <span className="text-xs text-slate-400 italic">No ICD-10 diagnosis codes attached yet.</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Clinical Impression & Differential Diagnosis
              </label>
              <textarea
                value={assessment?.clinical_impression || ""}
                onChange={(e) =>
                  onChange("assessment", { ...assessment, clinical_impression: e.target.value })
                }
                disabled={readOnly}
                rows={4}
                placeholder="Clinical reasoning, differential diagnoses, progression notes..."
                className="w-full p-3.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-400 leading-relaxed resize-y"
              />
            </div>
          </div>
        )}

        {/* PLAN & PRESCRIPTION BUILDER */}
        {activeTab === "P" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                DRAP Formulary Prescription Builder
              </label>

              {!readOnly && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      placeholder="Medication name (e.g. Amoxicillin)"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      placeholder="Dosage (500mg)"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={medDuration}
                      onChange={(e) => setMedDuration(e.target.value)}
                      placeholder="Duration (7 days)"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      disabled={!medName.trim()}
                      className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Rx</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Medication Table */}
              {medications.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-3.5 py-2">Medication</th>
                        <th className="px-3.5 py-2">Dosage</th>
                        <th className="px-3.5 py-2">Frequency</th>
                        <th className="px-3.5 py-2">Duration</th>
                        {!readOnly && <th className="px-3.5 py-2 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {medications.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3.5 py-2 font-semibold text-slate-900">{m.name}</td>
                          <td className="px-3.5 py-2 text-slate-600">{m.dosage || "--"}</td>
                          <td className="px-3.5 py-2 text-slate-600">{m.frequency || "--"}</td>
                          <td className="px-3.5 py-2 text-slate-600">{m.duration || "--"}</td>
                          {!readOnly && (
                            <td className="px-3.5 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveMedication(idx)}
                                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No medications added to prescription plan.</p>
              )}
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Clinical Recommendations & Follow-Up Plan
              </label>
              <textarea
                value={plan}
                onChange={(e) => onChange("plan", e.target.value)}
                disabled={readOnly}
                rows={4}
                placeholder="Follow-up advice, dietary precautions, diagnostic tests ordered..."
                className="w-full p-3.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400 leading-relaxed resize-y"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SoapNoteEditor;

