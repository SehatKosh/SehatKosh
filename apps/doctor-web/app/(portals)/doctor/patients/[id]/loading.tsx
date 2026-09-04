export default function DossierLoading() {
  return (
    <div className="flex flex-col h-screen overflow-hidden animate-pulse">
      {/* Header skeleton */}
      <div className="h-16 bg-white border-b border-border px-5 py-3 flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-200 rounded w-40" />
          <div className="h-2.5 bg-slate-100 rounded w-64" />
        </div>
        <div className="h-8 w-28 bg-slate-200 rounded-lg" />
      </div>
      {/* TL;DR skeleton */}
      <div className="mx-5 mt-4 mb-3 h-24 rounded-xl bg-emerald-50 border border-emerald-100" />
      {/* Dual pane skeleton */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[380px] bg-white border-r border-border p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="flex-1 p-5 space-y-4">
          <div className="h-8 bg-slate-100 rounded-lg w-64" />
          <div className="h-40 bg-slate-50 rounded-xl" />
          <div className="h-32 bg-slate-50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
