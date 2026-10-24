"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { Trip } from "@/features/trips/types";
import { getDestinationVisual } from "@/lib/destination-imagery";
import {
  JourneySummary,
  StatusIndicator,
  EmptyState,
  DeleteJourneyModal,
} from "@/components/product";
import { useToast } from "@/components/ui/Toast";

const QUICK_INSPIRATIONS = [
  { name: "Kyoto, Japan", tag: "7 Days · Ryokan & Rail", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80" },
  { name: "Amalfi Coast, Italy", tag: "5 Days · Coastal Ferry", image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80" },
  { name: "Swiss Alps, Zermatt", tag: "6 Days · Glacier Rail", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80" },
  { name: "Bali, Indonesia", tag: "7 Days · Nature & Beach", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDeleteTrip, setPendingDeleteTrip] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savingTripId, setSavingTripId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/trips");
      if (res.ok) {
        const data: Trip[] = await res.json();
        setTrips(data);
      } else {
        setLoadError("We couldn't load your journeys right now. Please check your connection and try again.");
      }
    } catch {
      setLoadError("We couldn't connect to SafariX travel services. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function initLoad() {
      try {
        const res = await fetch("/api/trips");
        if (res.ok) {
          const data: Trip[] = await res.json();
          if (isMounted) setTrips(data);
        } else {
          if (isMounted) setLoadError("We couldn't load your journeys right now. Please check your connection and try again.");
        }
      } catch {
        if (isMounted) setLoadError("We couldn't connect to SafariX travel services. Please check your network and try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initLoad();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleSave = async (tripId: string, currentSaved: boolean) => {
    setSavingTripId(tripId);
    try {
      const res = await fetch(`/api/trips/${tripId}/saved`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: !currentSaved }),
      });

      if (res.ok) {
        setTrips((prev) =>
          prev.map((t) => (t.id === tripId ? { ...t, isSaved: !currentSaved } : t)),
        );
        if (!currentSaved) {
          toast.success("Journey saved.");
        } else {
          toast.info("Journey removed from Saved Journeys.");
        }
      } else {
        toast.error("Couldn't update saved status. Please try again.");
      }
    } catch {
      toast.error("Couldn't update saved status. Please check your connection.");
    } finally {
      setSavingTripId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteTrip) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/trips/${pendingDeleteTrip.id}`, {
        method: "DELETE",
      });

      if (res.ok || res.status === 404) {
        setTrips((prev) => prev.filter((t) => t.id !== pendingDeleteTrip.id));
        setPendingDeleteTrip(null);
        toast.success("Journey deleted.");
      } else {
        toast.error("Couldn't delete this journey. Nothing was changed.");
      }
    } catch {
      toast.error("Couldn't delete this journey. Please check your connection.");
    } finally {
      setIsDeleting(false);
    }
  };

  const activeTrips = trips.filter((t) => t.status !== "completed");
  const savedTrips = trips.filter((t) => t.isSaved);
  const completedTrips = trips.filter((t) => t.status === "completed");

  const featuredTrip = activeTrips.length > 0 ? activeTrips[0] : null;
  const otherTrips = activeTrips.length > 1 ? activeTrips.slice(1) : [];
  const featuredVisual = featuredTrip ? getDestinationVisual(featuredTrip.destination) : null;

  return (
    <AppShell>
      <div className="w-full bg-[#F8F5EE] text-[#171A18] min-h-[calc(100vh-5rem)] pb-24 sm:pb-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12 space-y-12 sm:space-y-16">
          
          {/* 1. Welcoming Editorial Header & Quick Destination Search (Reference 3, 4, 5) */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#171A18]/10 pb-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#1F3D2B] font-semibold block mb-1">
                  PERSONAL TRAVEL WORKSPACE
                </span>
                <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-[#171A18]">
                  {user?.name ? `Hello, ${user.name.split(" ")[0]}.` : "Where next?"}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-[#5C625E] font-normal">
                  Your active expeditions, multi-agent itineraries, and saved destinations.
                </p>
              </div>

              <Link
                href={ROUTES.trips.new}
                className="inline-flex items-center gap-2 rounded-full bg-[#1F3D2B] px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-[#F8F5EE] hover:bg-[#14281C] shadow-md transition-all self-start md:self-auto"
              >
                <span>✦ Plan A Journey</span>
                <span>→</span>
              </Link>
            </div>

            {/* Quick Destination Intake Search Capsule (Reference 3 & 4) */}
            <div className="rounded-2xl bg-white p-3 sm:p-4 shadow-sm border border-[#171A18]/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-3 w-full sm:flex-1 px-2">
                <span className="text-[#1F3D2B] text-base">🔍</span>
                <input
                  type="text"
                  placeholder="Where do you want to explore next? e.g. Tokyo, Kyoto, Paris, Goa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm font-sans bg-transparent placeholder:text-[#5C625E]/60 focus:outline-none"
                />
              </div>

              <Link
                href={`${ROUTES.trips.new}${searchQuery ? `?destination=${encodeURIComponent(searchQuery)}` : ""}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#171A18] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#1F3D2B] transition-colors shrink-0"
              >
                <span>Launch Intake →</span>
              </Link>
            </div>
          </div>

          {/* 2. Workspace Navigation Bar Cards (4 Quick Access Panels) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href={ROUTES.trips.new}
              className="p-5 rounded-2xl bg-white border border-[#171A18]/10 hover:border-[#1F3D2B] transition-all hover:shadow-md group space-y-2"
            >
              <div className="h-8 w-8 rounded-xl bg-[#1F3D2B]/10 text-[#1F3D2B] flex items-center justify-center text-sm font-bold">
                ✦
              </div>
              <div>
                <h4 className="font-display text-sm font-bold uppercase text-[#171A18] group-hover:text-[#1F3D2B]">
                  Plan New Trip
                </h4>
                <p className="text-xs text-[#5C625E]">Multi-agent engine</p>
              </div>
            </Link>

            <Link
              href={ROUTES.trips.saved}
              className="p-5 rounded-2xl bg-white border border-[#171A18]/10 hover:border-[#1F3D2B] transition-all hover:shadow-md group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-sm font-bold">
                  ★
                </div>
                <span className="font-mono text-xs font-bold text-[#171A18]">
                  {savedTrips.length}
                </span>
              </div>
              <div>
                <h4 className="font-display text-sm font-bold uppercase text-[#171A18] group-hover:text-[#1F3D2B]">
                  Saved Journeys
                </h4>
                <p className="text-xs text-[#5C625E]">Bookmarked dossiers</p>
              </div>
            </Link>

            <Link
              href={ROUTES.trips.completed}
              className="p-5 rounded-2xl bg-white border border-[#171A18]/10 hover:border-[#1F3D2B] transition-all hover:shadow-md group space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
                <span className="font-mono text-xs font-bold text-[#171A18]">
                  {completedTrips.length}
                </span>
              </div>
              <div>
                <h4 className="font-display text-sm font-bold uppercase text-[#171A18] group-hover:text-[#1F3D2B]">
                  Travel Archive
                </h4>
                <p className="text-xs text-[#5C625E]">Past expeditions</p>
              </div>
            </Link>

            <Link
              href={ROUTES.wishlist}
              className="p-5 rounded-2xl bg-white border border-[#171A18]/10 hover:border-[#1F3D2B] transition-all hover:shadow-md group space-y-2"
            >
              <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-sm font-bold">
                ♥
              </div>
              <div>
                <h4 className="font-display text-sm font-bold uppercase text-[#171A18] group-hover:text-[#1F3D2B]">
                  Wishlist
                </h4>
                <p className="text-xs text-[#5C625E]">Curated regions</p>
              </div>
            </Link>
          </div>

          {/* Loading & Error States */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
              <span className="h-6 w-6 rounded-full border-2 border-[#1F3D2B]/30 border-t-[#1F3D2B] animate-spin" />
              <p className="font-mono text-xs uppercase tracking-widest text-[#5C625E]">
                Opening personal travel workspace...
              </p>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-8 sm:p-12 text-center max-w-xl mx-auto my-12 space-y-4">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-red-600 font-semibold block">
                WORKSPACE UNAVAILABLE
              </span>
              <h2 className="font-display text-2xl font-bold uppercase text-[#171A18]">
                We couldn&apos;t load your journeys
              </h2>
              <p className="text-sm text-[#5C625E] leading-relaxed font-normal">
                {loadError}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => fetchTrips()}
                  className="rounded-full bg-[#1F3D2B] px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#14281C] transition-colors"
                >
                  TRY AGAIN
                </button>
              </div>
            </div>
          ) : featuredTrip && featuredVisual ? (
            /* ========================================================================= */
            /* 3. FEATURED ACTIVE JOURNEY DOSSIER (Recomposed from Reference 3, 4, 5)     */
            /* ========================================================================= */
            <div className="space-y-16">
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#171A18]/10 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#E0604E] font-semibold">
                      CURRENT EXPEDITION
                    </span>
                    {featuredTrip.isSaved && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#D8E4DA] text-[#1F3D2B] font-mono text-[10px] font-bold uppercase tracking-wider border border-[#52795D]/30">
                        SAVED
                      </span>
                    )}
                  </div>
                  <JourneySummary
                    days={featuredTrip.days}
                    travelers={featuredTrip.travellers}
                    budget={featuredTrip.budget}
                  />
                </div>

                {/* Cohesive Travel Dossier Card with Side-by-Side Composition */}
                <div className="rounded-3xl bg-white border border-[#171A18]/10 shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
                  {/* Left Column: Image with Tags (7 Cols) */}
                  <div className="lg:col-span-7 relative min-h-[320px] sm:min-h-[420px] overflow-hidden bg-stone-900">
                    {featuredVisual.image ? (
                      <Image
                        src={featuredVisual.image}
                        alt={featuredTrip.destination}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className="object-cover transition-transform duration-700 hover:scale-105"
                      />
                    ) : (
                      <div className={`w-full h-full ${featuredVisual.gradient} flex items-center justify-center p-8 text-center`}>
                        <span className="font-display text-4xl font-bold uppercase tracking-wider text-white/90">
                          {featuredTrip.destination}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="rounded-full bg-black/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white backdrop-blur-md">
                        {featuredVisual.country}
                      </span>
                      <StatusIndicator status={featuredTrip.status} />
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h2 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight">
                        {featuredTrip.destination}
                      </h2>
                      {featuredTrip.origin && (
                        <p className="font-mono text-xs text-white/80 mt-1">
                          Routing: {featuredTrip.origin} ➔ {featuredTrip.destination}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Key Logistics & Direct Actions (5 Cols) */}
                  <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#1F3D2B] font-bold block">
                        ITINERARY SUMMARY
                      </span>

                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-[#171A18]/10">
                          <span className="text-[#5C625E]">Duration:</span>
                          <span className="font-bold text-[#171A18]">{featuredTrip.days} Days</span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#171A18]/10">
                          <span className="text-[#5C625E]">Travelers:</span>
                          <span className="font-bold text-[#171A18]">{featuredTrip.travellers} Persons</span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#171A18]/10">
                          <span className="text-[#5C625E]">Comfort Tier:</span>
                          <span className="font-bold uppercase text-[#1F3D2B]">{featuredTrip.budget}</span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#171A18]/10">
                          <span className="text-[#5C625E]">Coordination:</span>
                          <span className="font-bold text-[#1F3D2B]">Multi-Agent Synthesized</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#5C625E] leading-relaxed">
                        Coordinated with genuine accommodation rates, regional transit vectors, and curated activities tailored to your rhythm.
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="space-y-2 pt-2">
                      <Link
                        href={`/trips/${featuredTrip.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F3D2B] py-3.5 px-6 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#14281C] transition-colors shadow-md"
                      >
                        <span>OPEN WORKSPACE & ITINERARY →</span>
                      </Link>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleToggleSave(featuredTrip.id, Boolean(featuredTrip.isSaved))}
                          disabled={savingTripId === featuredTrip.id}
                          className="px-3 py-1.5 rounded-lg border border-[#171A18]/15 font-mono text-[11px] uppercase tracking-wider text-[#171A18] hover:bg-[#171A18]/5 transition-colors"
                        >
                          {featuredTrip.isSaved ? "★ Saved" : "☆ Save Journey"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteTrip(featuredTrip)}
                          className="px-3 py-1.5 rounded-lg border border-[#171A18]/15 font-mono text-[11px] uppercase tracking-wider text-[#C53030] hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Other Expeditions Grid (If user has multiple trips) */}
              {otherTrips.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#171A18]/10 pb-3">
                    <h3 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#171A18]">
                      Additional Expeditions ({otherTrips.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {otherTrips.map((trip) => {
                      const v = getDestinationVisual(trip.destination);
                      return (
                        <div
                          key={trip.id}
                          className="rounded-2xl bg-white border border-[#171A18]/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                        >
                          <div className="relative h-44 w-full overflow-hidden bg-stone-900">
                            {v.image ? (
                              <Image
                                src={v.image}
                                alt={trip.destination}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full ${v.gradient} flex items-center justify-center p-4 text-center`}>
                                <span className="font-display text-lg font-bold uppercase tracking-wider text-white/90">
                                  {trip.destination}
                                </span>
                              </div>
                            )}
                            <div className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-mono text-white">
                              {trip.days} Days
                            </div>
                            <div className="absolute top-2 right-2">
                              <StatusIndicator status={trip.status} />
                            </div>
                          </div>

                          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-display text-lg font-bold uppercase text-[#171A18]">
                                {trip.destination}
                              </h4>
                              <p className="text-xs text-[#5C625E]">
                                {v.country} · {trip.travellers} {trip.travellers === 1 ? "Traveler" : "Travelers"}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-[#171A18]/10 flex items-center justify-between">
                              <Link
                                href={`/trips/${trip.id}`}
                                className="font-mono text-xs font-bold text-[#1F3D2B] hover:underline"
                              >
                                View Itinerary →
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleToggleSave(trip.id, Boolean(trip.isSaved))}
                                className="text-xs text-[#5C625E] hover:text-[#171A18]"
                              >
                                {trip.isSaved ? "★" : "☆"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* STATE A: NEW USER / ZERO EXPEDITIONS — INSPIRING ONBOARDING               */
            /* ========================================================================= */
            <div className="space-y-16 py-6">
              <EmptyState
                category="START PLANNING"
                title="NO ACTIVE JOURNEYS YET"
                description="SafariX is ready to synthesize your first journey. Specify where you wish to explore, and our multi-agent architecture will construct the entire itinerary."
                actionLabel="COMMISSION YOUR FIRST EXPEDITION"
                actionHref={ROUTES.trips.new}
              />

              {/* Inspiring Destinations Recommendations (Reference 4 & 5) */}
              <div className="space-y-6 pt-6 border-t border-[#171A18]/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-widest text-[#1F3D2B] font-semibold block">
                      INSPIRATION FOR YOUR NEXT EXPEDITION
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#171A18]">
                      Popular Curated Destinations
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {QUICK_INSPIRATIONS.map((dest, i) => (
                    <Link
                      key={i}
                      href={`${ROUTES.trips.new}?destination=${encodeURIComponent(dest.name.split(",")[0])}`}
                      className="group rounded-2xl bg-white border border-[#171A18]/10 overflow-hidden shadow-sm hover:shadow-md transition-all space-y-3 p-3"
                    >
                      <div className="relative h-36 w-full rounded-xl overflow-hidden">
                        <Image
                          src={dest.image}
                          alt={dest.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="space-y-0.5 px-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#E5A83B] font-bold block">
                          {dest.tag}
                        </span>
                        <h4 className="font-display text-base font-bold uppercase text-[#171A18] group-hover:text-[#1F3D2B] transition-colors">
                          {dest.name}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {pendingDeleteTrip && (
        <DeleteJourneyModal
          destination={pendingDeleteTrip.destination}
          isOpen={Boolean(pendingDeleteTrip)}
          isDeleting={isDeleting}
          onCancel={() => setPendingDeleteTrip(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </AppShell>
  );
}
