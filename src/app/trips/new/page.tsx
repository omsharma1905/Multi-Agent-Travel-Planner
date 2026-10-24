"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { BudgetTier } from "@/types";
import { createTripSchema } from "@/features/trips/schemas";
import { TransportPreference } from "@/features/trips/types";
import { getDestinationVisual } from "@/lib/destination-imagery";
import {
  SectionHeader,
  JourneySummary,
  DestinationImage,
  PrimaryAction,
  SecondaryAction,
  LocationAutocomplete,
} from "@/components/product";
import { useToast } from "@/components/ui/Toast";

const BUDGET_TIERS: { id: BudgetTier; label: string; desc: string }[] = [
  { id: "budget", label: "Essential", desc: "Local trains, street cuisine, authentic discovery" },
  { id: "moderate", label: "Comfort", desc: "Curated boutique stays, character dining" },
  { id: "premium", label: "Elevated", desc: "Distinctive hotels, private guides, priority access" },
  { id: "luxury", label: "Signature", desc: "Legendary 5-star properties, bespoke private transit" },
];

const TRANSPORT_OPTIONS: {
  id: TransportPreference;
  label: string;
  tag: string;
  desc: string;
}[] = [
  {
    id: "auto",
    label: "Let SafariX decide",
    tag: "AUTO",
    desc: "Compare practical options and choose the best fit.",
  },
  {
    id: "flight",
    label: "Fly",
    tag: "FLIGHT",
    desc: "Best for longer distances and time-sensitive trips.",
  },
  {
    id: "train",
    label: "Train",
    tag: "TRAIN",
    desc: "Prefer rail travel where practical.",
  },
  {
    id: "bus",
    label: "Bus",
    tag: "BUS",
    desc: "Prefer bus travel where practical.",
  },
  {
    id: "car",
    label: "Car / Road",
    tag: "CAR",
    desc: "Prefer driving or private road travel.",
  },
];

const AVAILABLE_INTERESTS = [
  "Food & Wine",
  "Culture & Arts",
  "Nature & Outdoors",
  "Active Adventure",
  "Architecture & Design",
  "History & Heritage",
  "Beaches & Islands",
  "Nightlife & Music",
  "Shopping & Markets",
  "Photography",
  "Wellness & Spa",
  "Scenic Road Trips",
];

