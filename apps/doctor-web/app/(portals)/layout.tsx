"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { QueryProvider } from "./providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ToastProvider";

// Portal shell — shared by all role portals.
// Does NOT include <html> or <body>; those live in app/layout.tsx.
export default function PortalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <QueryProvider>
      <ToastProvider>
        <ErrorBoundary>
          <div className="flex h-screen overflow-hidden bg-slate-100">
            {/* Sidebar + main content */}
            <Sidebar onCommandK={() => setCmdOpen(true)} />
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
          </div>
        </ErrorBoundary>
      </ToastProvider>
    </QueryProvider>
  );
}
