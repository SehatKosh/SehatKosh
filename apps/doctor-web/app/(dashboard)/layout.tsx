"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { QueryProvider } from "./providers";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <QueryProvider>
      <div className="flex h-screen overflow-hidden bg-slate-100">
        <Sidebar onCommandK={() => setCmdOpen(true)} />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      </div>
    </QueryProvider>
  );
}
