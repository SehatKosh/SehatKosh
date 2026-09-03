import React from "react";

export default function PatientDossierLoading() {
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-pulse">
      {/* Banner Skeleton */}
      <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between" />

      {/* Two Pane Skeleton */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[420px] bg-white border-r border-slate-200 p-4 space-y-4">
          <div className="h-8 bg-slate-200 rounded-md w-3/4" />
          <div className="h-24 bg-slate-100 rounded-xl" />
          <div className="h-24 bg-slate-100 rounded-xl" />
          <div className="h-24 bg-slate-100 rounded-xl" />
        </div>
        <div className="flex-1 p-6 space-y-6">
          <div className="h-10 bg-slate-200 rounded-lg w-1/3" />
          <div className="h-64 bg-white border border-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
