"use client";

import React, { useState } from "react";
import { Users, UserPlus, ShieldCheck, Stethoscope } from "lucide-react";
import { PatientTable } from "@/components/PatientTable";
import { RequestAccessModal } from "@/components/RequestAccessModal";
import { MOCK_PATIENTS, type Patient } from "@/lib/mockData";
import { Button } from "@/components/ui/button";

export default function ClinicalRosterPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>();

  const handleRequestAccess = (patient?: Patient) => {
    setSelectedPatient(patient);
    setModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" />
            Clinical Roster
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Active patient consultation queue & access authorization desk
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => handleRequestAccess()} className="gap-2 text-xs">
            <UserPlus className="h-4 w-4" />
            Direct Patient Lookup (QR / PIN)
          </Button>
        </div>
      </div>

      {/* Roster Table */}
      <PatientTable patients={MOCK_PATIENTS} onRequestAccess={handleRequestAccess} />

      {/* Access Request Modal */}
      <RequestAccessModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        preselectedPatient={selectedPatient}
      />
    </div>
  );
}
