"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Stethoscope,
  UserCheck,
  ShieldAlert,
  FlaskConical,
  Users,
  ClipboardList,
  Search,
  LayoutDashboard,
  Upload,
  BookOpen,
  Microscope,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Hospital,
  FileArchive,
  Globe,
  ShieldCheck,
  DatabaseZap,
  Heart,
  Clock,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PortalConfig {
  key: string;
  prefix: string;
  label: string;
  roleLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  staffName: string;
  navItems: NavItem[];
}

const PORTALS: PortalConfig[] = [
  {
    key: "doctor",
    prefix: "/doctor",
    label: "SehatKosh MD",
    roleLabel: "Consulting Doctor",
    icon: Stethoscope,
    accentClass: "bg-blue-600",
    staffName: "Dr. Tariq Khan",
    navItems: [
      { href: "/doctor/queue", label: "Patient Queue", icon: ClipboardList },
    ],
  },
  {
    key: "registrar",
    prefix: "/registrar",
    label: "SehatKosh Desk",
    roleLabel: "Help Desk",
    icon: UserCheck,
    accentClass: "bg-emerald-600",
    staffName: "Sana Perveen",
    navItems: [
      { href: "/registrar", label: "Patient Intake", icon: Search },
    ],
  },
  {
    key: "admin",
    prefix: "/admin",
    label: "Super Admin",
    roleLabel: "Platform Super Admin",
    icon: ShieldAlert,
    accentClass: "bg-violet-600",
    staffName: "Platform Administrator",
    navItems: [
      { href: "/admin/overview", label: "Platform Overview", icon: LayoutDashboard },
      { href: "/admin/hospitals", label: "Hospital Licensing", icon: Globe },
      { href: "/admin/quorum", label: "Quorum Security", icon: ShieldCheck },
      { href: "/admin/anonymize", label: "Anonymization Engine", icon: DatabaseZap },
      { href: "/admin/audit-logs", label: "Audit Ledger", icon: ScrollText },
    ],
  },
  {
    key: "hospital-admin",
    prefix: "/hospital-admin",
    label: "Hospital Admin",
    roleLabel: "Hospital Administrator",
    icon: Hospital,
    accentClass: "bg-indigo-600",
    staffName: "Hospital Administrator",
    navItems: [
      { href: "/hospital-admin/roster", label: "Staff & Credentials", icon: Users },
      { href: "/hospital-admin/ingest", label: "Paper Ingestion", icon: Upload },
      { href: "/hospital-admin/research", label: "Research Clearinghouse", icon: FileArchive },
    ],
  },
  {
    key: "researcher",
    prefix: "/research",
    label: "SehatKosh Research",
    roleLabel: "Medical Researcher",
    icon: FlaskConical,
    accentClass: "bg-amber-600",
    staffName: "Research Officer",
    navItems: [
      { href: "/research/explorer", label: "Case Explorer", icon: Microscope },
      { href: "/research/cases", label: "Case Studies", icon: BookOpen },
    ],
  },
];

interface SidebarProps {
  onCommandK?: () => void;
}

export function Sidebar({ onCommandK }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Derive active portal purely from URL
  const activePortal =
    PORTALS.find((p) => pathname.startsWith(p.prefix)) ?? PORTALS[0];

  const PortalIcon = activePortal.icon;

  const handleSignOut = () => {
    document.cookie = "sehatkosh_role=; path=/; max-age=0";
    window.location.href = "/login";
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-white border-r border-border transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-border bg-white shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        id="sidebar-collapse-btn"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Logo & identity with role integrated */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-border", collapsed && "justify-center px-2")}>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0", activePortal.accentClass)}>
          <PortalIcon className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground leading-tight truncate">{activePortal.label}</p>
            <p className="text-sm text-muted-foreground truncate">{activePortal.roleLabel}</p>
          </div>
        )}
      </div>

      {/* Search / Command K — Doctor only */}
      {!collapsed && activePortal.key === "doctor" && (
        <div className="px-3 py-3 border-b border-border">
          <button
            onClick={onCommandK}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-border text-sm text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors text-left"
            id="sidebar-command-k"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">Search patients...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 text-xs font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-3 overflow-y-auto">
        <div className="space-y-1">
          {activePortal.navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-slate-50 hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Meaningful Contextual Widgets to fill empty space for single-page and multi-page portals */}
        {!collapsed && (
          <div className="pt-2 px-1">
            {activePortal.key === "doctor" && (
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">Queue Glance</span>
                  <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-blue-700">Waiting Patients</span>
                  <span className="font-bold font-clinical text-blue-900">2</span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-blue-700">Avg Consult Time</span>
                  <span className="font-bold font-clinical text-blue-900">14m</span>
                </div>
              </div>
            )}

            {activePortal.key === "registrar" && (
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Intake Overview</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-emerald-700">Intakes Today</span>
                  <span className="font-bold font-clinical text-emerald-900">14</span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-emerald-700">Consent Dispatch</span>
                  <span className="font-semibold text-emerald-800">Operational</span>
                </div>
              </div>
            )}

            {activePortal.key === "hospital-admin" && (
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Operations</span>
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-indigo-700">Staff on Duty</span>
                  <span className="font-bold font-clinical text-indigo-900">4 / 7</span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-indigo-700">OCR Ingest Pipeline</span>
                  <span className="font-semibold text-indigo-800">Ready</span>
                </div>
              </div>
            )}

            {activePortal.key === "admin" && (
              <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-violet-900 uppercase tracking-wider">Security State</span>
                  <span className="flex h-2 w-2 rounded-full bg-violet-500" />
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-violet-700">Quorum Nodes</span>
                  <span className="font-bold font-clinical text-violet-900">2 / 3 Active</span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-violet-700">Ledger Integrity</span>
                  <span className="font-semibold text-violet-800">Verified</span>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Session info */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-border">
          <div className="px-3 py-3 rounded-xl bg-slate-50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
              <p className="text-sm font-medium text-foreground truncate">Healthcare Network</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              <p className="text-xs text-muted-foreground">{activePortal.staffName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className={cn("px-2 py-3 border-t border-border", collapsed && "px-2")}>
        <button
          onClick={handleSignOut}
          className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors", collapsed && "justify-center px-2")}
          title={collapsed ? "Sign Out" : undefined}
          id="sidebar-signout-btn"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
