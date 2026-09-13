"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, UserCheck, Shield, Building2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleTab {
  key: string;
  label: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  prefix: string;
}

const ROLES: RoleTab[] = [
  {
    key: "super-admin",
    label: "Super Admin",
    route: "/admin/overview",
    icon: Shield,
    accentBg: "bg-violet-600",
    accentText: "text-violet-700",
    accentBorder: "border-violet-300",
    prefix: "/admin",
  },
  {
    key: "hospital-admin",
    label: "Hospital Admin",
    route: "/hospital-admin/roster",
    icon: Building2,
    accentBg: "bg-indigo-600",
    accentText: "text-indigo-700",
    accentBorder: "border-indigo-300",
    prefix: "/hospital-admin",
  },
  {
    key: "doctor",
    label: "Doctor",
    route: "/doctor/queue",
    icon: Stethoscope,
    accentBg: "bg-blue-600",
    accentText: "text-blue-700",
    accentBorder: "border-blue-300",
    prefix: "/doctor",
  },
  {
    key: "help-desk",
    label: "Help Desk",
    route: "/registrar",
    icon: UserCheck,
    accentBg: "bg-emerald-600",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-300",
    prefix: "/registrar",
  },
];

export function RoleSwitcherBanner() {
  const pathname = usePathname();

  const activeRole = ROLES.find((r) => pathname.startsWith(r.prefix)) ?? null;

  return (
    <div className="w-full bg-slate-900 border-b border-slate-700 px-4 py-2 flex items-center gap-3 shrink-0 z-50">
      {/* Brand mark */}
      <div className="flex items-center gap-2 mr-2 shrink-0">
        <div className="h-5 w-5 rounded bg-blue-500 flex items-center justify-center">
          <span className="text-[9px] font-black text-white">SK</span>
        </div>
        <span className="text-[11px] font-bold text-slate-300 tracking-wide hidden sm:block">
          SehatKosh Portal
        </span>
      </div>

      <div className="h-4 w-px bg-slate-700 hidden sm:block" />

      {/* Role pills */}
      <div className="flex items-center gap-1.5 flex-1">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const isActive = activeRole?.key === role.key;
          return (
            <Link
              key={role.key}
              href={role.route}
              id={`role-switch-${role.key}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 border",
                isActive
                  ? `${role.accentBg} text-white border-transparent shadow-sm`
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200 hover:border-slate-600"
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">{role.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Right side — current portal breadcrumb */}
      {activeRole && (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0 hidden md:flex">
          <span>Active Portal</span>
          <ChevronRight className="h-3 w-3" />
          <span className={cn("font-semibold", activeRole.accentText.replace("text-", "text-slate-"))}
            style={{ color: "rgb(148 163 184)" }}>
            {activeRole.label}
          </span>
        </div>
      )}
    </div>
  );
}
