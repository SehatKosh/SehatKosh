"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global route error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
        <div className="h-14 w-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold">System Recovered from Exception</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {error.message || "An unexpected system error occurred. Your portal session remains intact."}
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 text-xs border-slate-600 hover:bg-slate-700 text-slate-200"
            onClick={() => window.location.assign("/")}
          >
            Go Home
          </Button>
          <Button className="flex-1 text-xs gap-2 bg-primary hover:bg-primary/90" onClick={() => reset()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
