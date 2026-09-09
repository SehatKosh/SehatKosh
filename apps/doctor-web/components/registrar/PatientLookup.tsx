"use client";

import React, { useState } from "react";
import { Search, User, Phone, AlertCircle, X, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_PATIENTS, getOnDutyDoctors, type Patient } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface PatientLookupProps {
  onDispatch: (patient: Patient, doctorId: string, duration: string) => void;
  onNewPatient?: () => void;
}

function detectFormat(v: string): string {
  if (/^\d{5}-\d{7}-\d$/.test(v)) return "cnic";
  if (/^03\d{2}-\d{7}$/.test(v) || /^03\d{9}$/.test(v)) return "phone";
  if (/^SK-\d{4}-[A-Z]$/i.test(v)) return "mrn";
  return "unknown";
}

function maskCnic(cnic: string) {
  const parts = cnic.split("-");
  if (parts.length === 3) return `${parts[0]}-*******-${parts[2]}`;
  return cnic.slice(0, 5) + "-*******-" + cnic.slice(-1);
}

function maskPhone(phone: string) {
  return phone.slice(0, 4) + "-***" + phone.slice(-4);
}

function findPatient(query: string): Patient | null {
  const q = query.toLowerCase().trim();
  return (
    MOCK_PATIENTS.find(
      (p) =>
        p.medicalId.toLowerCase() === q ||
        (p.phone ?? "").replace(/\s/g, "").includes(q.replace(/\D/g, "")) ||
        (p.name ?? "").toLowerCase().includes(q)
    ) ?? null
  );
}

export function PatientLookup({ onDispatch, onNewPatient }: PatientLookupProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Patient | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [duration, setDuration] = useState("4h");
  const [timeSlot, setTimeSlot] = useState("immediate");

  const onDutyDoctors = getOnDutyDoctors();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = findPatient(query);
    if (found) {
      setResult(found);
      setNotFound(false);
      if (onDutyDoctors[0]) {
        setSelectedDoctor(onDutyDoctors[0].id);
        setSelectedRoom(onDutyDoctors[0].roomNumber ?? "");
      }
    } else {
      setResult(null);
      setNotFound(true);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResult(null);
    setNotFound(false);
  };

  const handleDispatch = () => {
    if (!result || !selectedDoctor) return;
    onDispatch(result, selectedDoctor, duration);
  };

  const handleDoctorChange = (doctorId: string) => {
    setSelectedDoctor(doctorId);
    const doc = onDutyDoctors.find((d) => d.id === doctorId);
    setSelectedRoom(doc?.roomNumber ?? "");
  };

  const fmt = detectFormat(query);

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="patient-lookup-input"
            autoFocus
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
            placeholder="Search by CNIC, Phone (03xx-xxxxxxx), or MRN (SK-XXXX-X)..."
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 font-clinical"
          />
          {query && (
            <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" id="lookup-search-btn">Search</Button>
      </form>

      {/* Format hint */}
      {query && (
        <p className="text-[11px] text-muted-foreground -mt-2">
          Detected format:{" "}
          <span className={`font-semibold ${fmt === "unknown" ? "text-amber-500" : "text-primary"}`}>
            {fmt === "cnic" ? "CNIC Number" : fmt === "phone" ? "Phone Number" : fmt === "mrn" ? "Medical Record Number" : "Unknown — try CNIC, phone, or MRN"}
          </span>
        </p>
      )}

      {/* Not found — offer new patient */}
      {notFound && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            No patient found for <strong className="font-clinical">{query}</strong>. Verify CNIC, phone, or MRN.
          </div>
          {onNewPatient && (
            <button
              onClick={onNewPatient}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/40 text-xs text-primary font-semibold hover:bg-primary/5 transition-colors"
              id="new-patient-from-lookup"
            >
              <User className="h-3.5 w-3.5" />
              Register New Patient
            </button>
          )}
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Identity strip — Privacy Sandbox: no clinical data shown */}
          <div className="bg-slate-50 px-5 py-3 border-b border-border flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-base font-black text-primary">{result.initials ?? "?"}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{result.name ?? "—"}</h3>
              <p className="text-xs text-muted-foreground">{result.age ?? "—"}y · {result.gender ?? "—"} · Blood Group: <strong>{result.bloodGroup ?? "—"}</strong></p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Privacy Sandbox Active</p>
              <p className="text-[10px] text-muted-foreground">Clinical history hidden from Help Desk</p>
            </div>
          </div>

          {/* Demographics only */}
          <div className="px-5 py-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">CNIC</p>
              <p className="font-clinical text-foreground">{maskCnic("37405-1234567-1")}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Phone</p>
              <p className="font-clinical text-foreground">{maskPhone(result.phone ?? "+92 300 0000000")}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">MRN</p>
              <p className="font-clinical font-semibold text-primary">{result.medicalId ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Emergency Contact</p>
              <p className="text-foreground">+92 333 9876543</p>
            </div>
          </div>

          {/* Consultation & Room Assignment Engine */}
          <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Consultation & Room Assignment
            </h4>

            {/* Doctor dropdown */}
            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1.5">
                Attending Doctor <span className="text-red-500">*</span>
              </label>
              <select
                id="dispatch-doctor-select"
                value={selectedDoctor}
                onChange={(e) => handleDoctorChange(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— Select on-duty doctor —</option>
                {onDutyDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.department} · {d.roomNumber ?? "No room"}
                  </option>
                ))}
              </select>
            </div>

            {/* Room number — auto-filled from doctor selection */}
            {selectedRoom && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Room Allocated: {selectedRoom}</span>
              </div>
            )}

            {/* Time slot picker */}
            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1.5">
                <Clock className="h-3 w-3 inline mr-1" />
                Time Slot
              </label>
              <div className="flex gap-2">
                {[
                  { value: "immediate", label: "Immediate Triage" },
                  { value: "scheduled", label: "Scheduled Appt." },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimeSlot(opt.value)}
                    className={cn("flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all",
                      timeSlot === opt.value
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-muted-foreground border-border hover:border-primary/40")}
                    id={`timeslot-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration pills */}
            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1.5">Clinical Access Duration</label>
              <div className="flex gap-2">
                {[
                  { value: "2h", label: "2 Hours" },
                  { value: "4h", label: "4 Hours", tag: "Standard" },
                  { value: "24h", label: "24 Hours" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    id={`duration-${opt.value}`}
                    type="button"
                    onClick={() => setDuration(opt.value)}
                    className={cn("flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all",
                      duration === opt.value
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-muted-foreground border-border hover:border-primary/40")}
                  >
                    {opt.label}
                    {opt.tag && <span className={`block text-[9px] font-normal mt-0.5 ${duration === opt.value ? "text-blue-200" : "text-muted-foreground"}`}>{opt.tag}</span>}
                  </button>
                ))}
              </div>
            </div>

            <Button
              id="request-mobile-approval"
              className="w-full gap-2"
              disabled={!selectedDoctor}
              onClick={handleDispatch}
            >
              <Phone className="h-4 w-4" />
              Dispatch Mobile Access Request
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