export default function NewTripPage() {
  const router = useRouter();
  const { user: _user } = useAuth();
  const toast = useToast();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("7");
  const [travelers, setTravelers] = useState("2");
  const [budget, setBudget] = useState<BudgetTier>("moderate");
  const [transportPreference, setTransportPreference] = useState<TransportPreference>("auto");
  const [interests, setInterests] = useState<string[]>([
    "Culture & Arts",
    "Food & Wine",
  ]);
  const [notes, setNotes] = useState("");

  const [step, setStep] = useState<"intake" | "review">("intake");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Dynamic destination image state
  const [dynamicImage, setDynamicImage] = useState<{
    url: string;
    photographer?: string | null;
    photographerUrl?: string | null;
    country?: string | null;
  } | null>(null);
  const [failedImageUrls, setFailedImageUrls] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isCurrent = true;
    const timer = setTimeout(async () => {
      const trimmed = destination.trim();
      if (!trimmed) {
        if (isCurrent) setDynamicImage(null);
        return;
      }

      try {
        const res = await fetch(`/api/destinations/image?query=${encodeURIComponent(trimmed)}`);
        if (res.ok && isCurrent) {
          const data = await res.json();
          if (data && data.url) {
            setDynamicImage({
              url: data.url,
              photographer: data.photographer,
              photographerUrl: data.photographerUrl,
              country: data.country,
            });
            return;
          }
        }
      } catch {
        // Fall back gracefully to static visual
      }
      if (isCurrent) {
        setDynamicImage(null);
      }
    }, 320);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [destination]);

  const staticVisual = destination.trim() ? getDestinationVisual(destination) : null;
  const activeImageUrl = dynamicImage?.url || staticVisual?.image || null;
  const activeCountry = dynamicImage?.country || staticVisual?.country || null;

  const isAllowedImageHost = (url: string | null): boolean => {
    if (!url || typeof url !== "string") return false;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
      const allowedHosts = [
        "upload.wikimedia.org",
        "commons.wikimedia.org",
        "images.unsplash.com",
        "images.pexels.com",
      ];
      return allowedHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
    } catch {
      return false;
    }
  };

  const canRenderActiveImage = Boolean(
    activeImageUrl &&
      isAllowedImageHost(activeImageUrl) &&
      !failedImageUrls[activeImageUrl],
  );

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const handleClearAll = () => {
    setOrigin("");
    setDestination("");
    setDays("7");
    setTravelers("2");
    setBudget("moderate");
    setInterests([]);
    setNotes("");
    setErrors({});
    setSubmitError(null);
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    const result = createTripSchema.safeParse({
      origin: origin.trim() || undefined,
      destination: destination.trim(),
      days: Number(days),
      travellers: Number(travelers),
      budget,
      transportPreference,
      interests,
      notes: notes.trim() || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString() || "form";
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      toast.warning("Please complete all required fields before reviewing.");
      return;
    }

    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinalCreate = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: origin.trim() || undefined,
          destination: destination.trim(),
          days: Number(days),
          travellers: Number(travelers),
          budget,
          transportPreference,
          interests,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to create journey. Please try again.");
      }

      const createdTrip = await res.json();
      toast.success("Journey created.", "SafariX is opening your journey workspace.");
      router.push(`/trips/${createdTrip.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create journey. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  // Section status helper for the progress bar
  const SECTIONS = [
    { id: "section-where", num: "01", label: "WHERE", isFilled: Boolean(destination.trim()) },
    { id: "section-duration", num: "02", label: "WHEN", isFilled: Boolean(days) },
    { id: "section-who", num: "03", label: "WHO", isFilled: Boolean(travelers) },
    { id: "section-comfort", num: "04", label: "COMFORT", isFilled: Boolean(budget) },
    { id: "section-transport", num: "05", label: "TRANSPORT", isFilled: Boolean(transportPreference) },
    { id: "section-interests", num: "06", label: "INTERESTS", isFilled: interests.length > 0 },
    { id: "section-notes", num: "07", label: "NOTES", isFilled: Boolean(notes.trim()) },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AppShell>
      <div className="w-full bg-[#F8F5EE] text-[#171A18] min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-8 sm:py-12 space-y-10">
          {/* Header Navigation Link */}
          <div className="flex items-center justify-between border-b border-[#171A18]/10 pb-4">
            <Link
              href={ROUTES.dashboard}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#5C625E] hover:text-[#171A18] transition-colors group"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              <span>RETURN TO WORKSPACE</span>
            </Link>
            <span className="font-mono text-xs uppercase tracking-widest text-[#5C625E]/60">
              {step === "intake" ? "STAGE 01 // SPECIFICATION" : "STAGE 02 // REVIEW"}
            </span>
          </div>

          {submitError && (
            <div
              role="alert"
              className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-xs text-red-600 font-mono"
            >
              {submitError}
            </div>
          )}

          {step === "intake" ? (
            /* ========================================================================= */
            /* STEP 1: TWO-COLUMN EDITORIAL TRAVEL PLANNER LAYOUT                        */
            /* ========================================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              {/* LEFT COLUMN: Travel Form (approx 60-65%) */}
              <div className="lg:col-span-7 xl:col-span-7 space-y-10">
                {/* Introduction */}
                <div className="space-y-2">
                  <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#1F3D2B] font-semibold block">
                    TRIP PLANNER
                  </span>
                  <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-[#171A18]">
                    PLAN A JOURNEY
                  </h1>
                  <p className="text-sm sm:text-base text-[#5C625E] font-normal leading-relaxed">
                    Tell us a little about your trip. SafariX will take care of the planning.
                  </p>
                </div>

                {/* Compact Planning Progress Indicator */}
                <nav
                  aria-label="Planning Sections"
                  className="border-y border-[#111111]/10 py-3.5 overflow-x-auto no-scrollbar"
                >
                  <div className="flex items-center justify-between gap-4 min-w-[480px]">
                    {SECTIONS.map((sec, idx) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className="flex items-center gap-2 group text-left cursor-pointer transition-colors"
                      >
                        <span
                          className={`font-mono text-xs font-bold transition-colors ${
                            sec.isFilled
                              ? "text-[#F06C5B]"
                              : idx === 0
                              ? "text-[#1F3D2B]"
                              : "text-[#111111]/40 group-hover:text-[#111111]"
                          }`}
                        >
                          {sec.num}
                        </span>
                        <span
                          className={`font-mono text-[11px] uppercase tracking-wider font-semibold transition-colors ${
                            sec.isFilled
                              ? "text-[#111111]"
                              : "text-[#111111]/50 group-hover:text-[#111111]"
                          }`}
                        >
                          {sec.label}
                        </span>
                        {idx < SECTIONS.length - 1 && (
                          <span className="text-[#111111]/20 text-xs ml-2 select-none">/</span>
                        )}
                      </button>
                    ))}
                  </div>
                </nav>

                {/* The 6 Planning Chapters */}
                <form onSubmit={handleProceedToReview} noValidate className="space-y-12">
                  {/* CHAPTER 01: WHERE TO? */}
                  <section id="section-where" className="space-y-6 scroll-mt-28">
                    <SectionHeader
                      number="01"
                      title="WHERE TO?"
                      description="Enter your origin and destination city, region, or hub."
                    />

                    <div className="space-y-6">
                      {/* ORIGIN AUTOCOMPLETE */}
                      <LocationAutocomplete
                        id="origin"
                        label="FROM // ORIGIN (OPTIONAL)"
                        value={origin}
                        onChange={(val) => {
                          setOrigin(val);
                          if (errors.origin) {
                            setErrors((prev) => ({ ...prev, origin: "" }));
                          }
                        }}
                        placeholder="e.g. Bhopal, London, or New York"
                        error={errors.origin}
                        ariaLabel="Origin"
                      />

                      {/* DESTINATION AUTOCOMPLETE */}
                      <LocationAutocomplete
                        id="destination"
                        label="TO // DESTINATION"
                        value={destination}
                        onChange={(val, loc) => {
                          setDestination(val);
                          if (loc?.country) {
                            setDynamicImage((prev) => ({
                              url: prev?.url || "",
                              photographer: prev?.photographer,
                              country: loc.country,
                            }));
                          }
                          if (errors.destination) {
                            setErrors((prev) => ({ ...prev, destination: "" }));
                          }
                        }}
                        placeholder="e.g. Jaipur, Tokyo, or Barcelona"
                        error={errors.destination}
                        ariaLabel="Destination"
                        required
                      />
                    </div>
                  </section>


                  {/* CHAPTER 02: HOW LONG? */}
                  <section id="section-duration" className="space-y-4 scroll-mt-28">
                    <SectionHeader
                      number="02"
                      title="HOW LONG?"
                      description="Duration of your journey (between 1 and 30 days)."
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { count: 3, label: "3 DAYS", sub: "Weekend Escape" },
                        { count: 5, label: "5 DAYS", sub: "Short Break" },
                        { count: 7, label: "7 DAYS", sub: "Full Exploration" },
                        { count: 10, label: "10 DAYS", sub: "Deep Discovery" },
                        { count: 14, label: "14 DAYS", sub: "Grand Expedition" },
                        { count: 21, label: "21 DAYS", sub: "Epic Sabbatical" },
                      ].map((item) => {
                        const isSelected = Number(days) === item.count;
                        return (
                          <button
                            key={item.count}
                            type="button"
                            onClick={() => setDays(item.count.toString())}
                            className={`p-3.5 rounded-2xl border text-left transition-all ${
                              isSelected
                                ? "bg-[#1F3D2B] text-white border-[#1F3D2B] shadow-md ring-1 ring-[#1F3D2B]"
                                : "bg-white/80 border-[#171A18]/15 text-[#171A18] hover:border-[#1F3D2B]/50"
                            }`}
                          >
                            <span className="font-mono text-xs font-bold block uppercase tracking-wider">
                              {item.label}
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${isSelected ? "text-white/80" : "text-[#5C625E]"}`}>
                              {item.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <span className="font-mono text-xs text-[#5C625E]">CUSTOM DURATION:</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="w-20 text-center rounded-xl border border-[#171A18]/20 bg-white py-1.5 font-mono text-sm font-bold text-[#171A18] focus:border-[#1F3D2B] focus:outline-none"
                      />
                      <span className="font-mono text-xs text-[#5C625E]">DAYS (MAX 30)</span>
                    </div>
                    {errors.days && (
                      <p className="font-mono text-xs text-red-600 mt-1">{errors.days}</p>
                    )}
                  </section>

                  {/* CHAPTER 03: WHO'S TRAVELLING? */}
                  <section id="section-who" className="space-y-4 scroll-mt-28">
                    <SectionHeader
                      number="03"
                      title="WHO'S TRAVELLING?"
                      description="Select the size and composition of your party."
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { count: 1, label: "SOLO", sub: "Individual explorer" },
                        { count: 2, label: "DUO", sub: "Couple or partners" },
                        { count: 3, label: "TRIO", sub: "Small group" },
                        { count: 4, label: "CREW (4+)", sub: "Family or party" },
                      ].map((item) => {
                        const isSelected = Number(travelers) === item.count || (item.count === 4 && Number(travelers) >= 4);
                        return (
                          <button
                            key={item.count}
                            type="button"
                            onClick={() => setTravelers(item.count.toString())}
                            className={`p-3.5 rounded-2xl border text-left transition-all ${
                              isSelected
                                ? "bg-[#1F3D2B] text-white border-[#1F3D2B] shadow-md ring-1 ring-[#1F3D2B]"
                                : "bg-white/80 border-[#171A18]/15 text-[#171A18] hover:border-[#1F3D2B]/50"
                            }`}
                          >
                            <span className="font-mono text-xs font-bold block uppercase tracking-wider">
                              {item.label}
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${isSelected ? "text-white/80" : "text-[#5C625E]"}`}>
                              {item.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <span className="font-mono text-xs text-[#5C625E]">EXACT COUNT:</span>
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={travelers}
                        onChange={(e) => setTravelers(e.target.value)}
                        className="w-20 text-center rounded-xl border border-[#171A18]/20 bg-white py-1.5 font-mono text-sm font-bold text-[#171A18] focus:border-[#1F3D2B] focus:outline-none"
                      />
                      <span className="font-mono text-xs text-[#5C625E]">
                        {Number(travelers) === 1 ? "TRAVELER" : "TRAVELERS"}
                      </span>
                    </div>
                    {errors.travellers && (
                      <p className="font-mono text-xs text-red-600 mt-1">{errors.travellers}</p>
                    )}
                  </section>

                  {/* CHAPTER 04: WHAT LEVEL OF COMFORT? */}
                  <section id="section-comfort" className="space-y-4 scroll-mt-28">
                    <SectionHeader
                      number="04"
                      title="WHAT LEVEL OF COMFORT?"
                      description="Select the level of comfort, accommodations, and service style."
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {BUDGET_TIERS.map((tier) => {
                        const isSelected = budget === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setBudget(tier.id)}
                            className={`text-left p-4 sm:p-5 rounded-xl border transition-all ${
                              isSelected
                                ? "border-[#1F3D2B] bg-[#E3EBE4]/70 shadow-sm ring-1 ring-[#1F3D2B]"
                                : "border-[#171A18]/15 bg-white/70 hover:border-[#171A18]/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-display text-base font-bold uppercase tracking-tight text-[#171A18]">
                                {tier.label}
                              </span>
                              <span
                                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? "border-[#1F3D2B] bg-[#1F3D2B]"
                                    : "border-[#171A18]/30"
                                }`}
                              >
                                {isSelected && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-[#5C625E] font-normal leading-relaxed">
                              {tier.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* CHAPTER 05: HOW DO YOU WANT TO TRAVEL? */}
                  <section id="section-transport" className="space-y-4 scroll-mt-28">
                    <SectionHeader
                      number="05"
                      title="HOW DO YOU WANT TO TRAVEL?"
                      description="Choose your preferred mode of transportation or let SafariX optimize it."
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {TRANSPORT_OPTIONS.map((opt) => {
                        const isSelected = transportPreference === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTransportPreference(opt.id)}
                            className={`text-left p-4 sm:p-5 rounded-xl border transition-all ${
                              isSelected
                                ? "border-[#1F3D2B] bg-[#E3EBE4]/70 shadow-sm ring-1 ring-[#1F3D2B]"
                                : "border-[#171A18]/15 bg-white/70 hover:border-[#171A18]/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-display text-base font-bold uppercase tracking-tight text-[#171A18]">
                                  {opt.label}
                                </span>
                                {opt.id === "auto" && (
                                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#1F3D2B] bg-[#D8E4DA] px-2 py-0.5 rounded font-bold border border-[#52795D]/30">
                                    DEFAULT
                                  </span>
                                )}
                              </div>
                              <span
                                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? "border-[#1F3D2B] bg-[#1F3D2B]"
                                    : "border-[#171A18]/30"
                                }`}
                              >
                                {isSelected && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-[#5C625E] font-normal leading-relaxed">
                              {opt.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* CHAPTER 06: WHAT INTERESTS YOU? */}
                  <section id="section-interests" className="space-y-4 scroll-mt-28">
                    <SectionHeader
                      number="06"
                      title="WHAT INTERESTS YOU?"
                      description="Choose themes and activities you want highlighted in the itinerary."
                    />

                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_INTERESTS.map((interest) => {
                        const isSelected = interests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            className={`px-3.5 py-2 rounded-full font-mono text-xs uppercase tracking-wider font-semibold transition-all ${
                              isSelected
                                ? "bg-[#111111] text-white shadow-sm"
                                : "border border-[#111111]/15 bg-white/60 text-[#111111]/80 hover:border-[#111111]"
                            }`}
                          >
                            {interest} {isSelected ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* CHAPTER 07: ANY SPECIAL NOTES? */}
                  <section id="section-notes" className="space-y-4 scroll-mt-28">
                    <SectionHeader
                      number="07"
                      title="ANY SPECIAL NOTES?"
                      description="Any specific requirements, dietary notes, or preferred neighborhoods."
                    />

                    <div>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Vegetarian dining preference, prefer boutique hotels in historic areas."
                        className="w-full border border-[#111111]/15 rounded-xl bg-white/70 p-4 text-sm text-[#111111] placeholder:text-[#111111]/30 focus:border-[#1F3D2B] focus:outline-none focus:ring-1 focus:ring-[#1F3D2B] transition-all"
                      />
                    </div>
                  </section>

                  {/* BOTTOM ACTION AREA */}
                  <div className="pt-8 border-t border-[#111111]/10 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="font-mono text-xs uppercase tracking-wider text-[#111111]/50 hover:text-[#111111] transition-colors"
                    >
                      CLEAR ALL
                    </button>

                    <PrimaryAction label="REVIEW YOUR JOURNEY" type="submit" />
                  </div>
                </form>
              </div>

              {/* RIGHT COLUMN: Editorial Destination Visual Panel (approx 35-40%) */}
              <aside className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24">
                <div className="rounded-3xl border border-[#111111]/12 bg-[#111111] text-[#FAF7F0] overflow-hidden relative min-h-[480px] lg:min-h-[620px] flex flex-col justify-between p-6 sm:p-8 shadow-xl">
                  {/* Verified Destination Image or Neutral State */}
                  {canRenderActiveImage && activeImageUrl ? (
                    <>
                      <Image
                        src={activeImageUrl}
                        alt={destination.trim() ? `${destination} destination preview` : "Destination preview"}
                        fill
                        priority
                        onError={() =>
                          setFailedImageUrls((prev) => ({ ...prev, [activeImageUrl]: true }))
                        }
                        className="object-cover transition-transform duration-1000 ease-out"
                        sizes="(max-width: 1024px) 100vw, 40vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/30" />
                    </>
                  ) : (
                    /* Neutral SafariX Visual Treatment */
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% 30%, #1f2329 0%, #111215 65%, #0a0b0d 100%)",
                      }}
                    >
                      <div
                        className="absolute inset-0 opacity-15"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
                          backgroundSize: "28px 28px",
                        }}
                      />
                    </div>
                  )}

                  {/* Top Metadata */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#F06C5B] font-semibold bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                      DESTINATION PREVIEW
                    </span>

                    {destination.trim() && (
                      <div className="flex items-center gap-2">
                        {dynamicImage?.photographer && (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-white/60 bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs hidden sm:inline-block">
                            Photo: {dynamicImage.photographer}
                          </span>
                        )}
                        <span className="font-mono text-xs uppercase tracking-wider text-white/70">
                          {activeCountry || "GLOBAL"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Center Destination Title */}
                  <div className="relative z-10 my-auto py-6">
                    {destination.trim() ? (
                      <div className="space-y-2">
                        <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#1F3D2B] font-semibold block">
                          YOUR COMMISSION
                        </span>
                        <h3 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-white leading-[0.95]">
                          {destination}
                        </h3>
                        <JourneySummary
                          days={Number(days)}
                          travelers={Number(travelers)}
                          budget={budget}
                          className="text-white/70 pt-2"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3 text-center sm:text-left">
                        <div className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center font-mono text-xs text-white/50 mb-2">
                          ✦
                        </div>
                        <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white/90">
                          CHOOSE YOUR DESTINATION
                        </h3>
                        <p className="text-xs text-white/60 font-light max-w-xs leading-relaxed">
                          Enter a city or region in the intake to preview your journey specifications.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Understated Editorial Copy */}
                  <div className="relative z-10 border-t border-white/10 pt-4 space-y-1.5">
                    <p className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-white/95">
                      {destination.trim()
                        ? "PLAN LESS. EXPERIENCE MORE."
                        : "YOUR PLACE. YOUR PACE. YOUR JOURNEY."}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono tracking-[0.2em] text-white/50">
                      <span className="uppercase">INTELLIGENT TRAVEL</span>
                      <span>SafariX</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            /* ========================================================================= */
            /* STEP 2: STRUCTURED REVIEW (CLEAR SPECIFICATION SUMMARY)                   */
            /* ========================================================================= */
            <div className="max-w-4xl mx-auto space-y-10">
              <div className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#1F3D2B] font-semibold block">
                  VERIFICATION
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-[#111111]">
                  CONFIRM SPECIFICATIONS
                </h2>
                <p className="text-sm text-[#111111]/70 font-normal">
                  Review your specifications before initializing multi-agent journey planning.
                </p>
              </div>

              {activeImageUrl && (
                <div className="space-y-1.5">
                  <DestinationImage
                    src={activeImageUrl}
                    alt={destination}
                    destinationName={destination}
                    country={activeCountry || undefined}
                    aspectClassName="relative w-full h-[280px] sm:h-[340px]"
                  />
                  {dynamicImage?.photographer && (
                    <p className="font-mono text-[10px] text-[#111111]/40 uppercase tracking-wider text-right">
                      Photography © {dynamicImage.photographer}
                    </p>
                  )}
                </div>
              )}

              <div className="border border-[#111111]/10 rounded-2xl bg-white/70 p-6 sm:p-8 space-y-6">
                <div className="border-b border-[#111111]/10 pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    {origin.trim() && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block mb-0.5">
                        DEPARTING FROM {origin.toUpperCase()}
                      </span>
                    )}
                    <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[#111111]">
                      {destination}
                    </h3>
                  </div>
                  <JourneySummary
                    days={Number(days)}
                    travelers={Number(travelers)}
                    budget={budget}
                  />
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block mb-1">
                      TRANSPORTATION PREFERENCE
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold uppercase tracking-tight text-[#111111]">
                          {TRANSPORT_OPTIONS.find((t) => t.id === transportPreference)?.label || "Auto"}
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#1F3D2B] bg-[#1F3D2B]/10 px-1.5 py-0.5 rounded font-bold">
                          {TRANSPORT_OPTIONS.find((t) => t.id === transportPreference)?.tag || "AUTO"}
                        </span>
                      </div>
                      <p className="text-[#111111]/60 text-[11px] leading-relaxed">
                        {TRANSPORT_OPTIONS.find((t) => t.id === transportPreference)?.desc}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block mb-1">
                      SELECTED THEMES
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {interests.length > 0 ? (
                        interests.map((it) => (
                          <span
                            key={it}
                            className="px-2.5 py-1 rounded-md bg-[#111111]/5 font-mono text-[11px] text-[#111111]"
                          >
                            {it}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#111111]/50">No specific themes selected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block mb-1">
                      NOTES & PREFERENCES
                    </span>
                    <p className="text-[#111111]/80 text-xs">
                      {notes.trim() || "No special notes provided."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-[#111111]/10">
                <SecondaryAction
                  label="EDIT SPECIFICATIONS"
                  onClick={() => setStep("intake")}
                  className="w-full sm:w-auto text-center"
                />

                <PrimaryAction
                  label="BUILD MY JOURNEY"
                  onClick={handleFinalCreate}
                  loading={isSubmitting}
                  className="w-full sm:w-auto text-center"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
