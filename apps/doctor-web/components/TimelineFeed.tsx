"use client";

import React, { useState } from "react";
import { FileText, Pill, FlaskConical, Activity, ChevronRight, Clock } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import type { Encounter, EncounterType } from "@/lib/mockData";
import { Badge } from "./ui/badge";

const TYPE_FILTERS = ["All Records", "Doctor Visits (SOAP)", "Prescriptions", "Lab Reports", "Wearable Summaries"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

function typeToFilter(type: EncounterType): TypeFilter {
  switch (type) {
    case "soap_note": return "Doctor Visits (SOAP)";
    case "prescription": return "Prescriptions";
    case "lab_report": return "Lab Reports";
    case "wearable_summary": return "Wearable Summaries";
  }
}

function EncounterIcon({ type }: { type: EncounterType }) {
  const cls = "h-3.5 w-3.5";
  switch (type) {
    case "soap_note": return <FileText className={cls} />;
    case "prescription": return <Pill className={cls} />;
    case "lab_report": return <FlaskConical className={cls} />;
    case "wearable_summary": return <Activity className={cls} />;
  }
}

function typeLabel(type: EncounterType) {
  switch (type) {
    case "soap_note": return "Clinical Scribe Note";
    case "prescription": return "Scanned Prescription";
    case "lab_report": return "Lab Report";
    case "wearable_summary": return "Wearable Summary";
  }
}

function groupByMonth(encounters: Encounter[]): Record<string, Encounter[]> {
  const groups: Record<string, Encounter[]> = {};
  for (const enc of encounters) {
    const key = new Date(enc.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(enc);
  }
  return groups;
}

interface TimelineFeedProps {
  encounters: Encounter[];
  selectedId?: string;
  onSelect: (encounter: Encounter) => void;
}

export function TimelineFeed({ encounters, selectedId, onSelect }: TimelineFeedProps) {
  const [activeFilter, setActiveFilter] = useState<TypeFilter>("All Records");

  const filtered = encounters.filter(
    (e) => activeFilter === "All Records" || typeToFilter(e.type) === activeFilter
  );

  const groups = groupByMonth(filtered);

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-border space-y-2 shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                activeFilter === f
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground border-border hover:bg-slate-50"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {Object.keys(groups).length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No records found.</p>
        ) : (
          Object.entries(groups).map(([month, encs]) => (
            <div key={month}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                {month}
              </p>
              <div className="space-y-2">
                {encs.map((enc) => {
                  const isSelected = enc.id === selectedId;
                  return (
                    <button
                      key={enc.id}
                      onClick={() => onSelect(enc)}
                      className={cn(
                        "w-full text-left rounded-xl border p-3.5 transition-all group",
                        isSelected
                          ? "border-primary bg-blue-50/40 shadow-sm"
                          : "border-border bg-white hover:border-primary/40 hover:bg-slate-50"
                      )}
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <EncounterIcon type={enc.type} />
                          <span>{typeLabel(enc.type)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono shrink-0">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(enc.date)}
                        </div>
                      </div>

                      {/* Physician */}
                      <p className="text-xs text-muted-foreground mb-1.5">
                        {enc.physician} • {enc.clinic}
                      </p>

                      {/* Summary snippet */}
                      <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                        {enc.summary}
                      </p>

                      {/* Drug tags */}
                      {enc.drugs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {enc.drugs.map((drug) => (
                            <span
                              key={drug}
                              className="inline-block bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-full"
                            >
                              {drug}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
