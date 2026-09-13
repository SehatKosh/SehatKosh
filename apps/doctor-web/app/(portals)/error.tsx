"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal route error caught:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="max-w-md">
        <h2 className="text-base font-bold text-foreground">Portal View Error</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {error.message || "An action in this portal view triggered an exception."}
        </p>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => window.location.assign("/doctor/queue")}
        >
          <Home className="h-3.5 w-3.5" />
          Queue Home
        </Button>
        <Button size="sm" className="text-xs gap-1.5" onClick={() => reset()}>
          <RotateCcw className="h-3.5 w-3.5" />
          Recover View
        </Button>
      </div>
    </div>
  );
}
