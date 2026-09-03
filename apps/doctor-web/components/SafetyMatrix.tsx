"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Copy,
  CheckCircle,
  FileEdit,
} from "lucide-react";
import { Button } from "./ui/button";
import type { DrugInteraction } from "@/lib/mockData";
import { copyToClipboard } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SafetyMatrixProps {
  interactions: DrugInteraction[];
}

function OverrideModal({
  interaction,
  onConfirm,
  onCancel,
}: {
  interaction: DrugInteraction;
  onConfirm: (rationale: string) => void;
  onCancel: () => void;
}) {
  const [rationale, setRationale] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-border shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0" />
          <h2 className="text-base font-semibold">Clinical Override Required</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          You are overriding a <strong className="text-red-600">Critical</strong> drug-allergy contraindication.
          Please document your clinical rationale before proceeding.
        </p>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">
            Clinical Justification <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            placeholder="e.g., Patient has confirmed tolerance via controlled challenge test..."
            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            variant="warning"
            size="sm"
            disabled={rationale.trim().length < 20}
            onClick={() => onConfirm(rationale)}
          >
            Confirm Override
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SafetyMatrix({ interactions }: SafetyMatrixProps) {
  const [overridingInteraction, setOverridingInteraction] = useState<DrugInteraction | null>(null);
  const [overriddenIds, setOverriddenIds] = useState<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState("");

  const criticalCount = interactions.filter((i) => i.severity === "critical").length;
  const hasCritical = criticalCount > 0;

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const handleOverrideConfirm = (rationale: string) => {
    if (!overridingInteraction) return;
    const key = `${overridingInteraction.molecule1}-${overridingInteraction.molecule2}`;
    setOverriddenIds((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setOverridingInteraction(null);
    // In a real app: dispatch audit event with rationale
    console.log("Clinical Override:", { interaction: overridingInteraction, rationale });
  };

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {hasCritical ? (
        <div className="flex items-center gap-3 bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3">
          <ShieldAlert className="h-6 w-6 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">
              CRITICAL CONTRAINDICATION DETECTED ({criticalCount})
            </p>
            <p className="text-xs text-red-600">
              Immediate clinical review required. Do not administer flagged medications.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-700">
            No pharmacological contraindications detected with active regimen.
          </p>
        </div>
      )}

      {/* Interaction Cards */}
      {interactions.map((interaction) => {
        const key = `${interaction.molecule1}-${interaction.molecule2}`;
        const isOverridden = overriddenIds.has(key);

        return (
          <div
            key={key}
            className={cn(
              "rounded-xl border p-5 space-y-3",
              isOverridden
                ? "border-amber-200 bg-amber-50"
                : interaction.severity === "critical"
                ? "border-red-300 bg-red-50"
                : "border-amber-200 bg-amber-50"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full",
                      interaction.severity === "critical"
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                    )}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {interaction.severity === "critical"
                      ? "Level 1 — Critical / Anaphylaxis Risk"
                      : "Level 2 — Moderate"}
                  </span>
                  <span className="text-xs text-muted-foreground bg-white border border-border rounded-full px-2.5 py-0.5">
                    {interaction.type === "drug-allergy"
                      ? "Drug-Allergy Cross-Reactivity"
                      : "Drug-Drug Interaction"}
                  </span>
                </div>
              </div>
              {isOverridden && (
                <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2.5 py-0.5 font-semibold shrink-0">
                  Clinically Overridden
                </span>
              )}
            </div>

            {/* Molecules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border border-red-200 rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-1">
                  Prescribed Drug
                </p>
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  {interaction.molecule1}
                  <button onClick={() => handleCopy(interaction.molecule1)} className="text-muted-foreground hover:text-primary">
                    {copiedText === interaction.molecule1 ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{interaction.molecule1Source}</p>
              </div>
              <div className="bg-white border border-red-200 rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-1">
                  Known Allergy / Interacting Drug
                </p>
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  {interaction.molecule2}
                  <button onClick={() => handleCopy(interaction.molecule2)} className="text-muted-foreground hover:text-primary">
                    {copiedText === interaction.molecule2 ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{interaction.molecule2Source}</p>
              </div>
            </div>

            {/* Mechanism */}
            <div className="space-y-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Mechanism of Action
                </p>
                <p className="text-xs text-foreground leading-relaxed">{interaction.mechanism}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Clinical Note
                </p>
                <p className="text-xs text-foreground leading-relaxed">{interaction.clinicalNote}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-1">
                  Suggested Alternative
                </p>
                <p className="text-xs text-foreground">{interaction.suggestedAlternative}</p>
              </div>
            </div>

            {/* Override action */}
            {!isOverridden && (
              <div className="flex justify-end pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                  onClick={() => setOverridingInteraction(interaction)}
                >
                  <FileEdit className="h-3.5 w-3.5" />
                  Mark as Clinically Overridden
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Override Modal */}
      {overridingInteraction && (
        <OverrideModal
          interaction={overridingInteraction}
          onConfirm={handleOverrideConfirm}
          onCancel={() => setOverridingInteraction(null)}
        />
      )}
    </div>
  );
}
