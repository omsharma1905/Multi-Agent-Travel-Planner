"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { Trip } from "@/features/trips/types";
import { getDestinationVisual } from "@/lib/destination-imagery";
import {
  PageHeader,
  JourneySummary,
  DestinationImage,
  StatusIndicator,
  EmptyState,
  DeleteJourneyModal,
} from "@/components/product";
import { useToast } from "@/components/ui/Toast";

export default function SavedTripsPage() {
  const { user: _user } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDeleteTrip, setPendingDeleteTrip] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingTripId, setRemovingTripId] = useState<string | null>(null);

  const fetchSavedTrips = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/trips");
      if (res.ok) {
        const data: Trip[] = await res.json();
        setTrips(data.filter((t) => t.isSaved));
      } else {
        setLoadError("We couldn't load your saved collection right now. Please try again.");
      }
    } catch {
      setLoadError("We couldn't connect to SafariX travel services. Please check your connection.");
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
          if (isMounted) setTrips(data.filter((t) => t.isSaved));
        } else {
          if (isMounted) setLoadError("We couldn't load your saved collection right now. Please try again.");
        }
      } catch {
        if (isMounted) setLoadError("We couldn't connect to SafariX travel services. Please check your connection.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initLoad();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRemoveSaved = async (tripId: string) => {
    setRemovingTripId(tripId);
    try {
      const res = await fetch(`/api/trips/${tripId}/saved`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: false }),
      });

      if (res.ok) {
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
        toast.info("Journey removed from Saved Journeys.");
      } else {
        toast.error("Couldn't remove journey from Saved Journeys. Please try again.");
      }
    } catch {
      toast.error("Couldn't remove journey. Please check your connection.");
    } finally {
      setRemovingTripId(null);
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

  return (
    <AppShell>
      <div className="w-full bg-[#F8F5EE] text-[#111111] min-h-[calc(100vh-5rem)] pb-24 sm:pb-36">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-12 space-y-12">
          {/* Header */}
          <PageHeader
            category="ORGANIZATION"
            title="SAVED JOURNEYS"
            subtitle="Your curated collection of bookmarked journeys. Keep track of upcoming plans, inspiration, and cherished itineraries."
            backHref={ROUTES.dashboard}
            backLabel="RETURN TO MY JOURNEYS"
            action={{
              label: "PLAN A JOURNEY",
              href: ROUTES.trips.new,
            }}
          />

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
              <span className="h-5 w-5 rounded-full border-2 border-[#1F3D2B]/30 border-t-[#1F3D2B] animate-spin" />
              <p className="font-mono text-xs uppercase tracking-widest text-[#111111]/40">
                Opening saved collection...
              </p>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-[#DC2626]/20 bg-[#DC2626]/[0.03] p-8 sm:p-12 text-center max-w-xl mx-auto my-12 space-y-4">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#DC2626] font-semibold block">
                COLLECTION UNAVAILABLE
              </span>
              <h2 className="font-display text-2xl font-bold uppercase text-[#111111]">
                WE COULDN&apos;T LOAD YOUR SAVED JOURNEYS
              </h2>
              <p className="text-sm text-[#111111]/70 leading-relaxed font-normal">
                {loadError}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => fetchSavedTrips()}
                  className="rounded-full bg-[#111111] px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#1F3D2B] transition-colors"
                >
                  TRY AGAIN
                </button>
              </div>
            </div>
          ) : trips.length === 0 ? (
            /* Truthful Empty State */
            <EmptyState
              category="SAVED COLLECTION"
              title="NOTHING SAVED YET"
              description="Save journeys you want to revisit later."
              actionLabel="EXPLORE MY JOURNEYS"
              actionHref={ROUTES.dashboard}
            />
          ) : (
            /* Saved Journeys Catalog */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#111111]/10 pb-3">
                <span className="font-mono text-xs uppercase tracking-widest text-[#111111]/60">
                  {trips.length} {trips.length === 1 ? "JOURNEY SAVED" : "JOURNEYS SAVED"}
                </span>
              </div>

              <div className="divide-y divide-[#111111]/10">
                {trips.map((trip) => {
                  const visual = getDestinationVisual(trip.destination);
                  return (
                    <article
                      key={trip.id}
                      className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:bg-[#111111]/[0.02] px-3 sm:px-4 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 sm:gap-5">
                        <Link
                          href={`/trips/${trip.id}`}
                          aria-label={`Open journey to ${trip.destination}`}
                          className="w-20 h-14 sm:w-32 sm:h-20 rounded-lg overflow-hidden shrink-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B] group/thumb"
                        >
                          <DestinationImage
                            src={visual.image}
                            alt={trip.destination}
                            destinationName={trip.destination}
                            country={visual.country}
                            compact
                            sizes="(max-width: 640px) 80px, 128px"
                            aspectClassName="w-full h-full relative"
                          />
                        </Link>
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                            <h3 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#111111] group-hover:text-[#1F3D2B] transition-colors truncate">
                              {trip.destination}
                            </h3>
                            <span className="font-mono text-xs text-[#111111]/50 uppercase">
                              {visual.country}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#1F3D2B]/10 text-[#1F3D2B] font-mono text-[10px] font-bold uppercase tracking-wider">
                              SAVED
                            </span>
                          </div>
                          <JourneySummary
                            days={trip.days}
                            travelers={trip.travellers}
                            budget={trip.budget}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0 sm:self-center flex-wrap">
                        <StatusIndicator status={trip.status} size="sm" />
                        <button
                          type="button"
                          onClick={() => handleRemoveSaved(trip.id)}
                          disabled={removingTripId === trip.id}
                          className="font-mono text-xs font-semibold uppercase tracking-wider text-[#1F3D2B] hover:text-[#14281C] transition-colors px-3 py-1.5 rounded-lg border border-[#1F3D2B]/20 hover:bg-[#1F3D2B]/5"
                        >
                          {removingTripId === trip.id ? "REMOVING..." : "REMOVE FROM SAVED"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteTrip(trip)}
                          className="font-mono text-xs font-semibold uppercase tracking-wider text-[#DC2626] hover:text-[#b91c1c] transition-colors px-3 py-1.5 rounded-lg border border-[#DC2626]/20 hover:bg-[#DC2626]/5"
                        >
                          DELETE
                        </button>
                        <Link
                          href={`/trips/${trip.id}`}
                          className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111] hover:text-[#1F3D2B] transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>VIEW JOURNEY</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          <DeleteJourneyModal
            isOpen={Boolean(pendingDeleteTrip)}
            destination={pendingDeleteTrip?.destination || ""}
            isDeleting={isDeleting}
            onConfirm={handleConfirmDelete}
            onCancel={() => setPendingDeleteTrip(null)}
          />
        </div>
      </div>
    </AppShell>
  );
}
