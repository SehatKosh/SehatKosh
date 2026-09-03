"use client";

import React, { useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  FileSearch,
  Activity,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Lock,
} from "lucide-react";
import { PatientBanner } from "@/components/PatientBanner";
import { TimelineFeed } from "@/components/TimelineFeed";
import { SoapViewer } from "@/components/SoapViewer";
import { DocumentVisualizer } from "@/components/DocumentVisualizer";
import { VitalsAnalytics } from "@/components/VitalsAnalytics";
import { SafetyMatrix } from "@/components/SafetyMatrix";
import { Button } from "@/components/ui/button";
import { usePatient } from "@/hooks/usePatient";
import { usePatientVitals } from "@/hooks/usePatientVitals";
import { useConsentSession } from "@/hooks/useConsentSession";
import type { Encounter } from "@/lib/mockData";
import { RequestAccessModal } from "@/components/RequestAccessModal";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PatientDossierPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: dossier, isLoading, error } = usePatient(id);
  const { data: vitalsData } = usePatientVitals(id);

  const [selectedEncounterId, setSelectedEncounterId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<"soap" | "document" | "vitals" | "safety">("soap");
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const consentSession = useConsentSession(dossier?.patient.accessExpiresAt);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-20">
        Loading patient dossier...
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4 space-y-3">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h2 className="text-lg font-bold text-foreground">Patient Not Found</h2>
        <p className="text-xs text-muted-foreground">The requested medical record could not be loaded.</p>
        <Button size="sm" onClick={() => router.push("/")}>Return to Roster</Button>
      </div>
    );
  }

  const { patient, encounters, interactions } = dossier;
  const selectedEncounter = encounters.find((e) => e.id === selectedEncounterId) ?? encounters[0];

  const isLockedOut = consentSession.isExpired || patient.accessStatus === "expired";

  return (
    <div className="flex flex-col h-screen overflow-hidden relative bg-slate-50">
      {/* Sticky Patient Context Header */}
      <PatientBanner patient={patient} />

      {/* Main 2-Pane Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Encounters Timeline (420px) */}
        <div className="w-[420px] bg-white border-r border-border flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-border bg-slate-50/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Longitudinal Encounter History ({encounters.length})
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <TimelineFeed
              encounters={encounters}
              selectedId={selectedEncounter?.id}
              onSelect={(enc) => setSelectedEncounterId(enc.id)}
            />
          </div>
        </div>

        {/* Right Pane: Contextual Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          {/* Workspace Tabs Header */}
          <div className="px-6 py-2.5 border-b border-border bg-slate-50/50 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-1">
              {[
                { id: "soap", label: "SOAP Breakdown", icon: FileText },
                { id: "document", label: "OCR & Document Canvas", icon: FileSearch },
                { id: "vitals", label: "Vitals & Telemetry", icon: Activity },
                {
                  id: "safety",
                  label: "Drug Safety Matrix",
                  icon: ShieldAlert,
                  badge: interactions.length > 0 ? interactions.length : undefined,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:bg-slate-200/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="bg-red-500 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Canvas */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "soap" && selectedEncounter && (
              <SoapViewer encounter={selectedEncounter} patient={patient} />
            )}
            {activeTab === "document" && selectedEncounter && (
              <DocumentVisualizer encounter={selectedEncounter} />
            )}
            {activeTab === "vitals" && (
              <VitalsAnalytics data={vitalsData ?? []} />
            )}
            {activeTab === "safety" && (
              <SafetyMatrix interactions={interactions} />
            )}
          </div>
        </div>

        {/* Consent Expiry Lockout Overlay */}
        {isLockedOut && (
          <div className="absolute inset-0 z-40 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
                <Lock className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Consent Window Expired</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Patient authorization for <strong>{patient.name}</strong> has concluded.
                  Request an access extension to re-enable clinical inspection.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 text-xs" onClick={() => router.push("/")}>
                  Return to Roster
                </Button>
                <Button className="flex-1 text-xs gap-1.5" onClick={() => setRequestModalOpen(true)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Request Extension
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <RequestAccessModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        preselectedPatient={patient}
      />
    </div>
  );
}
