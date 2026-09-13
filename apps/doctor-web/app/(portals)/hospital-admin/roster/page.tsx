"use client";

import React, { useState } from "react";
import {
  Users, CheckCircle2, XCircle, Plus, Trash2, Building2, Activity, Upload, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_HOSPITAL_STAFF, type HospitalStaff } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface AddStaffForm {
  name: string;
  role: "doctor" | "registrar";
  department: string;
  roomNumber: string;
  email: string;
}

const DEPTS = ["Cardiology", "Endocrinology", "Pulmonology", "Neurology", "General Surgery", "Front Desk", "Radiology", "Orthopedics"];

export default function HospitalAdminRosterPage() {
  const [staff, setStaff] = useState<HospitalStaff[]>(MOCK_HOSPITAL_STAFF);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form, setForm] = useState<AddStaffForm>({ name: "", role: "doctor", department: "Cardiology", roomNumber: "", email: "" });
  const [toast, setToast] = useState<string | null>(null);

  const metrics = {
    total: staff.length,
    onDuty: staff.filter((s) => s.onDuty).length,
    doctors: staff.filter((s) => s.role === "doctor").length,
    registrars: staff.filter((s) => s.role === "registrar").length,
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleDuty = (id: string) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, onDuty: !s.onDuty } : s)));
  };

  const revokeStaff = (id: string) => {
    const member = staff.find((s) => s.id === id);
    setStaff((prev) => prev.filter((s) => s.id !== id));
    showToast(`Credentials revoked for ${member?.name ?? "staff member"}.`);
  };

  const handleAddStaff = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    const newMember: HospitalStaff = {
      id: `new-${Date.now()}`,
      name: form.name,
      role: form.role,
      department: form.department,
      roomNumber: form.role === "doctor" ? form.roomNumber || undefined : undefined,
      hospitalName: "Shifa International Hospital",
      onDuty: false,
      email: form.email,
    };
    setStaff((prev) => [...prev, newMember]);
    setAddModalOpen(false);
    setForm({ name: "", role: "doctor", department: "Cardiology", roomNumber: "", email: "" });
    showToast(`${form.name} added to staff roster.`);
  };

  const doctors = staff.filter((s) => s.role === "doctor");
  const registrars = staff.filter((s) => s.role === "registrar");

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border bg-slate-900 border-slate-700 text-white text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Users className="h-4 w-4 text-indigo-700" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Staff Directory & Credentials</h1>
        </div>
        <p className="text-xs text-muted-foreground">Manage department assignments, room numbers, on-duty availability, and system access</p>
      </div>

      {/* Facility Overview metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Staff", value: metrics.total, icon: Users, bg: "bg-indigo-50 border-indigo-200", iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
          { label: "On Duty Now", value: metrics.onDuty, icon: Activity, bg: "bg-green-50 border-green-200", iconBg: "bg-green-100", iconColor: "text-green-600" },
          { label: "Physicians", value: metrics.doctors, icon: Building2, bg: "bg-blue-50 border-blue-200", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
          { label: "Desk Registrars", value: metrics.registrars, icon: Users, bg: "bg-violet-50 border-violet-200", iconBg: "bg-violet-100", iconColor: "text-violet-600" },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className={cn("rounded-2xl border p-4 flex items-center gap-3", tile.bg)}>
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", tile.iconBg)}>
                <Icon className={cn("h-5 w-5", tile.iconColor)} />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{tile.value}</p>
                <p className="text-[10px] text-muted-foreground">{tile.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Consulting Physicians */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Consulting Physicians ({doctors.length})</h2>
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => setAddModalOpen(true)} id="add-doctor-btn">
            <Plus className="h-3.5 w-3.5" /> Add Physician
          </Button>
        </div>
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-border">
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Department</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Room</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">On Duty</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide">Actions</th>
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
                      className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all",
                        d.onDuty
                          ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200")}
                      id={`toggle-duty-${d.id}`}
                    >
                      {d.onDuty ? <><CheckCircle2 className="h-3 w-3" /> On Duty</> : <><XCircle className="h-3 w-3" /> Off Duty</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => revokeStaff(d.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Revoke credentials"
                      id={`revoke-${d.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desk Registrars */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Desk Registrar Credentials ({registrars.length})</h2>
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => setAddModalOpen(true)} id="add-registrar-btn">
            <Plus className="h-3.5 w-3.5" /> Add Registrar
          </Button>
        </div>
        <div className="space-y-2">
          {registrars.map((r) => (
            <div key={r.id} className="bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-emerald-700">
                  {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground font-clinical">{r.email} · {r.department}</p>
              </div>
              <button
                onClick={() => toggleDuty(r.id)}
                className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all",
                  r.onDuty ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200" : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200")}
                id={`toggle-registrar-${r.id}`}
              >
                {r.onDuty ? "Active" : "Inactive"}
              </button>
              <button
                onClick={() => revokeStaff(r.id)}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Revoke credentials"
                id={`revoke-reg-${r.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {registrars.length === 0 && (
            <div className="bg-white border border-dashed border-border rounded-xl px-4 py-8 text-center text-xs text-muted-foreground">
              No registrars found.
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Plus className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Add New Staff Member</h2>
                <p className="text-xs text-muted-foreground">Shifa International Hospital</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Role */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Role</label>
                <div className="flex gap-2">
                  {(["doctor", "registrar"] as const).map((r) => (
                    <button key={r} onClick={() => setForm((f) => ({ ...f, role: r }))}
                      className={cn("flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                        form.role === r ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}
                      id={`role-select-${r}`}
                    >
                      {r === "doctor" ? "Physician" : "Desk Registrar"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Dr. Full Name"
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  id="new-staff-name"
                />
              </div>
              {/* Email */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@shifa.edu.pk"
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  id="new-staff-email"
                />
              </div>
              {/* Department */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Department</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  id="new-staff-dept"
                >
                  {DEPTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              {/* Room (doctors only) */}
              {form.role === "doctor" && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block mb-1">Room Number (optional)</label>
                  <input
                    value={form.roomNumber}
                    onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
                    placeholder="e.g. Room 3"
                    className="w-full text-sm border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    id="new-staff-room"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1 gap-2"
                onClick={handleAddStaff}
                disabled={!form.name.trim() || !form.email.trim()}
                id="add-staff-confirm"
              >
                <Plus className="h-4 w-4" />
                Add to Roster
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setAddModalOpen(false)} id="add-staff-cancel">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
