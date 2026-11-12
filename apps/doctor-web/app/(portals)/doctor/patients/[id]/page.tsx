"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  FileText,
  FileSearch,
  Activity,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Lock,
  Edit3,
  CheckCircle2,
  GitFork,
  Loader2,
  Eye,
  Paperclip,
} from "lucide-react";
import { PatientHeader } from "@/components/doctor/PatientHeader";
import { ClinicalSummaryCard } from "@/components/doctor/ClinicalSummaryCard";
import { TimelineFeed } from "@/components/TimelineFeed";
import { SoapViewer } from "@/components/SoapViewer";
import { DocumentVisualizer } from "@/components/DocumentVisualizer";
import { VitalsAnalytics } from "@/components/VitalsAnalytics";
import { SafetyMatrix } from "@/components/SafetyMatrix";
import { ProvenanceBadge } from "@/components/doctor/ProvenanceBadge";
import { TriageVitalsCard } from "@/components/doctor/TriageVitalsCard";
import { SoapNoteEditor } from "@/components/doctor/SoapNoteEditor";
import { MedicationInteractionBanner } from "@/components/doctor/MedicationInteractionBanner";
import { AmendEncounterModal } from "@/components/doctor/AmendEncounterModal";
import { AttachmentViewerModal } from "@/components/doctor/AttachmentViewerModal";
import { Button } from "@/components/ui/button";
import { usePatient } from "@/hooks/usePatient";
import { usePatientVitals } from "@/hooks/usePatientVitals";
import { useConsentSession } from "@/hooks/useConsentSession";
import { useToast } from "@/components/ToastProvider";
import { RequestAccessModal } from "@/components/RequestAccessModal";
import {
  finalizeEncounter,
  checkInteractions,
  type InteractionAlert,
} from "@/lib/api-client";
import type { Encounter } from "@/lib/mockData";

interface PageProps {
  params?: { id?: string };
}

