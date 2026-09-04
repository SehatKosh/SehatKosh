"use client";

import React from "react";
import { AlertTriangle, Clock, Droplets, Shield } from "lucide-react";
import type { Patient } from "@/lib/mockData";
import { ConsentCountdown } from "@/components/ConsentCountdown";
import { cn } from "@/lib/utils";

interface PatientHeaderProps {
  patient: Patient;
  onEndSession?: () => void;
}

export function PatientHeader({ patient, onEndSession }: PatientHeaderProps) {
  const maskedCnic = patient.medicalId
    ? `37405-*******-${Math.floor(Math.random() * 9) + 1}`
    : "—";

  const severeAllergies = patient.allergies.filter((a) => a.severity === "Severe");
  const moderateAllergies = patient.allergies.filter((a) => a.severity === "Moderate");

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-border shadow-sm">
      <div className="flex items-center gap-4 px-5 py-3">
        {/* Left: Demographics */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{patient.initials}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-foreground">{patient.name}</h1>
                <span className="text-xs text-muted-foreground font-medium">
                  {patient.age}y · {patient.gender}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[11px] text-muted-foreground font-clinical">
                  MRN: {patient.medicalId}
                </span>
                <span className="text-[11px] text-muted-foreground font-clinical">
                  CNIC: {maskedCnic}
                </span>
                <div className="flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-red-500" />
                  <span className="text-[11px] font-bold text-red-600">{patient.bloodGroup}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Urgent contraindication badges */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {severeAllergies.map((a) => (
            <div
              key={a.substance}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-100 border border-red-300 shadow-sm"
            >
              <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
              <span className="text-[11px] font-bold text-red-700 whitespace-nowrap">
                ⚠ Allergy: {a.substance}
              </span>
            </div>
          ))}
          {moderateAllergies.map((a) => (
            <div
              key={a.substance}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-100 border border-amber-300"
            >
              <Shield className="h-3 w-3 text-amber-600 shrink-0" />
              <span className="text-[11px] font-semibold text-amber-700 whitespace-nowrap">
                {a.substance}
              </span>
            </div>
          ))}
          {patient.chronicConditions.map((c) => (
            <div
              key={c}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-orange-50 border border-orange-200"
            >
              <span className="text-[11px] font-medium text-orange-700 whitespace-nowrap">{c}</span>
            </div>
          ))}
        </div>

        {/* Right: Consent timer + End Session */}
        <div className="flex items-center gap-3 shrink-0">
          {patient.accessStatus === "active" && patient.accessExpiresAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-slate-50 border border-border rounded-lg px-3 py-2">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <ConsentCountdown expiresAt={patient.accessExpiresAt} />
            </div>
          )}
          <button
            onClick={onEndSession}
            className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 transition-colors"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}
