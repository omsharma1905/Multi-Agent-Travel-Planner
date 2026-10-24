import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/navigation/Logo";
import { ROUTES, APP_BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "SafariX privacy policy — how we safeguard your travel data and personal preferences.",
};

export default function PrivacyPage() {
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
            LEGAL & COMPLIANCE
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-[#111111]">
            PRIVACY POLICY
          </h1>
          <p className="text-sm font-mono text-[#111111]/60">
            LAST UPDATED: OCTOBER 2026 · {APP_BRAND} TRAVEL INTELLIGENCE
          </p>
        </div>

        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-[#111111]/80 font-normal">
          <section className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#111111]">
              1. Information We Collect
            </h2>
            <p>
              When you use SafariX to curate expeditions, we collect details necessary to compose and synchronize your itineraries:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-light text-sm">
              <li><strong>Account Credentials:</strong> Name, email address, and authentication preferences.</li>
              <li><strong>Journey Parameters:</strong> Origins, destinations, departure dates, duration, budget, and travel preferences.</li>
              <li><strong>Saved Collections:</strong> Saved journeys, archived journeys, and destination wishlist records.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#111111]">
              2. How Your Data Is Utilized
            </h2>
            <p>
              SafariX uses multi-agent intelligent planning engines to assemble transportation, accommodations, activities, and dining options tailored specifically to your requests. We do not sell your personal data or journey records to third-party advertising networks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#111111]">
              3. Data Security & Storage
            </h2>
            <p>
              Your journey parameters and account data are encrypted in transit via Transport Layer Security (TLS) and stored in secure database environments. You maintain full ownership of your journey archives and may export or delete your trips at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#111111]">
              4. Contact & Inquiries
            </h2>
            <p>
              For privacy requests, inquiries, or account data deletion requests, contact our legal and privacy team at{" "}
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
