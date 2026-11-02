"use client";

import React from "react";
import Link from "next/link";
import {
  Stethoscope,
  Shield,
  Smartphone,
  Heart,
  Lock,
  ArrowRight,
  CheckCircle2,
  Activity,
  FileText,
  Users,
  ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Smartphone,
    title: "Your Records, Your Phone",
    description:
      "All your medical records stored securely on your device. Share them with doctors only when you choose to.",
    color: "text-blue-600 bg-blue-100",
  },
  {
    icon: Lock,
    title: "Patient-Controlled Consent",
    description:
      "Doctors must request access through the app. You approve or deny — always in control of your health data.",
    color: "text-violet-600 bg-violet-100",
  },
  {
    icon: Activity,
    title: "Wearable Integration",
    description:
      "Connect your smartwatch to track vitals in real-time. Your doctor sees trends, not just snapshots.",
    color: "text-emerald-600 bg-emerald-100",
  },
  {
    icon: FileText,
    title: "Prescription Digitization",
    description:
      "Scan paper prescriptions with AI-powered OCR. Converted to structured FHIR records automatically.",
    color: "text-amber-600 bg-amber-100",
  },
  {
    icon: Shield,
    title: "Privacy-First Architecture",
    description:
      "End-to-end encryption, data anonymization for research, and full audit trails for every access.",
    color: "text-red-500 bg-red-100",
  },
  {
    icon: Users,
    title: "Multi-Role Clinical Portal",
    description:
      "Dedicated workspaces for doctors, help desk staff, and hospital administrators — all from one platform.",
    color: "text-indigo-600 bg-indigo-100",
  },
];

const STATS = [
  { value: "1,000+", label: "Active Patients" },
  { value: "14", label: "Connected Hospitals" },
  { value: "387", label: "Registered Physicians" },
  { value: "99.9%", label: "Uptime" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 leading-tight">
                SehatKosh
              </p>
              <p className="text-xs text-slate-500">
                Your Health, Your Control
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50"
              id="nav-signin"
            >
              Sign In
            </Link>
            <a
              href="#download"
              className="text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-5 py-2.5 rounded-xl shadow-md shadow-blue-200 hover:shadow-lg transition-all"
              id="nav-download"
            >
              Download App
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-violet-50" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-violet-100 rounded-full blur-3xl opacity-40" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-blue-700">
                Pakistan's Patient-Centered Health Platform
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.1] mb-6">
              Your Medical Records.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
                Your Control.
              </span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed mb-10 max-w-xl">
              SehatKosh puts patients first. Store your health records securely
              on your phone, share them with doctors only when you consent, and
              track your vitals in real-time.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a
                href="#download"
                className="inline-flex items-center gap-2.5 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-8 py-4 rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all hover:-translate-y-0.5"
                id="hero-download"
              >
                <Smartphone className="h-5 w-5" />
                Download the App
              </a>
              <Link
                href="/login"
                className="inline-flex items-center gap-2.5 text-base font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-blue-300 hover:text-blue-600 px-8 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                id="hero-signin"
              >
                <Stethoscope className="h-5 w-5" />
                Sign In as Professional
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-slate-900 py-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-black text-white">{stat.value}</p>
              <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              How SehatKosh Works
            </h2>
            <p className="text-base text-slate-600 max-w-xl mx-auto">
              A simple three-step process that puts you in control of your
              health data.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Download & Store",
                desc: "Download the SehatKosh app and scan your existing prescriptions. AI converts them into structured digital records stored on your device.",
                icon: Smartphone,
                gradient: "from-blue-500 to-blue-600",
              },
              {
                step: "02",
                title: "Visit & Consent",
                desc: "When you visit a doctor, they send an access request. You approve it from your phone — granting temporary, scoped access to your records.",
                icon: CheckCircle2,
                gradient: "from-violet-500 to-violet-600",
              },
              {
                step: "03",
                title: "Track & Thrive",
                desc: "Connect wearables to monitor vitals. Your doctor sees real-time health trends. Your consent expires automatically after the visit.",
                icon: Activity,
                gradient: "from-emerald-500 to-emerald-600",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative bg-white border-2 border-slate-100 rounded-2xl p-8 hover:border-blue-200 hover:shadow-lg transition-all group"
                >
                  <span className="text-6xl font-black text-slate-100 absolute top-4 right-6 group-hover:text-blue-100 transition-colors">
                    {item.step}
                  </span>
                  <div
                    className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white mb-5 shadow-md`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Built for Patients & Professionals
            </h2>
            <p className="text-base text-slate-600 max-w-xl mx-auto">
              Every feature designed with privacy, usability, and clinical
              accuracy in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div
                    className={`h-11 w-11 rounded-xl ${feature.color} flex items-center justify-center mb-4`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section id="download" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative bg-gradient-to-br from-blue-600 to-violet-600 rounded-3xl p-12 md:p-16 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                Take Control of Your Health
              </h2>
              <p className="text-lg text-blue-100 mb-10 max-w-lg mx-auto">
                Download SehatKosh today and never worry about losing a
                prescription or medical record again.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="#"
                  className="inline-flex items-center gap-3 bg-white text-slate-900 font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg"
                  id="download-android"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                    <path d="M17.523 2.625a.75.75 0 00-1.048.177L14.8 5.32a8.25 8.25 0 00-5.6 0L7.525 2.802a.75.75 0 10-1.225.866L7.9 5.88A8.25 8.25 0 004.5 12.75v.75h15v-.75a8.25 8.25 0 00-3.4-6.87l1.6-2.212a.75.75 0 00-.177-1.048zM9 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zm6 0a.75.75 0 110-1.5.75.75 0 010 1.5zM4.5 14.25v5.25a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25v-5.25h-15z"/>
                  </svg>
                  Get it on Google Play
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-3 bg-white/10 text-white font-bold px-8 py-4 rounded-2xl border-2 border-white/30 hover:bg-white/20 transition-colors"
                  id="download-ios"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Download for iOS
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional CTA */}
      <section className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            Are you a healthcare professional?
          </h3>
          <p className="text-base text-slate-600 mb-8">
            Access the clinical portal to view patient records with
            consent-based authorization.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-base font-bold text-blue-600 bg-white border-2 border-blue-200 hover:border-blue-400 px-8 py-4 rounded-2xl hover:shadow-md transition-all"
            id="professional-signin"
          >
            <Stethoscope className="h-5 w-5" />
            Sign In to Clinical Portal
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">SehatKosh</span>
            </div>
            <p className="text-sm text-center md:text-left">
              © {new Date().getFullYear()} SehatKosh. Built for Pakistan's healthcare ecosystem.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
