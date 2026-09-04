"use client";

import React, { useState } from "react";
import { ShieldOff, AlertTriangle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";

interface BreakGlassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGranted: () => void;
}

export function BreakGlassModal({ open, onOpenChange, onGranted }: BreakGlassModalProps) {
  const [physician, setPhysician] = useState("");
  const [justification, setJustification] = useState("");
  const [witnessId, setWitnessId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [granted, setGranted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!physician.trim()) { setError("Treating physician name is required."); return; }
    if (justification.trim().length < 20) { setError("Please provide a detailed clinical justification (min 20 chars)."); return; }
    if (!witnessId.trim()) { setError("Witness Staff ID is required."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setGranted(true);
    // Auto-close after confirmation
    setTimeout(() => { onGranted(); onOpenChange(false); setGranted(false); }, 2000);
  };

  const handleClose = () => {
    if (!loading) { onOpenChange(false); setGranted(false); setError(""); }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <ShieldOff className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-foreground">Emergency Break-Glass Access</Dialog.Title>
                <Dialog.Description className="text-xs text-red-600 font-semibold mt-0.5">
                  ⚠ This action is audited and flagged as high-priority
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {granted ? (
            <div className="text-center py-6 space-y-3">
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <ShieldOff className="h-7 w-7 text-green-600" />
              </div>
              <p className="text-sm font-bold text-green-700">Emergency Access Granted</p>
              <p className="text-xs text-muted-foreground">2-hour access granted. Encounter flagged as high-priority in Admin Audit Log.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-5">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  For unconscious, trauma, or emergency patients unable to consent via mobile. Immediate 2-hour access is granted and recorded in the HIPAA audit ledger.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Treating ER Physician Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bg-physician"
                    type="text"
                    value={physician}
                    onChange={(e) => setPhysician(e.target.value)}
                    placeholder="Dr. Full Name"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Clinical Emergency Justification <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="bg-justification"
                    rows={3}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Describe the clinical emergency requiring immediate record access..."
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Witness Staff ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bg-witness"
                    type="text"
                    value={witnessId}
                    onChange={(e) => setWitnessId(e.target.value)}
                    placeholder="Staff badge ID (e.g. SHF-2891)"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={loading}
                  id="bg-submit"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                  Grant Emergency Access
                </Button>
              </form>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
