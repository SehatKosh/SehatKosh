"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/lib/mockData";
import { MOCK_HOSPITAL_STAFF } from "@/lib/mockData";

type PollingState = "pending" | "approved" | "rejected";

interface ConsentPollingCardProps {
  patient: Patient;
  doctorId: string;
  duration: string;
  onAddToQueue: () => void;
  onCancel: () => void;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return "0" + digits.slice(1, 4) + "-***" + digits.slice(-4);
}

export function ConsentPollingCard({
  patient,
  doctorId,
  duration,
  onAddToQueue,
  onCancel,
}: ConsentPollingCardProps) {
  const [state, setState] = useState<PollingState>("pending");
  const [dots, setDots] = useState(".");

  const doctor = MOCK_HOSPITAL_STAFF.find((s) => s.id === doctorId);

  // Simulate auto-approval after 4 seconds (demo)
  useEffect(() => {
    if (state !== "pending") return;
    const timer = setTimeout(() => setState("approved"), 4000);
    return () => clearTimeout(timer);
  }, [state]);

  // Animated dots
  useEffect(() => {
    if (state !== "pending") return;
    const interval = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(interval);
  }, [state]);

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* State banner */}
      {state === "pending" && (
        <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border-b border-amber-200">
          <span className="relative flex h-4 w-4 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-amber-500" />
          </span>
          <p className="text-sm font-semibold text-amber-800">
            Authorization request sent to {patient.name}&apos;s phone ({maskPhone(patient.phone)}){dots}
          </p>
        </div>
      )}

      {state === "approved" && (
        <div className="flex items-center gap-3 px-5 py-4 bg-green-50 border-b border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">
            Approved by Patient via Mobile App · Granted for {duration}
          </p>
        </div>
      )}

      {state === "rejected" && (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border-b border-red-200">
          <XCircle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-800">
            Request Rejected by Patient
          </p>
        </div>
      )}

      {/* Details */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{patient.name}</span>
          <span>·</span>
          <span>{patient.medicalId}</span>
          <span>·</span>
          <span>Assigned to {doctor?.name ?? "—"}</span>
        </div>

        {state === "pending" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Waiting for patient response on SehatKosh mobile app…
            <button
              type="button"
              onClick={() => setState("rejected")}
              className="ml-auto text-red-500 hover:underline text-[11px]"
            >
              Simulate Reject
            </button>
          </div>
        )}

        {state === "approved" && (
          <Button
            id="add-to-queue-btn"
            className="w-full gap-2"
            onClick={onAddToQueue}
          >
            Add to {doctor?.name}&apos;s Waiting Queue
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {state === "rejected" && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 text-xs" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="flex-1 text-xs" onClick={() => setState("pending")}>
              Resend Request
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
