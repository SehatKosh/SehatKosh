"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  UserCheck,
  ShieldAlert,
  FlaskConical,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type UserRole = "doctor" | "registrar" | "admin" | "researcher";

interface RoleConfig {
  role: UserRole;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  email: string;
  homeRoute: string;
}

const ROLES: RoleConfig[] = [
  {
    role: "doctor",
    label: "Consulting Doctor",
    subtitle: "Patient dossier & clinical workspace",
    icon: Stethoscope,
    color: "text-blue-600 bg-blue-50 border-blue-200 group-hover:border-blue-400",
    email: "tariq.khan@shifa.edu.pk",
    homeRoute: "/doctor/queue",
  },
  {
    role: "registrar",
    label: "Desk Registrar",
    subtitle: "Patient intake & consent dispatch",
    icon: UserCheck,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 group-hover:border-emerald-400",
    email: "sana.p@shifa.edu.pk",
    homeRoute: "/registrar",
  },
  {
    role: "admin",
    label: "Hospital Administrator",
    subtitle: "Operations, audit & record ingestion",
    icon: ShieldAlert,
    color: "text-violet-600 bg-violet-50 border-violet-200 group-hover:border-violet-400",
    email: "admin@shifa.edu.pk",
    homeRoute: "/admin/overview",
  },
  {
    role: "researcher",
    label: "Medical Researcher",
    subtitle: "De-identified cohort & case explorer",
    icon: FlaskConical,
    color: "text-amber-600 bg-amber-50 border-amber-200 group-hover:border-amber-400",
    email: "researcher@shifa.edu.pk",
    homeRoute: "/research/explorer",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"role" | "credentials" | "mfa">("role");
  const [selectedRole, setSelectedRole] = useState<RoleConfig | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleSelect = (rc: RoleConfig) => {
    setSelectedRole(rc);
    setEmail(rc.email);
    setStep("credentials");
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your credentials."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setStep("mfa");
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mfaCode.length !== 6) { setError("Enter the 6-digit code."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    router.push(selectedRole!.homeRoute);
  };

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary mb-4 shadow-lg shadow-blue-200">
          <Stethoscope className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">SehatKosh Clinical Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">Shifa International Hospital — Secure Access</p>
      </div>

      <div className="bg-white border border-border rounded-2xl shadow-lg overflow-hidden">
        {/* Step indicator */}
        <div className="flex border-b border-border">
          {(["role", "credentials", "mfa"] as const).map((s, i) => (
            <div key={s} className={cn("flex-1 py-2.5 text-center text-xs font-semibold transition-colors",
              step === s ? "bg-primary text-white" : i < ["role","credentials","mfa"].indexOf(step) ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
              {i + 1}. {s === "role" ? "Select Role" : s === "credentials" ? "Sign In" : "Verify"}
            </div>
          ))}
        </div>

        <div className="p-7">
          {/* Step 1: Role Selection */}
          {step === "role" && (
            <div>
              <h2 className="text-base font-bold text-foreground mb-1">Who are you signing in as?</h2>
              <p className="text-xs text-muted-foreground mb-5">Select your clinical role to access your workspace.</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((rc) => {
                  const Icon = rc.icon;
                  return (
                    <button
                      key={rc.role}
                      id={`role-${rc.role}`}
                      onClick={() => handleRoleSelect(rc)}
                      className="group text-left p-4 rounded-xl border-2 border-border hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className={cn("h-9 w-9 rounded-lg border flex items-center justify-center mb-3 transition-all", rc.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-foreground leading-tight">{rc.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{rc.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Credentials */}
          {step === "credentials" && selectedRole && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <button onClick={() => setStep("role")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">← Back</button>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-semibold text-foreground">{selectedRole.label}</span>
              </div>
              <h2 className="text-base font-bold text-foreground mb-1">Institutional Sign In</h2>
              <p className="text-xs text-muted-foreground mb-5">Access your {selectedRole.label.toLowerCase()} workspace securely.</p>
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Institutional Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@hospital.edu.pk" className="pl-9" id="login-email" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9 pr-10" id="login-password" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <Button type="submit" className="w-full gap-2" disabled={loading} id="login-submit">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  Continue to 2FA
                </Button>
              </form>
              <div className="mt-5 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700">All access is logged and audited in compliance with PDPA & HIPAA.</p>
              </div>
            </div>
          )}

          {/* Step 3: MFA */}
          {step === "mfa" && (
            <div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1">Two-Factor Verification</h2>
              <p className="text-xs text-muted-foreground mb-5">Enter the 6-digit code from your authenticator app.</p>
              <form onSubmit={handleMfa} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Authenticator Code</label>
                  <Input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000" className="text-center text-2xl tracking-[0.5em] font-mono h-14" id="mfa-code" />
                  <p className="text-xs text-muted-foreground mt-1 text-center">Demo: enter any 6 digits</p>
                </div>
                {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep("credentials")} className="flex-1">Back</Button>
                  <Button type="submit" className="flex-1 gap-2" disabled={loading} id="mfa-submit">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Sign In
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
