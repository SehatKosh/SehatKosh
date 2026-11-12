"use client";

import React from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, User, FileText, Smartphone, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProvenanceBadgeProps {
  status?: string;
  sourceType?: string;
  className?: string;
}

export function ProvenanceBadge({ status = "CLINICIAN_VERIFIED", sourceType, className }: ProvenanceBadgeProps) {
  const normStatus = (status || "").toUpperCase();

  const getStatusConfig = () => {
    switch (normStatus) {
      case "CLINICIAN_VERIFIED":
        return {
          label: "Clinician Verified",
          icon: ShieldCheck,
          containerClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
          iconClass: "text-emerald-600",
        };
      case "PATIENT_CONFIRMED":
        return {
          label: "Patient Confirmed",
          icon: CheckCircle2,
          containerClass: "bg-blue-50 text-blue-800 border-blue-200",
          iconClass: "text-blue-600",
        };
      case "UNVERIFIED_OCR":
      case "OCR_PENDING_REVIEW":
        return {
          label: "Unverified OCR",
          icon: AlertTriangle,
          containerClass: "bg-amber-50 text-amber-800 border-amber-200",
          iconClass: "text-amber-600",
        };
      case "PATIENT_SELF_REPORTED":
      default:
        return {
          label: "Self Reported",
          icon: User,
          containerClass: "bg-slate-100 text-slate-800 border-slate-200",
          iconClass: "text-slate-600",
        };
    }
  };

  const getSourceIcon = (src?: string) => {
    switch ((src || "").toUpperCase()) {
      case "PATIENT_MOBILE_OCR":
        return { icon: Smartphone, label: "Mobile Scan" };
      case "HOSPITAL_PLUGIN_IMPORT":
        return { icon: Database, label: "External Import" };
      case "HOSPITAL_EMR_NATIVE":
      default:
        return { icon: FileText, label: "Hospital EMR" };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const sourceConfig = sourceType ? getSourceIcon(sourceType) : null;
  const SourceIcon = sourceConfig?.icon;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs transition-colors",
          statusConfig.containerClass
        )}
      >
        <StatusIcon className={cn("w-3.5 h-3.5 shrink-0", statusConfig.iconClass)} />
        <span>{statusConfig.label}</span>
      </span>

      {sourceConfig && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
          <SourceIcon className="w-3 h-3 text-slate-400" />
          <span>{sourceConfig.label}</span>
        </span>
      )}
    </div>
  );
}

export default ProvenanceBadge;

