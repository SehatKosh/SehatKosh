"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  UserCheck,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type UserRole = "doctor" | "registrar" | "hospital-admin";

interface RoleConfig {
  role: UserRole;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  email: string;
  homeRoute: string;
  cookieRole: string;
}

const ROLES: RoleConfig[] = [
  {
    role: "doctor",
    label: "Consulting Doctor",
    subtitle: "Patient dossier & clinical workspace",
    icon: Stethoscope,
    color: "text-blue-600 bg-blue-50 border-blue-200 group-hover:border-blue-400",
    email: "tariq.khan@sehatkosh.org",
    homeRoute: "/doctor/queue",
    cookieRole: "doctor",
  },
  {
    role: "registrar",
    label: "Help Desk",
    subtitle: "Patient intake & consent dispatch",
    icon: UserCheck,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 group-hover:border-emerald-400",
    email: "sana.p@sehatkosh.org",
    homeRoute: "/registrar",
    cookieRole: "registrar",
  },
  {
    role: "hospital-admin",
    label: "Hospital Administrator",
    subtitle: "Staff management & record ingestion",
    icon: Building2,
    color: "text-violet-600 bg-violet-50 border-violet-200 group-hover:border-violet-400",
    email: "admin@sehatkosh.org",
    homeRoute: "/hospital-admin/roster",
    cookieRole: "hospital-admin",
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

    const roleVal = selectedRole?.cookieRole || "doctor";
    document.cookie = `sehatkosh_role=${roleVal}; path=/; max-age=86400`;
    setLoading(false);

    // Use window.location for reliable navigation after cookie set
    window.location.href = selectedRole!.homeRoute;
  };

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your clinical workspace</p>
      </div>

      <div className="bg-white border border-border rounded-2xl shadow-lg overflow-hidden">
        {/* Step indicator */}
        <div className="flex border-b border-border">
          {(["role", "credentials", "mfa"] as const).map((s, i) => (
            <div key={s} className={cn("flex-1 py-3 text-center text-sm font-semibold transition-colors",
              step === s ? "bg-primary text-white" : i < ["role","credentials","mfa"].indexOf(step) ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
              {i + 1}. {s === "role" ? "Select Role" : s === "credentials" ? "Sign In" : "Verify"}
            </div>
          ))}
        </div>

        <div className="p-8">
          {/* Step 1: Role Selection */}
          {step === "role" && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">Who are you signing in as?</h2>
              <p className="text-sm text-muted-foreground mb-6">Select your role to access your workspace.</p>
              <div className="space-y-3">
                {ROLES.map((rc) => {
                  const Icon = rc.icon;
                  return (
                    <button
                      key={rc.role}
                      id={`role-${rc.role}`}
                      onClick={() => handleRoleSelect(rc)}
                      className="group w-full text-left p-5 rounded-xl border-2 border-border hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-4"
                    >
                      <div className={cn("h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 transition-all", rc.color)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-foreground">{rc.label}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{rc.subtitle}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Credentials */}
          {step === "credentials" && selectedRole && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep("role")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm font-semibold text-foreground">{selectedRole.label}</span>
              </div>
              <h2 className="text-lg font-bold text-foreground mb-6">Sign In</h2>
              <form onSubmit={handleCredentials} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@hospital.edu.pk" className="pl-10 h-12 text-base" id="login-email" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-12 h-12 text-base" id="login-password" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full gap-2 h-12 text-base" disabled={loading} id="login-submit">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
                  Continue to Verification
                </Button>
              </form>
            </div>
          )}

          {/* Step 3: MFA */}
          {step === "mfa" && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">Two-Factor Verification</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter the 6-digit code from your authenticator app.</p>
              <form onSubmit={handleMfa} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">Authenticator Code</label>
                  <Input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000" className="text-center text-2xl tracking-[0.5em] font-mono h-16" id="mfa-code" />
                  <p className="text-sm text-muted-foreground mt-2 text-center">Demo: enter any 6 digits</p>
                </div>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep("credentials")} className="flex-1 h-12 text-base">Back</Button>
                  <Button type="submit" className="flex-1 gap-2 h-12 text-base" disabled={loading} id="mfa-submit">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
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
