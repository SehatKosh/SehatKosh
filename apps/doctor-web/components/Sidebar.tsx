"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Stethoscope,
  Users,
  ShieldCheck,
  Search,
  Settings,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Clinical Roster", icon: Users },
  { href: "/consent", label: "Access Requests", icon: ShieldCheck },
];

interface SidebarProps {
  onCommandK?: () => void;
}

export function Sidebar({ onCommandK }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-white border-r border-border transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Toggle Collapse Button */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-border bg-white shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Logo & Doctor */}
      <div className={cn("flex items-center gap-3 px-4 py-4 border-b border-border", collapsed && "justify-center px-2")}>
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white shrink-0">
          <Stethoscope className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight truncate">SehatKosh MD</p>
            <p className="text-xs text-muted-foreground truncate">Dr. Tariq Khan</p>
          </div>
        )}
      </div>

      {/* Search / Command K */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-border">
          <button
            onClick={onCommandK}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 border border-border text-xs text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors text-left"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">Search patients...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Navigation
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-slate-50 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Activity link */}
        {collapsed ? (
          <div
            className="flex items-center justify-center px-2 py-2 rounded-md text-muted-foreground cursor-default"
            title="Vitals Monitor"
          >
            <Activity className="h-4 w-4 shrink-0" />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground cursor-default opacity-50">
            <Activity className="h-4 w-4 shrink-0" />
            <span className="truncate">Vitals Monitor</span>
            <span className="ml-auto text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-muted-foreground">Soon</span>
          </div>
        )}
      </nav>

      {/* Session Status */}
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

      {/* Bottom Actions */}
      <div className={cn("px-2 py-3 border-t border-border space-y-0.5", collapsed && "px-2")}>
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>System Settings</span>}
        </button>
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
