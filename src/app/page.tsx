import type { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth/server";
import {
  StitchNavbar,
  StitchHero,
  StitchDestinations,
  StitchMultiAgentSection,
  StitchWorkflow,
  StitchFinalCTA,
  StitchFooter,
  StitchMobileBottomNav,
} from "@/components/landing/stitch";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SafariX — Luxury Expeditions & AI Travel Planner",
  description:
    "Turn your travel ideas into verified autonomous itineraries with real sanctuaries, private aviation, Michelin-curated dining, and transparent live budgets.",
};

export default async function HomePage() {
  const user = await getAuthenticatedUser();

  return (
    <div className="relative min-h-screen bg-surface text-on-surface overflow-x-hidden selection:bg-secondary/30 selection:text-secondary pb-16 md:pb-0">
      {/* Floating Glassmorphic Header */}
      <StitchNavbar initialUser={user} />

      <main id="main-content" className="flex flex-col w-full">
        {/* Hero with Ha Long Bay Parallax and 3D Elevated Planning Console */}
        <StitchHero />

        {/* Curated Sanctuaries Section (Interactive 3D Cards) */}
        <StitchDestinations />

        {/* Multi-Agent Swarm & Live Master Itinerary */}
        <StitchMultiAgentSection />

        {/* 4-Step Intuitive Workflow */}
        <StitchWorkflow />

        {/* Final Cinematic Panoramic CTA */}
        <StitchFinalCTA />
      </main>

      {/* Brand Footer */}
      <StitchFooter />

      {/* Mobile Fixed Glass Bottom Navigation */}
      <StitchMobileBottomNav />
    </div>
  );
}
