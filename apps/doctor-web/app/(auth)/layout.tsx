import React from "react";
import { Heart } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col items-center justify-center p-4">
      {/* Logo header */}
      <Link href="/" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <Heart className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">SehatKosh</p>
          <p className="text-xs text-muted-foreground">Clinical Portal</p>
        </div>
      </Link>

      {children}
    </div>
  );
}
