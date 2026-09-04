"use client";

import React, { useState } from "react";
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
  Settings,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    roleLabel: "Desk Registrar",
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
    label: "SehatKosh Admin",
    roleLabel: "Hospital Administrator",
    icon: ShieldAlert,
    accentClass: "bg-violet-600",
    staffName: "System Administrator",
    navItems: [
      { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/ingest", label: "Paper Ingestion", icon: Upload },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
      { href: "/admin/roster", label: "Staff Roster", icon: Users },
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

  // Derive active portal purely from URL — no localStorage
  const activePortal =
    PORTALS.find((p) => pathname.startsWith(p.prefix)) ?? PORTALS[0];

  const PortalIcon = activePortal.icon;

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-white border-r border-border transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-border bg-white shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Logo & identity */}
      <div className={cn("flex items-center gap-3 px-4 py-4 border-b border-border", collapsed && "justify-center px-2")}>
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0", activePortal.accentClass)}>
          <PortalIcon className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight truncate">{activePortal.label}</p>
            <p className="text-xs text-muted-foreground truncate">{activePortal.staffName}</p>
          </div>
        )}
      </div>

      {/* Role badge + portal switcher when expanded */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Role</span>
            <Link href="/login" className="text-[10px] text-primary hover:underline font-medium">Switch</Link>
          </div>
          <p className="text-xs font-semibold text-foreground mt-0.5">{activePortal.roleLabel}</p>
        </div>
      )}

      {/* Search / Command K — Doctor only */}
      {!collapsed && activePortal.key === "doctor" && (
        <div className="px-3 py-3 border-b border-border">
          <button
            onClick={onCommandK}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 border border-border text-xs text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors text-left"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">Search patients...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 text-[10px] font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Navigation</p>
        )}
        {activePortal.navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-slate-50 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Other portals (collapsed: just icons; expanded: section header + links) */}
        {!collapsed && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Other Portals</p>
            </div>
            {PORTALS.filter((p) => p.key !== activePortal.key).map((p) => {
              const PIcon = p.icon;
              return (
                <Link
                  key={p.key}
                  href={p.navItems[0].href}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors opacity-60"
                >
                  <PIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{p.roleLabel}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Session status */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-border">
          <div className="px-3 py-2 rounded-md bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <p className="text-xs font-medium text-green-700 truncate">Shifa International Hospital</p>
            </div>
            <p className="text-[10px] text-green-600 mt-0.5 pl-5">Session Active</p>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className={cn("px-2 py-3 border-t border-border space-y-0.5", collapsed && "px-2")}>
        <button
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors", collapsed && "justify-center px-2")}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>System Settings</span>}
        </button>
        <Link
          href="/login"
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors", collapsed && "justify-center px-2")}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Link>
      </div>
    </aside>
  );
}
