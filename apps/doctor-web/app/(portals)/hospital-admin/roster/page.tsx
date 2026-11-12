"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Building2,
  Stethoscope,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  RefreshCw,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ToastProvider";
import {
  listFacilities,
  getFacilityDepartments,
  getFacilityPractitioners,
  type FacilityItem,
  type DepartmentItem,
  type PractitionerItem,
} from "@/lib/api-client";

const DEFAULT_FACILITY_ID = "11111111-1111-1111-1111-111111111111";

export default function HospitalAdminRosterPage() {
  const { showToast } = useToast();
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(DEFAULT_FACILITY_ID);
  const [activeTab, setActiveTab] = useState<"staff" | "departments">("staff");

  const [staff, setStaff] = useState<PractitionerItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch facilities list
  useEffect(() => {
    listFacilities().then((facs) => {
      setFacilities(facs);
      if (facs.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(facs[0].id);
      }
    });
  }, []);

  // Fetch staff and departments whenever selected facility changes
  const loadFacilityData = async () => {
    if (!selectedFacilityId) return;
    setIsLoading(true);
    try {
      const [staffData, deptsData] = await Promise.all([
        getFacilityPractitioners(selectedFacilityId),
        getFacilityDepartments(selectedFacilityId),
      ]);
      setStaff(staffData);
      setDepartments(deptsData);
    } catch (err: any) {
      showToast(err?.message || "Failed to load facility roster", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFacilityData();
  }, [selectedFacilityId]);

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  return (
    <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header with Facility Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Users className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Hospital Rosters & Operational Units</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            PMDC-Verified Practitioner Credentialing & Departmental Wards
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Facility Switcher Dropdown */}
          <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 py-1.5 shadow-xs">
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none focus:outline-none cursor-pointer text-foreground"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.code})
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={loadFacilityData}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "staff"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          PMDC Practitioners & Staff ({staff.length})
        </button>
        <button
          onClick={() => setActiveTab("departments")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "departments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" />
          Clinical Departments & Wards ({departments.length})
        </button>
      </div>

      {/* Tab 1: Staff Rosters */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Verified Medical Practitioners</h2>
              <p className="text-xs text-muted-foreground">
                Active clinical licenses provisioned for {selectedFacility?.name}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Querying practitioner roster...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-white border border-border rounded-xl">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No practitioners found</p>
              <p className="text-xs text-slate-400">No medical staff have been rostered to this facility yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3.5">Practitioner</th>
                    <th className="p-3.5">PMDC License</th>
                    <th className="p-3.5">Designation</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Prescribing Authority</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {staff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                            {(s.name || "Dr").charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">{s.name || "Dr. Staff Member"}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">ID: {s.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-primary">
                        {s.pmdc_number}
                      </td>
                      <td className="p-3.5 text-foreground">{s.designation}</td>
                      <td className="p-3.5 text-muted-foreground">
                        {s.department_name || "General OPD"}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            s.prescribing_authority
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {s.prescribing_authority ? "Authorized (Full)" : "View Only"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Departments */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Operational Departments</h2>
              <p className="text-xs text-muted-foreground">
                Departmental triage queues and inpatient wards for {selectedFacility?.name}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Querying departmental wards...</p>
            </div>
          ) : departments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-white border border-border rounded-xl">
              <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No departments configured</p>
              <p className="text-xs text-slate-400">No clinical departments are active for this facility.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-4 rounded-xl border border-border bg-white shadow-xs space-y-2.5 hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {dept.code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Operational
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground">{dept.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      UUID: {dept.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
