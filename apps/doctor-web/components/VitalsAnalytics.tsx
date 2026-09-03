"use client";

import React, { useState } from "react";
import type { VitalsPoint } from "@/lib/mockData";

interface VitalsAnalyticsProps {
  data: VitalsPoint[];
}

const TIME_RANGES = ["7 Days", "30 Days", "90 Days", "1 Year"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

function rangeCount(range: TimeRange): number {
  switch (range) {
    case "7 Days": return 7;
    case "30 Days": return 30;
    case "90 Days": return 90;
    case "1 Year": return 365;
  }
}

// ─── SVG Chart Helpers ───────────────────────────────────────────────────────

function LineChart({
  hrData,
  stepsData,
  prescriptionMarkers,
}: {
  hrData: number[];
  stepsData: number[];
  prescriptionMarkers: number[];
}) {
  const W = 560;
  const H = 160;
  const PAD = { top: 16, right: 20, bottom: 32, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxHR = Math.max(...hrData, 100);
  const minHR = Math.min(...hrData, 50);
  const maxSteps = Math.max(...stepsData, 10000);

  const n = hrData.length;

  const hrPoints = hrData.map((v, i) => {
    const x = PAD.left + (i / (n - 1)) * chartW;
    const y = PAD.top + ((maxHR - v) / (maxHR - minHR)) * chartH;
    return `${x},${y}`;
  });

  const stepsRects = stepsData.map((v, i) => {
    const x = PAD.left + (i / n) * chartW;
    const barW = (chartW / n) * 0.6;
    const barH = (v / maxSteps) * chartH;
    return { x: x - barW / 2, y: PAD.top + chartH - barH, w: barW, h: barH };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="Heart Rate and Daily Steps Chart">
      {/* Background grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={PAD.left}
          y1={PAD.top + t * chartH}
          x2={W - PAD.right}
          y2={PAD.top + t * chartH}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      ))}

      {/* Steps bars */}
      {stepsRects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="#bfdbfe" opacity={0.7} rx={1} />
      ))}

      {/* HR Line */}
      <polyline
        points={hrPoints.join(" ")}
        fill="none"
        stroke="#2563eb"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* HR dots */}
      {hrData.map((v, i) => {
        const x = PAD.left + (i / (n - 1)) * chartW;
        const y = PAD.top + ((maxHR - v) / (maxHR - minHR)) * chartH;
        return (
          <circle key={i} cx={x} cy={y} r={2.5} fill="#2563eb" />
        );
      })}

      {/* Prescription markers */}
      {prescriptionMarkers.map((i) => {
        const x = PAD.left + (i / (n - 1)) * chartW;
        return (
          <g key={i}>
            <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + chartH} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,2" />
            <circle cx={x} cy={PAD.top - 4} r={4} fill="#f59e0b" />
          </g>
        );
      })}

      {/* Y axis labels */}
      {[maxHR, Math.round((maxHR + minHR) / 2), minHR].map((v, i) => (
        <text
          key={i}
          x={PAD.left - 4}
          y={PAD.top + (i / 2) * chartH + 4}
          textAnchor="end"
          fontSize={9}
          fill="#94a3b8"
          fontFamily="monospace"
        >
          {v}
        </text>
      ))}

      {/* X axis labels (every ~7 days) */}
      {hrData.map((_, i) => {
        if (n <= 7 || i % Math.max(1, Math.floor(n / 6)) === 0) {
          const x = PAD.left + (i / Math.max(n - 1, 1)) * chartW;
          return (
            <text key={i} x={x} y={H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">
              {i + 1}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
}

function SpO2ScatterPlot({ data }: { data: VitalsPoint[] }) {
  const W = 560;
  const H = 140;
  const PAD = { top: 16, right: 20, bottom: 32, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const n = data.length;

  const minY = 88;
  const maxY = 100;

  const normalBandTop = PAD.top + ((maxY - 100) / (maxY - minY)) * chartH;
  const normalBandBottom = PAD.top + ((maxY - 95) / (maxY - minY)) * chartH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="SpO2 Scatter Plot">
      {/* Background grid */}
      {[88, 90, 92, 95, 97, 100].map((v) => {
        const y = PAD.top + ((maxY - v) / (maxY - minY)) * chartH;
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8" fontFamily="monospace">
              {v}%
            </text>
          </g>
        );
      })}

      {/* Normal range band (95–100) */}
      <rect
        x={PAD.left}
        y={normalBandTop}
        width={chartW}
        height={normalBandBottom - normalBandTop}
        fill="#dcfce7"
        opacity={0.6}
      />

      {/* Threshold line at 92% */}
      {(() => {
        const y = PAD.top + ((maxY - 92) / (maxY - minY)) * chartH;
        return (
          <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" />
        );
      })()}

      {/* Scatter dots */}
      {data.map((pt, i) => {
        const x = PAD.left + (i / Math.max(n - 1, 1)) * chartW;
        const y = PAD.top + ((maxY - pt.spO2) / (maxY - minY)) * chartH;
        const isHypoxic = pt.spO2 < 92;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={isHypoxic ? 4 : 3}
            fill={isHypoxic ? "#ef4444" : "#16a34a"}
            opacity={0.85}
          />
        );
      })}

      {/* X axis */}
      {data.map((_, i) => {
        if (n <= 7 || i % Math.max(1, Math.floor(n / 6)) === 0) {
          const x = PAD.left + (i / Math.max(n - 1, 1)) * chartW;
          return (
            <text key={i} x={x} y={H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">
              {i + 1}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
}

function VitalsSummaryTable({ data }: { data: VitalsPoint[] }) {
  function stats(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    return { min, max, median, p95 };
  }

  const hrStats = stats(data.map((d) => d.heartRate));
  const spO2Stats = stats(data.map((d) => d.spO2));
  const stepStats = stats(data.map((d) => d.steps));

  const rows = [
    { label: "Heart Rate (bpm)", ...hrStats, unit: "bpm" },
    { label: "SpO2 (%)", ...spO2Stats, unit: "%" },
    { label: "Daily Steps", ...stepStats, unit: "steps" },
  ];

  return (
    <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
      <thead className="bg-slate-50">
        <tr>
          {["Metric", "Min", "Median", "Max", "95th Pct"].map((h) => (
            <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border bg-white">
        {rows.map((row) => (
          <tr key={row.label}>
            <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
            <td className="px-3 py-2 font-mono">{row.min} {row.unit}</td>
            <td className="px-3 py-2 font-mono font-semibold text-primary">{row.median} {row.unit}</td>
            <td className="px-3 py-2 font-mono">{row.max} {row.unit}</td>
            <td className="px-3 py-2 font-mono">{row.p95} {row.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function VitalsAnalytics({ data }: VitalsAnalyticsProps) {
  const [range, setRange] = useState<TimeRange>("30 Days");

  const count = Math.min(rangeCount(range), data.length);
  const slicedData = data.slice(-count);

  const hrData = slicedData.map((d) => d.heartRate);
  const stepsData = slicedData.map((d) => d.steps);
  const prescriptionMarkers = slicedData
    .map((d, i) => (d.prescription ? i : -1))
    .filter((i) => i !== -1);

  if (data.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        No telemetry data available for this patient.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Time range:</span>
        {TIME_RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              range === r
                ? "bg-primary text-white border-primary"
                : "bg-white text-muted-foreground border-border hover:bg-slate-50"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart 1: HR + Steps */}
      <div className="bg-white border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Resting Heart Rate vs. Daily Activity</p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-blue-500 inline-block" /> HR (bpm)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-blue-200 inline-block" /> Steps</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-1 rounded bg-amber-400 inline-block" /> Rx Start</span>
          </div>
        </div>
        <LineChart hrData={hrData} stepsData={stepsData} prescriptionMarkers={prescriptionMarkers} />
        <p className="text-[10px] text-muted-foreground text-center">Day (1–{count})</p>
      </div>

      {/* Chart 2: SpO2 Scatter */}
      <div className="bg-white border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Blood Oxygen (SpO2) Distribution</p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Normal (≥95%)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Hypoxic (&lt;92%)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 bg-green-100 inline-block" /> Normal band</span>
          </div>
        </div>
        <SpO2ScatterPlot data={slicedData} />
        <p className="text-[10px] text-muted-foreground text-center">Day (1–{count})</p>
      </div>

      {/* Summary Table */}
      <div className="bg-white border border-border rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground">Statistical Summary</p>
        <VitalsSummaryTable data={slicedData} />
      </div>
    </div>
  );
}