export default function DoctorDossierPage({ params }: PageProps) {
  const routeParams = useParams<{ id: string }>();
  const id = (routeParams?.id as string) || (params?.id as string) || "";
  const router = useRouter();
  const { showToast } = useToast();

  const { data: dossier, isLoading, error } = usePatient(id);
  const { data: vitalsData } = usePatientVitals(id);

  const [selectedEncounterId, setSelectedEncounterId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<"soap" | "document" | "vitals" | "safety">("soap");
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [amendModalOpen, setAmendModalOpen] = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);

  // Editor vs Viewer mode for SOAP notes
  const [isEditorMode, setIsEditorMode] = useState(false);

  // SOAP Editor form state
  const [soapSubjective, setSoapSubjective] = useState("");
  const [soapObjective, setSoapObjective] = useState("");
  const [soapAssessment, setSoapAssessment] = useState<{ clinical_impression?: string; [k: string]: any }>({});
  const [soapPlan, setSoapPlan] = useState("");
  const [medications, setMedications] = useState<Array<{ name: string; dosage?: string; frequency?: string; duration?: string }>>([]);

  // Safety Engine & Interaction state
  const [interactionAlerts, setInteractionAlerts] = useState<InteractionAlert[]>([]);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);

  // Encounter status & Finalization
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [localFinalizedEncounters, setLocalFinalizedEncounters] = useState<Record<string, boolean>>({});

  const consentSession = useConsentSession(dossier?.patient.accessExpiresAt);

  const { patient, encounters, interactions } = dossier || {
    patient: null,
    encounters: [],
    interactions: [],
  };

  const selectedEncounter = encounters.find((e) => e.id === selectedEncounterId) ?? encounters[0];

  // Sync editor fields when selected encounter changes
  useEffect(() => {
    if (selectedEncounter) {
      const subj =
        typeof selectedEncounter.soap?.subjective === "string"
          ? selectedEncounter.soap.subjective
          : selectedEncounter.soap?.subjective?.patientStatement ||
            selectedEncounter.soap?.subjective?.chiefComplaints ||
            selectedEncounter.summary ||
            "";

      const obj =
        typeof selectedEncounter.soap?.objective === "string"
          ? selectedEncounter.soap.objective
          : selectedEncounter.soap?.objective?.observations ||
            "Vitals stable. Cardiovascular & respiratory exam unremarkable.";

      const assessObj =
        typeof selectedEncounter.soap?.assessment === "string"
          ? { clinical_impression: selectedEncounter.soap.assessment }
          : selectedEncounter.soap?.assessment
          ? {
              clinical_impression: selectedEncounter.soap.assessment.primaryDiagnosis,
              icd10_codes: selectedEncounter.soap.assessment.icd10Code
                ? [{ code: selectedEncounter.soap.assessment.icd10Code, description: selectedEncounter.soap.assessment.icd10Display }]
                : [],
            }
          : { clinical_impression: "Acute Upper Respiratory Presentation" };

      const planStr =
        typeof selectedEncounter.soap?.plan === "string"
          ? selectedEncounter.soap.plan
          : selectedEncounter.soap?.plan?.instructions ||
            "Prescribed supportive regimen and hydration.";

      setSoapSubjective(subj);
      setSoapObjective(obj);
      setSoapAssessment(assessObj);
      setSoapPlan(planStr);
      setMedications(
        selectedEncounter.drugs.map((drug) => ({
          name: drug,
          dosage: "500mg",
          frequency: "1-0-1",
          duration: "5 days",
        }))
      );
      setOverrideConfirmed(false);
    }
  }, [selectedEncounter?.id]);

  // Debounced safety check on proposed medications + patient allergies
  useEffect(() => {
    if (!patient || medications.length === 0) {
      setInteractionAlerts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingInteractions(true);
      try {
        const medNames = medications.map((m) => m.name);
        const allergyStrings = (patient.allergies || []).map((a: any) =>
          typeof a === "string" ? a : a.substance || String(a)
        );
        const res = await checkInteractions({
          allergies: allergyStrings,
          proposed_medications: medNames,
        });

        if (!res.safe && res.alerts.length > 0) {
          setInteractionAlerts(res.alerts);
        } else {
          setInteractionAlerts([]);
        }
      } catch (err) {
        console.warn("Safety check failed:", err);
      } finally {
        setIsCheckingInteractions(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [medications, patient?.allergies]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-20">
        Loading patient dossier...
      </div>
    );
  }

  if (error || !dossier || !patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4 space-y-3">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h2 className="text-lg font-bold text-foreground">Patient Not Found</h2>
        <p className="text-xs text-muted-foreground">The requested medical record could not be loaded.</p>
        <Button size="sm" onClick={() => router.push("/doctor/queue")}>Return to Queue</Button>
      </div>
    );
  }

  const isLockedOut = Boolean(dossier.locked || consentSession.isExpired || patient.accessStatus === "expired");
  const isEncounterFinalized =
    Boolean(localFinalizedEncounters[selectedEncounter?.id || ""]) ||
    (selectedEncounter as any)?.status === "FINALIZED" ||
    selectedEncounter?.type !== "soap_note";

  // Finalize handler
  const handleFinalizeEncounter = async () => {
    if (!selectedEncounter) return;

    if (interactionAlerts.length > 0 && !overrideConfirmed) {
      showToast("Cannot finalize: Please acknowledge the critical drug interaction alert first.", "error");
      return;
    }

    setIsFinalizing(true);
    try {
      const res = await finalizeEncounter(selectedEncounter.id);
      if (res.success) {
        setLocalFinalizedEncounters((prev) => ({ ...prev, [selectedEncounter.id]: true }));
        setIsEditorMode(false);
        showToast("Encounter legally finalized and signed. Record is now immutable.", "success");
      } else {
        throw new Error("Finalization call was rejected by the server.");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to finalize encounter", "error");
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden relative bg-slate-50">
      {/* Sticky Patient Header */}
      <PatientHeader patient={patient} onEndSession={() => router.push("/doctor/queue")} />

      {/* Clinical Summary Card */}
      <ClinicalSummaryCard patient={patient} latestEncounter={encounters[0]} />

      {/* Dual-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Timeline (35%) */}
        <div className="w-[380px] bg-white border-r border-border flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-border bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Encounter History ({encounters.length})
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Dual-custody verified records</p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Longitudinal EMR
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <TimelineFeed
              encounters={encounters}
              selectedId={selectedEncounter?.id}
              onSelect={(enc) => {
                setSelectedEncounterId(enc.id);
                setIsEditorMode(false);
              }}
            />
          </div>
        </div>

        {/* Right Pane: Clinical Inspector (65%) */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          {/* Top Encounter Action Header */}
          <div className="px-5 py-3 border-b border-border bg-slate-50/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <ProvenanceBadge
                status={(selectedEncounter as any)?.verification_status || (selectedEncounter?.type === "prescription" ? "UNVERIFIED_OCR" : "CLINICIAN_VERIFIED")}
                sourceType={(selectedEncounter as any)?.source_type || (selectedEncounter?.type === "prescription" ? "PATIENT_MOBILE_OCR" : "HOSPITAL_EMR_NATIVE")}
              />

              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                  isEncounterFinalized
                    ? "bg-slate-100 text-slate-700 border-slate-200"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                {isEncounterFinalized ? "Status: FINALIZED (Immutable)" : "Status: ACTIVE CLINICAL NOTE"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttachmentModalOpen(true)}
                className="gap-1.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                <Paperclip className="w-3.5 h-3.5 text-sky-600" />
                Attachments
              </Button>

              {activeTab === "soap" && (
                <>
                  {isEncounterFinalized ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAmendModalOpen(true)}
                      className="gap-1.5 text-xs border-amber-300 text-amber-900 hover:bg-amber-50"
                    >
                      <GitFork className="w-3.5 h-3.5 text-amber-600" />
                      Amend Encounter
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditorMode(!isEditorMode)}
                        className="gap-1.5 text-xs"
                      >
                        {isEditorMode ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            Preview Note
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Scribe Note
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        disabled={isFinalizing || (interactionAlerts.length > 0 && !overrideConfirmed)}
                        onClick={handleFinalizeEncounter}
                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isFinalizing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Finalizing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Finalize & Sign Encounter
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="px-5 py-2 border-b border-border bg-slate-50/50 flex items-center gap-1 shrink-0">
            {[
              { id: "soap", label: "SOAP Note", icon: FileText },
              { id: "document", label: "Prescription Scan", icon: FileSearch },
              { id: "vitals", label: "Wearables & Vitals", icon: Activity },
              {
                id: "safety",
                label: "Drug Safety",
                icon: ShieldAlert,
                badge: interactions.length > 0 ? interactions.length : undefined,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:bg-slate-200/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="bg-red-500 text-white text-[10px] font-mono px-1.5 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {/* Triage intake vitals card if available */}
            {selectedEncounter && (
              <TriageVitalsCard
                vitals={
                  (selectedEncounter as any)?.vitals_snapshot || {
                    bp_systolic: 125,
                    bp_diastolic: 82,
                    pulse: 76,
                    temperature_f: 98.6,
                    spo2: 98,
                    respiratory_rate: 16,
                    gcs: 15,
                  }
                }
                priority={(selectedEncounter as any)?.triage_priority || "ROUTINE"}
                admittedAt={selectedEncounter.date}
              />
            )}

            {/* Non-dismissible Safety Contraindication Banner */}
            {interactionAlerts.length > 0 && (
              <MedicationInteractionBanner
                alerts={interactionAlerts}
                overrideConfirmed={overrideConfirmed}
                onOverrideChange={setOverrideConfirmed}
                showOverrideCheckbox={!isEncounterFinalized}
              />
            )}

            {/* Tab: SOAP Note */}
            {activeTab === "soap" && selectedEncounter && (
              <>
                {isEditorMode && !isEncounterFinalized ? (
                  <SoapNoteEditor
                    subjective={soapSubjective}
                    objective={soapObjective}
                    assessment={soapAssessment}
                    plan={soapPlan}
                    medications={medications}
                    onChange={(field, val) => {
                      if (field === "subjective") setSoapSubjective(val);
                      if (field === "objective") setSoapObjective(val);
                      if (field === "assessment") setSoapAssessment(val);
                      if (field === "plan") setSoapPlan(val);
                    }}
                    onMedicationsChange={setMedications}
                    readOnly={isEncounterFinalized}
                  />
                ) : (
                  <SoapViewer encounter={selectedEncounter} patient={patient} />
                )}
              </>
            )}

            {/* Tab: Document Visualizer */}
            {activeTab === "document" && selectedEncounter && (
              <DocumentVisualizer encounter={selectedEncounter} />
            )}

            {/* Tab: Wearables & Vitals */}
            {activeTab === "vitals" && <VitalsAnalytics data={vitalsData ?? []} />}

            {/* Tab: Safety Matrix */}
            {activeTab === "safety" && <SafetyMatrix interactions={interactions} />}
          </div>
        </div>

        {/* Lockout overlay */}
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
                <Button variant="outline" className="flex-1 text-xs" onClick={() => router.push("/doctor/queue")}>
                  Return to Queue
                </Button>
                <Button className="flex-1 text-xs gap-1.5" onClick={() => setRequestModalOpen(true)}>
                  <RefreshCw className="h-3.5 w-3.5" /> Request Extension
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Access Request Modal */}
      <RequestAccessModal open={requestModalOpen} onOpenChange={setRequestModalOpen} preselectedPatient={patient} />

      {/* Amendment Modal */}
      <AmendEncounterModal
        open={amendModalOpen}
        onOpenChange={setAmendModalOpen}
        encounter={selectedEncounter}
        onSuccess={(amendmentId) => {
          showToast(`Amendment #${amendmentId.slice(0, 8)} recorded`, "success");
        }}
      />

      {/* S3 Attachment Vault Viewer Modal */}
      <AttachmentViewerModal
        open={attachmentModalOpen}
        onOpenChange={setAttachmentModalOpen}
        encounter={selectedEncounter}
      />
    </div>
  );
}
