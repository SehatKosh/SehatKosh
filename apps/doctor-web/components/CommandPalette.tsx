"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { MOCK_PATIENTS } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = MOCK_PATIENTS.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.medicalId.toLowerCase().includes(query.toLowerCase()) ||
      p.phone.includes(query)
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenChange]);

  const handleSelect = useCallback(
    (patientId: string) => {
      onOpenChange(false);
      router.push(`/patients/${patientId}`);
    },
    [router, onOpenChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex].id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Patient Lookup</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by Name, Medical ID (SK-XXXX), or phone..."
            className="border-0 shadow-none focus:ring-0 p-0 h-auto text-sm"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-border px-1.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No patients found for <strong>&ldquo;{query}&rdquo;</strong>
            </div>
          ) : (
            <ul className="py-2">
              {results.map((patient, idx) => (
                <li key={patient.id}>
                  <button
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                      idx === selectedIndex
                        ? "bg-primary/5 text-foreground"
                        : "hover:bg-slate-50 text-foreground"
                    )}
                    onClick={() => handleSelect(patient.id)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {patient.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{patient.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {patient.medicalId} • {patient.age} Y • {patient.gender}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border bg-slate-50">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border border-border px-1 text-[9px] font-mono">↑↓</kbd>
            Navigate
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <kbd className="inline-flex items-center rounded border border-border px-1 text-[9px] font-mono">↵</kbd>
            Open Dossier
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
