import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/AuthCard";
import { ROUTES } from "@/lib/constants";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your SafariX account and start planning complete, personalized journeys.",
};

export default async function SignUpPage(props: {
  searchParams?: Promise<{ redirect?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const user = await getAuthenticatedUser();
  if (user && !searchParams?.redirect) {
    redirect(ROUTES.dashboard);
  }

  return (
    <div className="relative min-h-screen bg-[#070A09] text-[#F4F1E5] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden">
      {/* 1. Deep Obsidian Base with Radial Forest-Green Glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(6,61,46,0.42)_0%,rgba(7,10,9,0.88)_58%,#050706_100%)] pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. Soft Emerald Backdrop Halo Centered on Card */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[880px] h-[560px] bg-[#0A4D3B]/25 blur-[120px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* 3. Subtle Geographic Reference Lines in Corners */}
      <div className="absolute top-6 left-8 font-mono text-[10px] uppercase tracking-[0.25em] text-[#F4F1E5]/25 hidden md:block select-none">
        PORTAL // EXPEDITION TERMINAL
      </div>
      <div className="absolute top-6 right-8 font-mono text-[10px] uppercase tracking-[0.25em] text-[#F4F1E5]/25 hidden md:block select-none">
        COORD // 35.6762° N · 139.6503° E
      </div>
      <div className="absolute bottom-6 left-8 font-mono text-[10px] uppercase tracking-[0.25em] text-[#F4F1E5]/25 hidden md:block select-none">
        SAFARIX INTELLIGENCE // 6 COOPERATIVE AGENTS
      </div>
      <div className="absolute bottom-6 right-8 font-mono text-[10px] uppercase tracking-[0.25em] text-[#F4F1E5]/25 hidden md:block select-none">
        EST. 2026 // RELEASE READY
      </div>

      <main className="relative z-10 w-full max-w-[980px] lg:max-w-[1020px] my-auto">
        <Suspense
          fallback={
            <div className="w-full max-w-[960px] mx-auto h-[530px] rounded-2xl bg-[#063D2E]/20 border border-white/5 animate-pulse flex items-center justify-center text-xs font-mono text-[#F4F1E5]/40">
              Loading SafariX authentication...
            </div>
          }
        >
          <AuthCard initialMode="sign-up" />
        </Suspense>
      </main>
    </div>
  );
}
