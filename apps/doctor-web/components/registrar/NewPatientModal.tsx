"use client";

import React, { useState } from "react";
import { User, X, CheckCircle2, AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NewPatientModalProps {
  open: boolean;
  onClose: () => void;
  onEnrolled: (name: string, mrn: string) => void;
}

interface NewPatientForm {
  fullName: string;
  cnic: string;
  phone: string;
  dateOfBirth: string;
  gender: "Male" | "Female";
  bloodGroup: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  knownAllergies: string;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELATIONS = ["Spouse", "Parent", "Sibling", "Child", "Guardian", "Friend", "Other"];

function generateMRN(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `SK-${num}-${letter}`;
}

export function NewPatientModal({ open, onClose, onEnrolled }: NewPatientModalProps) {
  const [form, setForm] = useState<NewPatientForm>({
    fullName: "",
    cnic: "",
    phone: "",
    dateOfBirth: "",
    gender: "Male",
    bloodGroup: "O+",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "Parent",
    knownAllergies: "",
  });
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<Partial<Record<keyof NewPatientForm, string>>>({});

  const set = (key: keyof NewPatientForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validateStep1 = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!form.cnic.trim()) newErrors.cnic = "CNIC is required";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    if (!form.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = () => {
    const mrn = generateMRN();
    onEnrolled(form.fullName, mrn);
    // Reset
    setForm({
      fullName: "", cnic: "", phone: "", dateOfBirth: "", gender: "Male",
      bloodGroup: "O+", emergencyName: "", emergencyPhone: "",
      emergencyRelation: "Parent", knownAllergies: "",
    });
    setStep(1);
    setErrors({});
  };

  const handleClose = () => {
    setStep(1);
    setErrors({});
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-foreground">New Patient Quick-Enrollment</h2>
            <p className="text-xs text-muted-foreground">Step {step} of 2 — {step === 1 ? "Patient Demographics" : "Emergency & Medical Info"}</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors" id="new-patient-modal-close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-slate-50">
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold",
                step > s ? "bg-primary text-white" : step === s ? "bg-primary/10 text-primary border-2 border-primary" : "bg-slate-200 text-slate-400")}>
                {step > s ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
              </div>
              {s < 2 && <div className={cn("flex-1 h-0.5", step > s ? "bg-primary" : "bg-slate-200")} />}
            </React.Fragment>
          ))}
        </div>

        <div className="px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              {/* Full name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="Muhammad Ahmed Khan"
                  className={cn("w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30",
                    errors.fullName ? "border-red-300 bg-red-50" : "border-border")}
                  id="new-patient-name"
                />
                {errors.fullName && <p className="text-[10px] text-red-600 mt-0.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.fullName}</p>}
              </div>

              {/* CNIC */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
                  CNIC <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.cnic}
                  onChange={(e) => set("cnic", e.target.value)}
                  placeholder="42101-1234567-1"
                  className={cn("w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 font-clinical",
                    errors.cnic ? "border-red-300 bg-red-50" : "border-border")}
                  id="new-patient-cnic"
                />
                {errors.cnic && <p className="text-[10px] text-red-600 mt-0.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.cnic}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="0300-1234567"
                  className={cn("w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 font-clinical",
                    errors.phone ? "border-red-300 bg-red-50" : "border-border")}
                  id="new-patient-phone"
                />
                {errors.phone && <p className="text-[10px] text-red-600 mt-0.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.phone}</p>}
              </div>

              {/* DOB */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                  className={cn("w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30",
                    errors.dateOfBirth ? "border-red-300 bg-red-50" : "border-border")}
                  id="new-patient-dob"
                />
                {errors.dateOfBirth && <p className="text-[10px] text-red-600 mt-0.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.dateOfBirth}</p>}
              </div>

              {/* Gender */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Gender</label>
                <div className="flex gap-2">
                  {(["Male", "Female"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => set("gender", g)}
                      className={cn("flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                        form.gender === g ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                      id={`gender-${g.toLowerCase()}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blood Group */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Blood Group</label>
                <div className="flex flex-wrap gap-1.5">
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => set("bloodGroup", bg)}
                      className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                        form.bloodGroup === bg ? "bg-red-600 text-white border-red-600" : "border-border text-muted-foreground hover:border-red-300")}
                      id={`bg-${bg.replace("+", "pos").replace("-", "neg")}`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Emergency Contact */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Emergency Contact</p>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Contact Full Name</label>
                <input
                  value={form.emergencyName}
                  onChange={(e) => set("emergencyName", e.target.value)}
                  placeholder="Contact person name"
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  id="new-patient-emg-name"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Contact Phone</label>
                <input
                  value={form.emergencyPhone}
                  onChange={(e) => set("emergencyPhone", e.target.value)}
                  placeholder="0300-0000000"
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 font-clinical"
                  id="new-patient-emg-phone"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Relation</label>
                <select
                  value={form.emergencyRelation}
                  onChange={(e) => set("emergencyRelation", e.target.value)}
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  id="new-patient-emg-relation"
                >
                  {RELATIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>

              {/* Known Critical Allergies */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">
                  Known Critical Allergies <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.knownAllergies}
                  onChange={(e) => set("knownAllergies", e.target.value)}
                  placeholder="e.g. Penicillin (anaphylaxis), Aspirin (GI bleed), Latex..."
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  id="new-patient-allergies"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-6 flex gap-3">
          {step === 1 ? (
            <>
              <Button className="flex-1 gap-2" onClick={handleNext} id="new-patient-next">
                Next — Emergency Info →
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleClose} id="new-patient-cancel">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} id="new-patient-enroll">
                <CheckCircle2 className="h-4 w-4" />
                Enroll Patient
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)} id="new-patient-back">
                ← Back
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
