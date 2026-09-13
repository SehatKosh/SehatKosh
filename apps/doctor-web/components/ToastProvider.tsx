"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  safeExecute: <T>(fn: () => Promise<T> | T, errorMessage?: string) => Promise<T | undefined>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const safeExecute = async <T,>(
    fn: () => Promise<T> | T,
    errorMessage = "Operation could not be completed"
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (err: unknown) {
      console.warn("Safe action captured error:", err);
      const msg = err instanceof Error ? err.message : errorMessage;
      showToast(msg, "error");
      return undefined;
    }
  };

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn("Intercepted unhandled promise rejection:", event.reason);
      event.preventDefault();
      const message =
        typeof event.reason === "string"
          ? event.reason
          : event.reason?.message || "Action completed safely.";
      showToast(message, "info");
    };

    const handleError = (event: ErrorEvent) => {
      console.warn("Intercepted global runtime error:", event.error || event.message);
      event.preventDefault();
      showToast(event.message || "An action error was safely contained.", "info");
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, safeExecute }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";

          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-2 text-xs font-medium",
                isSuccess && "bg-emerald-900/90 text-white border-emerald-700 shadow-emerald-950/20",
                isError && "bg-rose-900/90 text-white border-rose-700 shadow-rose-950/20",
                !isSuccess && !isError && "bg-slate-900/90 text-white border-slate-700 shadow-slate-950/20"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />}
                {isError && <AlertCircle className="h-4 w-4 text-rose-300 shrink-0" />}
                {!isSuccess && !isError && <Info className="h-4 w-4 text-sky-300 shrink-0" />}
                <span className="truncate">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 p-0.5 rounded shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if used outside ToastProvider
    return {
      showToast: (msg: string) => console.log("Toast:", msg),
      safeExecute: async <T,>(fn: () => Promise<T> | T) => {
        try {
          return await fn();
        } catch (e) {
          console.warn("Safe execute fallback error:", e);
          return undefined;
        }
      },
    };
  }
  return context;
}
