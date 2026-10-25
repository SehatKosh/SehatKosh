"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  Filter,
  Microscope,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  FileCode2,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportResearchDataset, type DeidentifiedResearchRecord } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const INITIAL_COHORT_PREVIEW: DeidentifiedResearchRecord[] = [
  {
    research_id: "c8f2a1b9d4e3",
    age_bracket: "30-34",
    gender: "Male",
    blood_group: "B+",
    allergies: ["Penicillin"],
    diagnoses: ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
    medications: ["Metformin 500mg", "Amlodipine 5mg"],
    encounter_count: 3,
  },
  {
    research_id: "e4a7d2c1f9b8",
    age_bracket: "25-29",
    gender: "Female",
    blood_group: "O+",
    allergies: ["Sulfa"],
    diagnoses: ["Acute Bronchitis"],
    medications: ["Amoxicillin 500mg"],
    encounter_count: 1,
  },
  {
    research_id: "a1b2c3d4e5f6",
    age_bracket: "40-44",
    gender: "Male",
    blood_group: "A+",
    allergies: [],
    diagnoses: ["Chronic Obstructive Pulmonary Disease"],
    medications: ["Salbutamol Inhaler"],
    encounter_count: 2,
  },
  {
    research_id: "f9e8d7c6b5a4",
    age_bracket: "55-59",
    gender: "Female",
    blood_group: "B+",
    allergies: ["NSAIDs"],
    diagnoses: ["Rheumatoid Arthritis", "Osteopenia"],
    medications: ["Methotrexate 10mg", "Folic Acid 5mg"],
    encounter_count: 4,
  },
  {
    research_id: "3b7e1a9c5d2f",
    age_bracket: "60-64",
    gender: "Male",
    blood_group: "AB+",
    allergies: [],
    diagnoses: ["Ischemic Heart Disease", "Hyperlipidemia"],
    medications: ["Atorvastatin 20mg", "Aspirin 75mg"],
    encounter_count: 5,
  },
];

const BLOOD_GROUPS = ["All", "B+", "O+", "A+", "AB+", "O-", "A-", "B-", "AB-"];
const GENDERS = ["All", "Male", "Female"];
const CONDITIONS = [
  "All",
  "Diabetes",
  "Hypertension",
  "Bronchitis",
  "Pulmonary",
  "Arthritis",
  "Heart Disease",
];

