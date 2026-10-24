"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { ROUTES } from "@/lib/constants";
import { getDestinationVisual } from "@/lib/destination-imagery";
import {
  PageHeader,
  DestinationImage,
  StatusIndicator,
  EmptyState,
} from "@/components/product";
import { useToast } from "@/components/ui/Toast";

interface SavedDestination {
  id: string;
  name: string;
  country: string;
  savedAt: string;
}

const DEFAULT_SAVED: SavedDestination[] = [
  { id: "kyoto", name: "Kyoto", country: "Japan", savedAt: "Recently saved" },
  { id: "paris", name: "Paris", country: "France", savedAt: "Recently saved" },
  { id: "goa", name: "Goa", country: "India", savedAt: "Recently saved" },
];

export default function WishlistPage() {
  const [savedItems, setSavedItems] = useState<SavedDestination[]>(DEFAULT_SAVED);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored =
          localStorage.getItem("safarix_saved_destinations") ||
          localStorage.getItem("veora_saved_destinations");
        if (stored) {
          setSavedItems(JSON.parse(stored));
        } else {
          localStorage.setItem("safarix_saved_destinations", JSON.stringify(DEFAULT_SAVED));
        }
      } catch {
        // ignore
      } finally {
        setIsLoaded(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const { toast } = useToast();

  const handleConfirmRemove = () => {
    if (!pendingRemoveId) return;
    const itemToRemove = savedItems.find((it) => it.id === pendingRemoveId);
    const next = savedItems.filter((it) => it.id !== pendingRemoveId);
    setSavedItems(next);
    try {
      localStorage.setItem("safarix_saved_destinations", JSON.stringify(next));
    } catch {
      // ignore
    }
    setPendingRemoveId(null);
    toast.info("Removed from Wishlist.", itemToRemove?.name ? `${itemToRemove.name} removed from your saved list.` : undefined);
  };

  return (
    <AppShell>
      <div className="w-full bg-[#F8F5EE] text-[#111111] min-h-[calc(100vh-5rem)] pb-24 sm:pb-36">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-12 space-y-12">
          {/* Header */}
          <PageHeader
            category="DISCOVERY"
            title="SAVED DESTINATIONS"
            subtitle="Keep track of destinations you plan to commission. Each saved location can be launched into planning with one click."
            backHref={ROUTES.dashboard}
            backLabel="RETURN TO WORKSPACE"
            action={{
              label: "PLAN A JOURNEY",
              href: ROUTES.trips.new,
            }}
          />

          {!isLoaded ? (
            <div className="py-24 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-[#111111]/40">
                Loading saved destinations...
              </span>
            </div>
          ) : savedItems.length === 0 ? (
            /* Truthful Empty State */
            <EmptyState
              category="SAVED DESTINATIONS"
              title="YOUR WISHLIST IS EMPTY"
              description="Save destinations you'd like to explore later."
              actionLabel="EXPLORE DESTINATIONS"
              actionHref={ROUTES.trips.new}
            />
          ) : (
            /* Saved Destinations Grid */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#111111]/10 pb-3">
                <span className="font-mono text-xs uppercase tracking-widest text-[#111111]/60">
                  {savedItems.length} {savedItems.length === 1 ? "SAVED DESTINATION" : "SAVED DESTINATIONS"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {savedItems.map((item) => {
                  const visual = getDestinationVisual(item.name);
                  return (
                    <div
                      key={item.id}
                      className="border border-[#111111]/10 rounded-2xl bg-white/70 overflow-hidden flex flex-col justify-between group hover:border-[#111111]/30 transition-all shadow-sm"
                    >
                      <div className="relative">
                        <Link
                          href={`${ROUTES.trips.new}?destination=${encodeURIComponent(item.name)}`}
                          aria-label={`Plan journey to ${item.name}`}
                          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B]"
                        >
                          <DestinationImage
                            src={visual.image}
                            alt={item.name}
                            destinationName={item.name}
                            country={item.country}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            aspectClassName="relative w-full h-[220px]"
                          />
                        </Link>
                        <div className="absolute top-3 right-3 pointer-events-none">
                          <StatusIndicator status="completed" customLabel="SAVED" size="sm" />
                        </div>
                      </div>

                      <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#111111] group-hover:text-[#1F3D2B] transition-colors">
                              {item.name}
                            </h3>
                            <span className="font-mono text-xs text-[#111111]/50 uppercase">
                              {item.country}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-[#111111]/10">
                          <button
                            type="button"
                            onClick={() => setPendingRemoveId(item.id)}
                            className="font-mono text-xs uppercase text-[#111111]/40 hover:text-[#DC2626] transition-colors"
                          >
                            Remove
                          </button>

                          <Link
                            href={`${ROUTES.trips.new}?destination=${encodeURIComponent(item.name)}`}
                            className="font-mono text-xs font-bold uppercase tracking-wider text-[#1F3D2B] hover:text-[#14281C] transition-colors inline-flex items-center gap-1.5"
                          >
                            <span>PLAN THIS JOURNEY</span>
                            <span>→</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Removal Confirmation Dialog */}
        {pendingRemoveId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md rounded-2xl bg-[#FAF7F0] border border-[#111111]/15 p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#DC2626] font-semibold">
                  CONFIRM REMOVAL
                </span>
                <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#111111]">
                  REMOVE FROM SAVED
                </h3>
                <p className="text-sm text-[#111111]/70 leading-relaxed font-normal">
                  Are you sure you want to remove this destination from your saved collection? You can discover and save it again anytime.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingRemoveId(null)}
                  className="rounded-full border border-[#111111]/20 bg-transparent px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#111111] hover:bg-[#111111]/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  className="rounded-full bg-[#DC2626] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#B91C1C] transition-all shadow-sm"
                >
                  Remove Destination
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
