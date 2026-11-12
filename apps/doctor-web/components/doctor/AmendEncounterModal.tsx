"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ToastProvider";
import { amendEncounter, type AmendmentPayload } from "@/lib/api-client";
import { AlertCircle, History, Loader2, GitFork } from "lucide-react";
import type { Encounter } from "@/lib/mockData";

interface AmendEncounterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encounter: Encounter | null;
  onSuccess?: (newEncounterId: string) => void;
}

export function AmendEncounterModal({
  open,
  onOpenChange,
  encounter,
  onSuccess,
}: AmendEncounterModalProps) {
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [planAddendum, setPlanAddendum] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!encounter) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast("Please provide a clinical justification for the amendment.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const subjectiveText =
        typeof encounter.soap?.subjective === "string"
          ? encounter.soap.subjective
          : encounter.soap?.subjective?.patientStatement ||
            encounter.soap?.subjective?.chiefComplaints ||
            encounter.summary ||
            "";

      const objectiveText =
        typeof encounter.soap?.objective === "string"
          ? encounter.soap.objective
          : encounter.soap?.objective?.observations || "";

      const assessmentObj =
        typeof encounter.soap?.assessment === "string"
          ? { clinical_impression: encounter.soap.assessment }
          : encounter.soap?.assessment
          ? {
              clinical_impression: encounter.soap.assessment.primaryDiagnosis,
              icd10_code: encounter.soap.assessment.icd10Code,
            }
          : undefined;

      const planText =
        typeof encounter.soap?.plan === "string"
          ? encounter.soap.plan
          : encounter.soap?.plan?.instructions || "";

      const payload: AmendmentPayload = {
        reason: reason.trim(),
        soap_subjective: subjectiveText,
        soap_objective: objectiveText,
        soap_assessment: assessmentObj,
        soap_plan: planAddendum
          ? `${planText}\n[Addendum]: ${planAddendum.trim()}`
          : planText,
        physician_name: "Dr. Sarah Khan (PIMS)",
      };

      const res = await amendEncounter(encounter.id, payload);
      if (res.success && res.amendment_id) {
        showToast("Clinical amendment recorded successfully.", "success");
        onOpenChange(false);
        setReason("");
        setPlanAddendum("");
        if (onSuccess) onSuccess(res.amendment_id);
      } else {
        throw new Error(res.error || "Failed to submit encounter amendment.");
      }
    } catch (err: any) {
      showToast(err?.message || "Amendment submission failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-border">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <GitFork className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Amend Finalized Encounter</h2>
              <p className="text-xs text-muted-foreground">
                Original Encounter: {encounter.id.slice(0, 8)}... (Legally Immutable)
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              In compliance with hospital governance and enterprise EMR standards, finalized records cannot be directly overwritten. This creates an append-only child amendment record linked to the parent encounter.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Clinical Justification / Amendment Reason <span className="text-red-500">*</span>
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Patient contacted clinic reporting allergic rash; updated medication regimen"
              className="text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Addendum / Updated Care Plan
            </label>
            <textarea
              rows={4}
              value={planAddendum}
              onChange={(e) => setPlanAddendum(e.target.value)}
              placeholder="Document updated clinical findings, medication modifications, or follow-up instructions..."
              className="w-full text-xs p-3 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !reason.trim()}
              className="gap-2 bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Recording Amendment...
                </>
              ) : (
                <>
                  <History className="w-3.5 h-3.5" />
                  Sign & File Amendment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AmendEncounterModal;

