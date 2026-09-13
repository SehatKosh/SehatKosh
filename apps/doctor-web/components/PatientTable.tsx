"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronRight,
  AlertTriangle,
  Heart,
  Activity,
  Clock,
  UserPlus,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import type { Patient } from "@/lib/mockData";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS = ["All", "Active In-Consultation", "Awaiting Approval", "Expired Today"] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

interface PatientTableProps {
  patients: Patient[];
  onRequestAccess: (patient?: Patient) => void;
}

function VitalsSparkline({ hr, spO2, status }: { hr: number; spO2: number; status: Patient["vitalsStatus"] }) {
  const color = status === "normal" ? "text-green-600" : status === "warning" ? "text-amber-600" : "text-red-600";
  return (
    <div className={cn("flex items-center gap-2 font-mono text-xs", color)}>
      <span className="flex items-center gap-1">
        <Heart className="h-3 w-3" />
        {hr}
      </span>
      <span className="flex items-center gap-1">
        <Activity className="h-3 w-3" />
        {spO2}%
      </span>
    </div>
  );
}

function AccessBadge({ patient }: { patient: Patient }) {
  if (patient.accessStatus === "active") {
    const remaining = new Date(patient.accessExpiresAt).getTime() - Date.now();
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    const label = hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
    const isWarning = remaining < 2 * 60 * 60 * 1000;
    return (
      <Badge variant={isWarning ? "warning" : "success"} className="font-mono text-[11px]">
        <Clock className="h-3 w-3" />
        Granted ({label})
      </Badge>
    );
  }
  if (patient.accessStatus === "pending") {
    return (
      <Badge variant="pending" className="font-mono text-[11px]">
        <Clock className="h-3 w-3" />
        Pending Approval
      </Badge>
    );
  }
  return (
    <Badge variant="expired" className="font-mono text-[11px]">
      Expired
    </Badge>
  );
}

export function PatientTable({ patients, onRequestAccess }: PatientTableProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");

  const filtered = patients.filter((p) => {
    const matchesSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.medicalId.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Active In-Consultation" && p.accessStatus === "active") ||
      (activeFilter === "Awaiting Approval" && p.accessStatus === "pending") ||
      (activeFilter === "Expired Today" && p.accessStatus === "expired");

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or Medical ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                activeFilter === f
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground border-border hover:bg-slate-50 hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => onRequestAccess()} className="gap-1.5 ml-auto shrink-0">
          <UserPlus className="h-3.5 w-3.5" />
          New Patient Lookup
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient Details</TableHead>
              <TableHead>Last Encounter</TableHead>
              <TableHead>Active Regimen</TableHead>
              <TableHead>Vitals Status</TableHead>
              <TableHead>Access State</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No patients match your search or filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((patient) => (
                <TableRow key={patient.id}>
                  {/* Patient Details */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {patient.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{patient.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {patient.medicalId} • {patient.age}Y • {patient.gender}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Last Encounter */}
                  <TableCell>
                    <p className="text-xs font-medium text-foreground">{formatDate(patient.lastEncounterDate)}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">{patient.lastEncounterReason}</p>
                  </TableCell>

                  {/* Active Regimen */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          patient.hasContraindication ? "text-red-600" : "text-foreground"
                        )}
                      >
                        {patient.activeDrugCount} Active Drug{patient.activeDrugCount !== 1 ? "s" : ""}
                      </span>
                      {patient.hasContraindication && (
                        <span title="Contraindication detected">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Vitals Status */}
                  <TableCell>
                    <VitalsSparkline
                      hr={patient.lastHR}
                      spO2={patient.lastSpO2}
                      status={patient.vitalsStatus}
                    />
                  </TableCell>

                  {/* Access State */}
                  <TableCell>
                    <AccessBadge patient={patient} />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {patient.accessStatus === "active" || patient.accessStatus === "expired" ? (
                        <>
                          <Link href={`/doctor/patients/${patient.id}`}>
                            <Button size="sm" className="text-xs">
                              Open Dossier
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          {patient.accessStatus === "expired" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => onRequestAccess(patient)}
                            >
                              Extend Access
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => onRequestAccess(patient)}
                        >
                          Request Access
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {patients.length} patients
      </p>
    </div>
  );
}
