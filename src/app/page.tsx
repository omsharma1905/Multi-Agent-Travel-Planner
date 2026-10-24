import type { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { Navbar } from "@/components/navigation/Navbar";
import {
  Hero,
  HowItWorks,
  MultiAgentDossierScene,
  DestinationsGallery,
  FAQSection,
  FinalCTA,
  Footer,
  LandingOpeningExperience,
} from "@/components/landing";
import { ContinuousMarquee } from "@/components/ui/ContinuousMarquee";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SafariX — AI Travel Planner",
  description:
    "SafariX plans complete journeys with transportation, stays, activities, food, and day-by-day itineraries tailored to your trip.",
};

/**
 * SafariX — Commercial Travel Brand Landing Page (Phase 18.2 Spatial Interaction & Compressed Flow).
 *
 * 5 Streamlined Primary Scenes:
 * Scene 0: OPENING EXPERIENCE — Multilingual "Hello" sequence across 10 global scripts + Early Access Notice
 * Scene 1: HERO — Centered atmospheric twilight hero with cursor-reactive 3D tablet mockup & depth tilt
 * Scene 2: THE JOURNEY IN MOTION — Compact 3-step editorial journey with boutique stay photography
 * Scene 3: MULTI-AGENT PLANNING & DOSSIER — Unified agent features + interactive digital boarding pass & route waypoints
 * Scene 4: DESTINATION GALLERY — Asymmetric Kyoto anchor & top expedition cards
 * Scene 5: CLARITY, CTA & FOOTER — Accordion FAQ, sunset closing CTA, and luxury brand footer
 */
export default async function HomePage() {
  const user = await getAuthenticatedUser();

  return (
    <div className="relative min-h-screen bg-[#F3F0E6] text-[#104735] overflow-x-hidden selection:bg-[#104735] selection:text-[#F3F0E6]">
      {/* 00. Multilingual Opening Curtain + Early Access Notice */}
      <LandingOpeningExperience />

      {/* Floating Travel Brand Navigation (Synchronized with verified server session) */}
      <Navbar initialUser={user} />

      <main id="main-content">
        {/* Scene 1: Centered Hero with Cursor-Reactive 3D Tablet Mockup */}
        <Hero />

        {/* Scene 2: The Journey in Motion (Compact 3-Step Editorial & Mobile Mockup) */}
        <HowItWorks />

        {/* Scene 3: Multi-Agent Planning & Journey Dossier (Unified Features + Live Digital Dossier) */}
        <MultiAgentDossierScene />

        {/* Scene 4: Inspire Your Adventure (Asymmetric Destination Gallery) */}
        <DestinationsGallery />

        {/* Continuous Luxury Expedition Ribbon */}
        <ContinuousMarquee />

        {/* Scene 5: Have Questions? (FAQ Accordion) */}
        <FAQSection />

        {/* Final Cinematic Sunset CTA */}
        <FinalCTA />
      </main>

      {/* Brand Footer */}
      <Footer />
    </div>
  );
}
