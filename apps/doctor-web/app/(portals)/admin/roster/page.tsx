"use client";

import React, { useState } from "react";
import { Users, CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_HOSPITAL_STAFF, type HospitalStaff } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function AdminRosterPage() {
  const [staff, setStaff] = useState<HospitalStaff[]>(MOCK_HOSPITAL_STAFF);

  const doctors = staff.filter((s) => s.role === "doctor");
  const registrars = staff.filter((s) => s.role === "registrar");

  const toggleDuty = (id: string) => {
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, onDuty: !s.onDuty } : s))
    );
  };

  const revokeRegistrar = (id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Users className="h-4 w-4 text-violet-700" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Physician & Counter Staff Roster</h1>
        </div>
        <p className="text-xs text-muted-foreground">Manage department assignments, room numbers, and on-duty availability</p>
      </div>

      {/* Doctors */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Consulting Physicians ({doctors.length})</h2>
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-border">
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Department</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Room</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">On Duty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {doctors.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-foreground">{d.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.department}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.roomNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-clinical text-muted-foreground">{d.email}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleDuty(d.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all",
                        d.onDuty
                          ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      )}
                      id={`toggle-duty-${d.id}`}
                    >
                      {d.onDuty ? (
                        <><CheckCircle2 className="h-3 w-3" /> On Duty</>
                      ) : (
                        <><XCircle className="h-3 w-3" /> Off Duty</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registrar credentials */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Desk Registrar Credentials ({registrars.length})</h2>
          <Button size="sm" variant="outline" className="gap-2 text-xs" id="add-registrar-btn">
            <Plus className="h-3.5 w-3.5" /> Add Registrar
          </Button>
        </div>
        <div className="space-y-2">
          {registrars.map((r) => (
            <div key={r.id} className="bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-emerald-700">
                  {r.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground font-clinical">{r.email} · {r.department}</p>
              </div>
              <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full",
                r.onDuty ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                {r.onDuty ? "Active" : "Inactive"}
              </span>
              <button
                onClick={() => revokeRegistrar(r.id)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Revoke credentials"
                id={`revoke-${r.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
