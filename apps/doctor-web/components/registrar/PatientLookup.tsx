"use client";

import React, { useState } from "react";
import { Search, User, Phone, MapPin, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_PATIENTS, MOCK_HOSPITAL_STAFF, getOnDutyDoctors, type Patient } from "@/lib/mockData";

interface PatientLookupProps {
  onDispatch: (patient: Patient, doctorId: string, duration: string) => void;
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
        p.phone.replace(/\s/g, "").includes(q.replace(/\D/g, "")) ||
        p.name.toLowerCase().includes(q)
    ) ?? null
  );
}

export function PatientLookup({ onDispatch }: PatientLookupProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Patient | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [duration, setDuration] = useState("4h");

  const onDutyDoctors = getOnDutyDoctors();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = findPatient(query);
    if (found) {
      setResult(found);
      setNotFound(false);
      if (onDutyDoctors[0]) setSelectedDoctor(onDutyDoctors[0].id);
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
            placeholder="Search by CNIC (xxxxx-xxxxxxx-x), Phone (03xx-xxxxxxx), or MRN (SK-XXXX-X)..."
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

      {/* Not found */}
      {notFound && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          No patient found for <strong className="font-clinical">{query}</strong>. Verify CNIC, phone, or MRN.
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-5 py-3 border-b border-border flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-base font-black text-primary">{result.initials}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{result.name}</h3>
              <p className="text-xs text-muted-foreground">{result.age}y · {result.gender} · Blood Group: <strong>{result.bloodGroup}</strong></p>
            </div>
          </div>

          <div className="px-5 py-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">CNIC</p>
              <p className="font-clinical text-foreground">{maskCnic(result.medicalId.replace("SK-","37405-") + "12")}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Phone</p>
              <p className="font-clinical text-foreground">{maskPhone(result.phone)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">MRN</p>
              <p className="font-clinical font-semibold text-primary">{result.medicalId}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Emergency Contact</p>
              <p className="text-foreground">+92 333 9876543</p>
            </div>
          </div>

          {/* Dispatch panel */}
          <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
            <h4 className="text-xs font-bold text-foreground">Dispatch Consent Request</h4>

            {/* Doctor dropdown */}
            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1.5">Select Attending Doctor</label>
              <select
                id="dispatch-doctor-select"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— Select doctor —</option>
                {onDutyDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.department} · {d.roomNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration pills */}
            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1.5">Access Duration</label>
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
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      duration === opt.value
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-muted-foreground border-border hover:border-primary/40"
                    }`}
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
              Request Mobile Approval
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
