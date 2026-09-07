"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Microscope, Filter, ChevronRight, X } from "lucide-react";
import { MOCK_ANONYMIZED_CASES } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const ALL_CONDITIONS = Array.from(new Set(MOCK_ANONYMIZED_CASES.map((c) => c.primaryCondition)));
const ALL_MOLECULES = Array.from(new Set(MOCK_ANONYMIZED_CASES.flatMap((c) => c.prescribedMolecules))).sort();
const AGE_BRACKETS = ["All", "20–25", "25–30", "30–35", "40–45", "55–60", "60–65"];
const GENDERS = ["All", "Male", "Female"];

const OUTCOME_COLORS: Record<string, string> = {
  Resolved: "bg-green-100 text-green-700",
  Maintenance: "bg-blue-100 text-blue-700",
  Escalated: "bg-red-100 text-red-700",
};

export default function ResearchExplorerPage() {
  const router = useRouter();
  const [conditionFilter, setConditionFilter] = useState("All");
  const [moleculeFilter, setMoleculeFilter] = useState("All");
  const [ageFilter, setAgeFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");

  const filtered = useMemo(() => {
    return MOCK_ANONYMIZED_CASES.filter((c) => {
      if (conditionFilter !== "All" && c.primaryCondition !== conditionFilter) return false;
      if (moleculeFilter !== "All" && !c.prescribedMolecules.includes(moleculeFilter)) return false;
      if (ageFilter !== "All" && c.ageBracket !== ageFilter) return false;
      if (genderFilter !== "All" && c.gender !== genderFilter) return false;
      return true;
    });
  }, [conditionFilter, moleculeFilter, ageFilter, genderFilter]);

  const hasFilters = conditionFilter !== "All" || moleculeFilter !== "All" || ageFilter !== "All" || genderFilter !== "All";

  const resetFilters = () => {
    setConditionFilter("All");
    setMoleculeFilter("All");
    setAgeFilter("All");
    setGenderFilter("All");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-5">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Microscope className="h-4 w-4 text-amber-700" />
          </div>
          <h1 className="text-xl font-bold text-foreground">De-Identified Case Explorer</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          All patient identifiers are redacted. Viewing anonymized clinical data for research purposes only.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Cohort Filters</span>
          {hasFilters && (
            <button onClick={resetFilters} className="ml-auto text-xs text-red-500 hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Reset All
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Condition */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Condition / ICD-10</label>
            <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" id="filter-condition">
              <option value="All">All Conditions</option>
              {ALL_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {/* Molecule */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Prescribed Molecule</label>
            <select value={moleculeFilter} onChange={(e) => setMoleculeFilter(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" id="filter-molecule">
              <option value="All">All Molecules</option>
              {ALL_MOLECULES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          {/* Age bracket */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Age Bracket</label>
            <div className="flex flex-wrap gap-1">
              {AGE_BRACKETS.map((b) => (
                <button key={b} onClick={() => setAgeFilter(b)}
                  className={cn("text-[10px] font-semibold px-2 py-1 rounded-full border transition-all",
                    ageFilter === b ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                  id={`age-filter-${b}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          {/* Gender */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Gender</label>
            <div className="flex gap-1">
              {GENDERS.map((g) => (
                <button key={g} onClick={() => setGenderFilter(g)}
                  className={cn("flex-1 text-[10px] font-semibold py-1 rounded-full border transition-all",
                    genderFilter === g ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                  id={`gender-filter-${g}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Case table */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-slate-50 flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{filtered.length} anonymized subject{filtered.length !== 1 ? "s" : ""} matching criteria</span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No cases match the selected filters.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c) => (
              <button
                key={c.caseId}
                onClick={() => router.push(`/research/cases/${c.caseId}`)}
                className="w-full text-left px-5 py-4 hover:bg-slate-50/60 transition-colors flex items-center gap-4"
                id={`case-row-${c.caseId}`}
              >
                <div className="min-w-0 flex-1 grid grid-cols-6 gap-3 items-center text-xs">
                  <div className="col-span-1">
                    <p className="font-bold text-foreground font-clinical text-[11px]">{c.subjectHash}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{c.ageBracket} · {c.gender}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-semibold text-foreground truncate">{c.primaryCondition}</p>
                    <p className="text-[10px] font-clinical text-muted-foreground">{c.icd10Code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{c.encounterCount} encounters · {c.regimenLengthDays}d regimen</p>
                    <p className="text-[10px] text-muted-foreground truncate">{c.prescribedMolecules.slice(0,2).join(", ")}{c.prescribedMolecules.length > 2 ? " +" + (c.prescribedMolecules.length - 2) : ""}</p>
                  </div>
                  <div>
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", OUTCOME_COLORS[c.outcome])}>
                      {c.outcome}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
