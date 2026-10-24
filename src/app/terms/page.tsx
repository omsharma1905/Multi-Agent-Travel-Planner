import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/navigation/Logo";
import { ROUTES, APP_BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "SafariX terms of service — policies, service agreements, and terms of use for SafariX travel planning.",
};

export default function TermsPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-screen bg-[#F8F5EE] text-[#111111] flex flex-col justify-between selection:bg-[#1F3D2B] selection:text-white">
      {/* Top Header */}
      <header className="w-full border-b border-[#111111]/10 bg-white/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo textColor="text-[#111111]" />
          <Link
            href={ROUTES.home}
            className="font-mono text-xs uppercase tracking-widest text-[#111111]/70 hover:text-[#1F3D2B] transition-colors inline-flex items-center gap-1.5"
          >
            <span>←</span>
            <span>BACK TO SAFARIX</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 sm:py-16 w-full space-y-10">
        <div className="space-y-3 border-b border-[#111111]/10 pb-8">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#F06C5B] font-semibold">
            LEGAL & AGREEMENTS
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-[#111111]">
            TERMS OF SERVICE
          </h1>
          <p className="text-sm font-mono text-[#111111]/60">
            LAST UPDATED: OCTOBER 2026 · {APP_BRAND} TERMS OF USE
          </p>
        </div>

        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-[#111111]/80 font-normal">
          <section className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#111111]">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using SafariX, creating an account, or generating travel plans, you agree to be bound by these Terms of Service. If you disagree with any portion of these terms, please discontinue using the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#111111]">
              2. Platform Nature & Recommendations
            </h2>
            <p>
              SafariX provides intelligent route orchestration and travel planning assistance. Recommendations for transportation, accommodations, and dining reflect real-time and curated provider data. Travelers are advised to confirm bookings and verify entry prerequisites directly with operating carriers and local authorities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#111111]">
              3. Account Responsibilities
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to notify SafariX immediately upon discovering any unauthorized use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#111111]">
              4. Contact
            </h2>
            <p>
              Questions regarding these terms may be directed to{" "}
              <a
                href="mailto:hello@safarix.travel"
                className="text-[#1F3D2B] underline hover:text-[#14281C]"
              >
                hello@safarix.travel
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#111111]/10 py-6 text-center text-xs font-mono uppercase tracking-wider text-[#111111]/50">
        © {currentYear} {APP_BRAND}. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
