import React from "react";
import { Stethoscope } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background-subtle flex flex-col items-center justify-center p-4">
      {/* Logo header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">SehatKosh MD</p>
          <p className="text-xs text-muted-foreground">Clinical Portal v1.0</p>
        </div>
      </div>

      {children}

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground">
        FHIR R4 Compliant • HIPAA / PDPA Adherent • Shifa International Hospital Network
      </p>
    </div>
  );
}
