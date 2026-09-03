"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sun,
  CheckCircle2,
  AlertCircle,
  Circle,
} from "lucide-react";
import { Button } from "./ui/button";
import type { Encounter } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface DocumentVisualizerProps {
  encounter: Encounter;
}

function ConfidenceIcon({ confidence }: { confidence: "high" | "medium" | "low" }) {
  if (confidence === "high") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  if (confidence === "medium") return <Circle className="h-3.5 w-3.5 text-amber-500" />;
  return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
}

export function DocumentVisualizer({ encounter }: DocumentVisualizerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [contrast, setContrast] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [verifiedFields, setVerifiedFields] = useState<Set<string>>(new Set());
  const [signedOff, setSignedOff] = useState(false);

  const doc = encounter.document;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const toggleField = (label: string) => {
    setVerifiedFields((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <AlertCircle className="h-5 w-5 mr-2" />
        No document available for this encounter.
      </div>
    );
  }

  const allVerified = doc.fields.length > 0 && verifiedFields.size === doc.fields.length;

  return (
    <div className="flex gap-4 h-[520px]">
      {/* Left: Document Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-mono text-muted-foreground w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sun className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="range"
              min={50}
              max={200}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-20 accent-primary h-1"
              title="Contrast"
            />
          </div>
          <Button size="sm" variant="ghost" onClick={() => { setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 }); setContrast(100); }} className="text-xs text-muted-foreground ml-auto">
            Reset
          </Button>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 bg-slate-900 rounded-xl overflow-hidden relative cursor-grab active:cursor-grabbing border border-border select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
              filter: `contrast(${contrast}%)`,
              transition: isDragging ? "none" : "transform 0.15s ease",
            }}
          >
            {/* Simulated prescription document */}
            <div className="bg-white w-64 rounded shadow-2xl p-5 text-xs font-mono relative">
              {/* OCR Bounding Boxes */}
              <div className="absolute inset-x-4 top-4 h-5 border-2 border-green-400/60 rounded-sm pointer-events-none" title="High confidence" />
              <div className="absolute inset-x-4 top-12 h-4 border-2 border-green-400/60 rounded-sm pointer-events-none" />
              <div className="absolute inset-x-4 top-[76px] h-4 border-2 border-amber-400/60 rounded-sm pointer-events-none" title="Medium confidence" />

              <p className="font-bold text-sm mb-1">{encounter.physician}</p>
              <p className="text-muted-foreground text-[10px] mb-3">{encounter.clinic}</p>
              <p className="border-t pt-2 mb-2 font-semibold">Prescription</p>
              {doc.fields.filter((f) => f.label.startsWith("Drug")).map((f) => (
                <p key={f.label} className="text-[11px] mb-1">Rx: {f.value}</p>
              ))}
              <p className="border-t pt-2 mt-3 text-[10px] text-muted-foreground">
                Date: {doc.fields.find((f) => f.label === "Date")?.value}
              </p>
            </div>
          </div>

          {/* Zoom hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded select-none pointer-events-none">
            Drag to pan • Use zoom controls above
          </div>
        </div>
      </div>

      {/* Right: Extracted Fields */}
      <div className="w-64 shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-foreground">Extracted Fields</p>
          <span className="text-[10px] text-muted-foreground">
            {verifiedFields.size}/{doc.fields.length} verified
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {doc.fields.map((field) => {
            const isVerified = verifiedFields.has(field.label);
            return (
              <div
                key={field.label}
                className={cn(
                  "rounded-lg border p-2.5 cursor-pointer transition-colors",
                  isVerified
                    ? "border-green-200 bg-green-50"
                    : "border-border bg-white hover:bg-slate-50"
                )}
                onClick={() => toggleField(field.label)}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {field.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <ConfidenceIcon confidence={field.confidence} />
                    {isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                  </div>
                </div>
                <p className="text-xs font-medium text-foreground">{field.value}</p>
                {field.snomedCode && (
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    SNOMED: {field.snomedCode}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-border">
          <Button
            className="w-full text-xs"
            variant={signedOff ? "success" : allVerified ? "default" : "outline"}
            disabled={!allVerified && !signedOff}
            onClick={() => setSignedOff(true)}
          >
            {signedOff ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified & Signed Off
              </>
            ) : (
              "Verify & Sign Off"
            )}
          </Button>
          {!allVerified && !signedOff && (
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              Verify all fields to enable sign-off
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