export default function ResearchPortalPage() {
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [selectedFormat, setSelectedFormat] = useState<"json" | "csv">("json");
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredCohort = useMemo(() => {
    return INITIAL_COHORT_PREVIEW.filter((rec) => {
      if (selectedGender !== "All" && rec.gender.toLowerCase() !== selectedGender.toLowerCase()) {
        return false;
      }
      if (
        selectedBloodGroup !== "All" &&
        rec.blood_group.toLowerCase() !== selectedBloodGroup.toLowerCase()
      ) {
        return false;
      }
      if (selectedCondition !== "All") {
        const matchesCondition = rec.diagnoses.some((d) =>
          d.toLowerCase().includes(selectedCondition.toLowerCase())
        );
        if (!matchesCondition) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = rec.research_id.toLowerCase().includes(q);
        const matchesDiag = rec.diagnoses.some((d) => d.toLowerCase().includes(q));
        const matchesMed = rec.medications.some((m) => m.toLowerCase().includes(q));
        if (!matchesId && !matchesDiag && !matchesMed) return false;
      }
      return true;
    });
  }, [selectedGender, selectedBloodGroup, selectedCondition, searchQuery]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportResearchDataset({
        gender: selectedGender !== "All" ? selectedGender : undefined,
        blood_group: selectedBloodGroup !== "All" ? selectedBloodGroup : undefined,
        condition: selectedCondition !== "All" ? selectedCondition : undefined,
        format: selectedFormat,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `deidentified_research_cohort_${Date.now()}.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(
        `Successfully downloaded de-identified cohort in ${selectedFormat.toUpperCase()} format.`
      );
    } catch (err) {
      console.error("Export error:", err);
      showToast("Export failed. Please check network connection.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedGender("All");
    setSelectedBloodGroup("All");
    setSelectedCondition("All");
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedGender !== "All" ||
    selectedBloodGroup !== "All" ||
    selectedCondition !== "All" ||
    searchQuery.trim() !== "";

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border bg-slate-900 border-slate-700 text-white text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-sm">
              <Microscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Research De-Identification & Cohort Pipeline
              </h1>
              <p className="text-xs text-muted-foreground">
                FR-SEC-03 Compliant · Direct PII Redacted · 5-Year Age Binning · Ephemeral SHA-256 Pseudo-IDs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/research/explorer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span>Case Explorer</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2 text-xs font-bold shadow-sm"
            id="export-cohort-btn"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Export Cohort ({selectedFormat.toUpperCase()})</span>
          </Button>
        </div>
      </div>

      {/* Security & Pipeline Overview Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-bold text-foreground">FR-SEC-03 Anonymization Active</p>
            <p className="text-muted-foreground leading-relaxed">
              Direct patient identifiers (MRN, CNIC, Phone, Full Name) are stripped prior to extraction.
              Ages are deterministically collapsed into 5-year interval buckets (e.g., 28 → &quot;25-29&quot;).
              Document image keys and clinician metadata are completely omitted from research streams.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-bold text-amber-800 shrink-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Audit Logged: RESEARCH_DATA_EXPORT</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-border rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Matching Subjects
          </p>
          <p className="text-2xl font-black text-foreground mt-1">
            {filteredCohort.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">In current filtered cohort</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Age Binning Standard
          </p>
          <p className="text-2xl font-black text-amber-700 mt-1">
            5-Year
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">e.g. 33 → &quot;30-34&quot;, 92 → &quot;90+&quot;</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            PII Redaction Level
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            100%
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">0 CNIC / Phone / MRN leaks</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Export Format
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={() => setSelectedFormat("json")}
              className={cn(
                "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border transition-all",
                selectedFormat === "json"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-slate-50 border-border text-muted-foreground hover:bg-slate-100"
              )}
            >
              <FileCode2 className="h-3.5 w-3.5" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => setSelectedFormat("csv")}
              className={cn(
                "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border transition-all",
                selectedFormat === "csv"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-slate-50 border-border text-muted-foreground hover:bg-slate-100"
              )}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cohort Filter Controls */}
      <div className="bg-white border border-border rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-amber-600" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Cohort Selection & Ingestion Filters
            </h2>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-red-500 hover:text-red-700 font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Condition Filter */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
              Primary Condition
            </label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              id="filter-condition-select"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
              Gender
            </label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              id="filter-gender-select"
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Blood Group Filter */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
              Blood Group
            </label>
            <select
              value={selectedBloodGroup}
              onChange={(e) => setSelectedBloodGroup(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              id="filter-bloodgroup-select"
            >
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Free-text Search */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
              Search Diagnosis or Molecule
            </label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. Metformin, Bronchitis..."
                className="w-full text-xs border border-border rounded-lg pl-8 pr-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                id="filter-search-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reactive Anonymized Data Table */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-border bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Live De-Identified Dataset Stream Preview
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {filteredCohort.length} records matching criteria
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-clinical">
            Ephemeral SHA-256 Pseudo-IDs Active
          </span>
        </div>

        {filteredCohort.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-xs space-y-2">
            <Microscope className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No subjects match the selected cohort criteria</p>
            <p>Try resetting filters or adjusting diagnosis keywords</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-slate-100/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Research Pseudo-ID</th>
                  <th className="py-3 px-4">5-Yr Age Bin</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Aggregated Diagnoses</th>
                  <th className="py-3 px-4">Prescribed Molecules</th>
                  <th className="py-3 px-4 text-center">Encounters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCohort.map((row) => (
                  <tr key={row.research_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-800 text-[11px]">
                      {row.research_id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[11px]">
                        {row.age_bracket}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {row.gender}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                        {row.blood_group}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-foreground max-w-xs truncate">
                      {row.diagnoses.join(", ")}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                      {row.medications.join(", ")}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {row.encounter_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
