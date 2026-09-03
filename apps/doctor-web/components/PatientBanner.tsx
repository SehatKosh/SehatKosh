"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, X, Activity, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConsentCountdown } from "./ConsentCountdown";
import type { Patient } from "@/lib/mockData";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface PatientBannerProps {
  patient: Patient;
}

export function PatientBanner({ patient }: PatientBannerProps) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-30 h-16 bg-white border-b border-border flex items-center px-6 gap-4 shadow-sm">
      {/* Left: Demographics */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
          {patient.initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-foreground leading-tight">{patient.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{patient.medicalId}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            {patient.age} Y • {patient.gender} • Blood: {patient.bloodGroup}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-border mx-1 shrink-0" />

      {/* Center: Critical Safety Flags */}
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
        {patient.allergies.length > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-md px-2.5 py-1 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span className="text-xs font-semibold text-red-700 whitespace-nowrap">
              Allergies:{" "}
              {patient.allergies.map((a) => `${a.substance} (${a.severity})`).join(", ")}
            </span>
          </div>
        )}
        {patient.chronicConditions.map((cond) => (
          <Badge key={cond} variant="outline" className="shrink-0 text-[11px]">
            <Tag className="h-3 w-3" />
            {cond}
          </Badge>
        ))}
      </div>

      {/* Right: Consent & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {patient.accessStatus === "active" && (
          <ConsentCountdown expiresAt={patient.accessExpiresAt} />
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={() => {
            // In a real app: revoke consent via API
            router.push("/");
          }}
        >
          <X className="h-3.5 w-3.5" />
          Close Dossier
        </Button>
      </div>
    </div>
  );
}
