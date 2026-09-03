"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("tariq.khan@shifa.edu.pk");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your credentials.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800)); // Simulate auth
    setLoading(false);
    setStep("mfa");
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mfaCode.length !== 6) {
      setError("Please enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    router.push("/");
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white border border-border rounded-2xl shadow-lg p-8">
        {step === "credentials" ? (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-foreground">Clinician Sign In</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Access your clinical workspace securely.
              </p>
            </div>

            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.edu.pk"
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue to 2FA
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700">
                All access is logged and audited in compliance with PDPA & HIPAA requirements.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Two-Factor Verification</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>

            <form onSubmit={handleMfa} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Authenticator Code
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                />
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Demo: enter any 6 digits to proceed
                </p>
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("credentials")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Sign In
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
