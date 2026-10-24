"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { TripWithPreferences } from "@/features/trips/types";
import { OrchestrationResult } from "@/lib/orchestration/types";
import { getDestinationVisual } from "@/lib/destination-imagery";
import {
  SectionHeader,
  JourneySummary,
  DestinationImage,
  StatusIndicator,
  PrimaryAction,
  SecondaryAction,
  PlanningStatus,
  DomainPlanStatus,
} from "@/components/product";
import { useToast } from "@/components/ui/Toast";
import {
  buildGoogleMapsUrl,
  buildGoogleMapsCityUrl,
  buildGoogleMapsDirectionsUrl,
  buildFlightSearchUrl,
  buildTransitSearchUrl,
  buildHotelWebsiteUrl,
  buildPlaceWebsiteUrl,
} from "@/lib/travel/external-links";
import {
  NaturalLanguageEditBar,
  RegenerateJourneyModal,
  ChangeTransportModal,
  ChangeStayModal,
  ReplaceItemModal,
  EditChangeBanner,
  StayCandidateItem,
  AlternativeCandidateItem,
  VersionHistoryModal,
  VersionItem,
} from "@/components/trips/JourneyEditingModals";

import { EditChangeSummary } from "@/lib/orchestration/editing/schemas";

interface TripDetailPageProps {
  params: Promise<{ tripId: string }>;
}

export default function TripDetailPage({ params }: TripDetailPageProps) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.tripId;

  const { user: _user } = useAuth();
  const toast = useToast();
  const [trip, setTrip] = useState<TripWithPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [planningError, setPlanningError] = useState<string | null>(null);

  const [planningResult, setPlanningResult] = useState<OrchestrationResult | null>(null);
  const [planningStatus, setPlanningStatus] = useState<"idle" | "in_progress" | "completed" | "failed">("idle");

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [dynamicImage, setDynamicImage] = useState<string | null>(null);

  // Phase 13 — Journey Editing & Regeneration state
  const [isEditing, setIsEditing] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [changeSummary, setChangeSummary] = useState<EditChangeSummary | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showStayModal, setShowStayModal] = useState(false);
  const [stayCandidates, setStayCandidates] = useState<StayCandidateItem[]>([]);
  const [stayProviderStatus, setStayProviderStatus] = useState<"available" | "unavailable" | "partial" | undefined>(undefined);
  const [stayProviderError, setStayProviderError] = useState<string | undefined>(undefined);
  const [replaceModalConfig, setReplaceModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    itemType: "activity" | "restaurant";
    targetId: string;
    targetName: string;
  } | null>(null);
  const [itemCandidates, setItemCandidates] = useState<AlternativeCandidateItem[]>([]);
  const [selectedDayTab, setSelectedDayTab] = useState<number | "all">("all");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);


  useEffect(() => {
    let isMounted = true;

    async function loadTripDossier() {
      try {
        const res = await fetch(`/api/trips/${tripId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("This journey could not be located or belongs to another traveler.");
          }
          throw new Error("SafariX was unable to load your journey specifications. Please try again.");
        }

        const data: TripWithPreferences = await res.json();
        if (isMounted) {
          setTrip(data);
          if (data.plan && data.plan.status === "completed") {
            setPlanningResult(data.plan);
            setPlanningStatus("completed");
          } else if (data.status === "upcoming" || data.status === "completed") {
            // Fetch plan if status indicates completed/upcoming
            try {
              const planRes = await fetch(`/api/trips/${tripId}/plan`);
              if (planRes.ok) {
                const planData: OrchestrationResult = await planRes.json();
                if (planData.status === "completed") {
                  setPlanningResult(planData);
                  setPlanningStatus("completed");
                }
              }
            } catch {
              // Non-critical fallback
            }
          }

          // Dynamically fetch destination image from Pexels / provider
          try {
            const imgRes = await fetch(`/api/destinations/image?query=${encodeURIComponent(data.destination)}`);
            if (imgRes.ok) {
              const imgData = await imgRes.json();
              if (imgData.url && isMounted) {
                setDynamicImage(imgData.url);
              }
            }
          } catch {
            // Non-critical fallback to registry visual
          }
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : "Failed to load journey");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTripDossier();

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  const handleMarkCompleted = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) {
        throw new Error("Unable to update journey status.");
      }

      const updatedTrip: TripWithPreferences = await res.json();
      setTrip(updatedTrip);
      setShowCompleteConfirm(false);
      toast.success("Journey marked as completed.", "This journey is now in your Completed collection.");
    } catch (err) {
      console.error("Failed to mark journey as completed:", err);
      toast.error("Couldn't update journey status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStartPlanning = async () => {
    setPlanningStatus("in_progress");
    setPlanningError(null);
    toast.info("SafariX is planning your journey.", "Coordinating flights, stays, activities, and dining...");

    try {
      const res = await fetch(`/api/trips/${tripId}/plan?force=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const rawMessage =
          errJson.error?.message ||
          errJson.error ||
          errJson.message;
        const message =
          rawMessage && typeof rawMessage === "string" && !rawMessage.includes("ZodError") && !rawMessage.includes("ECONNREFUSED")
            ? rawMessage
            : "SafariX couldn't complete the journey plan. Your journey details are safe. Please try planning again.";
        throw new Error(message);
      }

      const planData: OrchestrationResult = await res.json();
      setPlanningResult(planData);

      if (planData.status === "completed") {
        setPlanningStatus("completed");
        setTrip((prev) =>
          prev ? { ...prev, status: "upcoming", plan: planData } : prev,
        );
        toast.success("Your journey is ready.", "The itinerary, accommodations, and transit are finalized.");
      } else {
        setPlanningStatus("failed");
        const failMsg = planData.error || "SafariX couldn't complete the journey plan. Please try planning again.";
        setPlanningError(failMsg);
        setTrip((prev) =>
          prev ? { ...prev, status: "failed", plan: planData } : prev,
        );
        toast.error("Journey planning incomplete.", failMsg);
      }
    } catch (err) {
      setPlanningStatus("failed");
      const errText = err instanceof Error ? err.message : "Planning encountered an issue.";
      setPlanningError(errText);
      toast.error("Planning couldn't be completed.", errText);
    }
  };

  // Phase 13 & 20 — Journey Editing & Regeneration Handlers
  const fetchVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/versions`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.versions)) {
        setVersions(data.versions);
      }
    } catch (err) {
      console.error("Failed to fetch journey versions:", err);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    await fetchVersions();
  };

  const handleRestoreVersion = async (versionId: string) => {
    setIsRestoringVersion(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/versions/${versionId}/restore`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          data.error?.message ||
            (typeof data.error === "string" ? data.error : null) ||
            data.message ||
            "Failed to restore version.",
        );
      }

      setPlanningResult(data.plan);
      setTrip((prev) => (prev ? { ...prev, plan: data.plan } : prev));
      toast.success(
        "Journey restored",
        `Restored to Version ${data.restoredVersion?.versionNumber || ""}.`,
      );
      await fetchVersions();
    } catch (err) {
      console.error("Failed to restore version:", err);
      const msg = err instanceof Error ? err.message : "Failed to restore version.";
      toast.error("Couldn't restore version", msg);
    } finally {
      setIsRestoringVersion(false);
    }
  };

  const handleExecuteEdit = async (payload: Record<string, unknown>) => {
    setIsEditing(true);
    setEditingMessage("SafariX is reworking your journey...");
    try {
      const res = await fetch(`/api/trips/${tripId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const errorMsg =
          data.error?.message ||
          (typeof data.error === "string" ? data.error : null) ||
          data.message ||
          (res.status === 429
            ? "Modification rate limit reached. Please wait a moment before trying again."
            : "Failed to update journey.");
        throw new Error(errorMsg);
      }

      setPlanningResult(data.plan);
      setTrip((prev) => (prev ? { ...prev, plan: data.plan } : prev));
      if (data.changeSummary) {
        setChangeSummary(data.changeSummary);
      }
      toast.success("Journey updated successfully", data.changeSummary?.description || "Changes applied.");
      // Refresh version list if history modal is open
      if (showHistoryModal) {
        fetchVersions();
      }
    } catch (err) {
      console.error("Failed to execute journey edit:", err);
      const msg = err instanceof Error ? err.message : "Failed to update journey.";
      toast.error("Couldn't update journey", msg);
    } finally {
      setIsEditing(false);
      setEditingMessage(null);
    }
  };


  const handleNaturalLanguageEdit = async (prompt: string) => {
    await handleExecuteEdit({
      scope: "natural_language",
      action: "modify_journey",
      prompt,
    });
  };

  const handleRegenerateWholeJourney = async (guidance?: string) => {
    setShowRegenerateModal(false);
    await handleExecuteEdit({
      scope: "whole_journey",
      action: "regenerate_whole",
      prompt: guidance,
    });
  };

  const handleChangeTransport = async (mode: string) => {
    setShowTransportModal(false);
    await handleExecuteEdit({
      scope: "transport",
      action: "change_transport",
      details: { transportMode: mode },
    });
  };

  const handleChangeStay = async (stayId: string) => {
    setShowStayModal(false);
    await handleExecuteEdit({
      scope: "stay",
      action: "change_stay",
      details: { stayId },
    });
  };

  const handleRegenerateDay = async (dayNumber: number) => {
    await handleExecuteEdit({
      scope: "day",
      action: "regenerate_day",
      targetDay: dayNumber,
    });
  };

  const handleReplaceItem = async (replacementId?: string) => {
    if (!replaceModalConfig) return;
    const { itemType, targetId } = replaceModalConfig;
    setReplaceModalConfig(null);

    if (itemType === "activity") {
      await handleExecuteEdit({
        scope: "activity",
        action: "replace_activity",
        targetId,
        replacementId,
      });
    } else {
      await handleExecuteEdit({
        scope: "restaurant",
        action: "replace_restaurant",
        targetId,
        replacementId,
      });
    }
  };

  const openStayModal = async () => {
    setShowStayModal(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/regenerate/alternatives?domain=stay`);
      if (res.ok) {
        const data = await res.json();
        setStayCandidates(data.stays || []);
        if (data.stayAvailability) {
          setStayProviderStatus(data.stayAvailability.status);
          setStayProviderError(data.stayAvailability.error || data.stayAvailability.reason);
        } else if (planningResult?.completeness?.outcomes?.stay === "unavailable") {
          setStayProviderStatus("unavailable");
        }
      }
    } catch {
      // Non-critical fallback
      if (planningResult?.completeness?.outcomes?.stay === "unavailable") {
        setStayProviderStatus("unavailable");
      }
    }
  };

  const openReplaceModal = async (
    itemType: "activity" | "restaurant",
    targetId: string,
    targetName: string,
  ) => {
    setReplaceModalConfig({
      isOpen: true,
      title: itemType === "activity" ? "REPLACE PLACE / ACTIVITY" : "REPLACE RESTAURANT",
      itemType,
      targetId,
      targetName,
    });

    try {
      const res = await fetch(`/api/trips/${tripId}/regenerate/alternatives?domain=${itemType}`);
      if (res.ok) {
        const data = await res.json();
        const raw = itemType === "activity" ? data.places : data.restaurants;
        const unselected = (raw || []).filter((item: { isSelected?: boolean }) => !item.isSelected);
        setItemCandidates(unselected);
      }
    } catch {
      setItemCandidates([]);
    }
  };

  const visual = trip ? getDestinationVisual(trip.destination) : null;

  // Build domain plan status for the multi-agent planning workspace
  const domainStatuses: DomainPlanStatus = {
    transportation:
      planningStatus === "in_progress"
        ? "in_progress"
        : planningResult?.transportation
        ? "found"
        : !trip?.origin || !trip.origin.trim() || planningResult?.completeness?.outcomes?.transportation === "optional"
        ? planningResult?.itinerary
          ? "independent"
          : "waiting"
        : planningResult?.completeness?.outcomes?.transportation === "unavailable"
        ? "unavailable"
        : planningResult?.completeness?.outcomes?.transportation === "no_results"
        ? "no_results"
        : planningResult?.itinerary
        ? "independent"
        : "waiting",
    stays:
      planningStatus === "in_progress"
        ? "in_progress"
        : planningResult?.stay
        ? "found"
        : planningResult?.completeness?.outcomes?.stay === "unavailable"
        ? "unavailable"
        : planningResult?.completeness?.outcomes?.stay === "no_results"
        ? "no_results"
        : planningResult
        ? "unavailable"
        : "waiting",
    experiences:
      planningStatus === "in_progress"
        ? "in_progress"
        : planningResult?.activities
        ? "found"
        : planningResult?.completeness?.outcomes?.activities === "unavailable"
        ? "unavailable"
        : planningResult?.completeness?.outcomes?.activities === "no_results"
        ? "no_results"
        : planningResult
        ? "unavailable"
        : "waiting",
    food:
      planningStatus === "in_progress"
        ? "in_progress"
        : planningResult?.food
        ? "found"
        : planningResult?.completeness?.outcomes?.food === "unavailable"
        ? "unavailable"
        : planningResult?.completeness?.outcomes?.food === "no_results"
        ? "no_results"
        : planningResult
        ? "unavailable"
        : "waiting",
    budget:
      planningStatus === "in_progress"
        ? "in_progress"
        : planningResult?.budget
        ? "calculated"
        : planningResult
        ? "unavailable"
        : "waiting",
    itinerary:
      planningStatus === "in_progress"
        ? "in_progress"
        : planningResult?.completeness?.isComplete === false
        ? "failed"
        : planningResult?.itinerary
        ? "generated"
        : "waiting",
  };

  return (
    <AppShell>
      <div className="w-full bg-[#F8F5EE] text-[#111111] min-h-[calc(100vh-5rem)] pb-24 sm:pb-36">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-8 sm:py-12 space-y-12">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between border-b border-[#111111]/10 pb-4">
            <Link
              href={ROUTES.dashboard}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#111111]/60 hover:text-[#111111] transition-colors group"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              <span>BACK TO WORKSPACE</span>
            </Link>
            {trip && (
              <span className="font-mono text-xs uppercase tracking-widest text-[#111111]/40">
                JOURNEY #{trip.id.slice(0, 8)}
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-28 flex flex-col items-center justify-center gap-3 text-center">
              <span className="h-5 w-5 rounded-full border-2 border-[#1F3D2B]/30 border-t-[#1F3D2B] animate-spin" />
              <p className="font-mono text-xs uppercase tracking-widest text-[#111111]/40">
                Opening journey workspace...
              </p>
            </div>
          ) : !trip || !visual ? (
            <div className="max-w-xl mx-auto text-center py-16 space-y-4">
              <h2 className="font-display text-2xl font-bold uppercase text-[#111111]">
                JOURNEY NOT FOUND
              </h2>
              <p className="text-sm text-[#111111]/70">
                {loadError ?? "This journey could not be located or belongs to another traveler."}
              </p>
              <div className="pt-2">
                <Link
                  href={ROUTES.dashboard}
                  className="font-mono text-xs font-bold uppercase tracking-wider text-[#1F3D2B] hover:underline"
                >
                  Return to workspace →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-14">
              {planningError && (
                <div
                  role="alert"
                  className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-xs text-red-600 font-mono flex items-center justify-between"
                >
                  <span>{planningError}</span>
                  <button
                    type="button"
                    onClick={() => setPlanningError(null)}
                    className="text-red-500 hover:text-red-700 font-bold ml-4"
                    aria-label="Dismiss alert"
                  >
                    ✕
                  </button>
                </div>
              )}
              {/* ========================================================================= */}
              {/* 1. TOP SECTION: DESTINATION HIERARCHY + IMAGE + STATUS                    */}
              {/* ========================================================================= */}
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#F06C5B] font-semibold block mb-1">
                      DESTINATION
                    </span>
                    <h1 className="font-display text-4xl sm:text-6xl font-bold uppercase tracking-tight text-[#111111]">
                      {trip.destination}
                    </h1>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    <JourneySummary
                      days={trip.days}
                      travelers={trip.travellers}
                      budget={trip.budget}
                    />
                    <StatusIndicator status={trip.status} />
                  </div>
                </div>

                {/* Verified Destination Imagery (Dynamic Provider with Fallback) */}
                <div className="relative group">
                  <DestinationImage
                    src={dynamicImage || visual.image}
                    alt={`${trip.destination} travel destination`}
                    destinationName={trip.destination}
                    country={visual.country}
                    priority
                    aspectClassName="relative w-full h-[320px] sm:h-[460px] lg:h-[500px]"
                  />

                  {/* Overlay CTA */}
                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-8 flex items-end justify-between pointer-events-none">
                    <div className="text-white font-mono text-xs uppercase tracking-wider hidden sm:block">
                      <span>{visual.country}</span>
                    </div>
                    <div className="pointer-events-auto ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                      {trip.status !== "completed" && (
                        <SecondaryAction
                          label="MARK AS COMPLETED"
                          onClick={() => setShowCompleteConfirm(true)}
                          className="!border-white/30 !text-white hover:!bg-white/10 !px-3.5 sm:!px-6 !py-1.5 sm:!py-3.5 !text-[11px] sm:!text-xs"
                        />
                      )}
                      {planningStatus === "completed" && (
                        <>
                          <SecondaryAction
                            label="VERSION HISTORY ⏱"
                            onClick={handleOpenHistory}
                            disabled={isEditing}
                            className="!border-white/30 !text-white hover:!bg-white/10 !px-3.5 sm:!px-6 !py-1.5 sm:!py-3.5 !text-[11px] sm:!text-xs"
                          />
                          <SecondaryAction
                            label="REGENERATE JOURNEY ↺"
                            onClick={() => setShowRegenerateModal(true)}
                            disabled={isEditing}
                            className="!border-white/30 !text-white hover:!bg-white/10 !px-3.5 sm:!px-6 !py-1.5 sm:!py-3.5 !text-[11px] sm:!text-xs"
                          />
                        </>
                      )}

                      <PrimaryAction
                        label={
                          planningStatus === "completed"
                            ? "RE-ORCHESTRATE"
                            : planningStatus === "failed"
                            ? "RETRY PLANNING"
                            : "START AI PLANNING"
                        }
                        onClick={handleStartPlanning}
                        loading={planningStatus === "in_progress"}
                        className="!px-3.5 sm:!px-6 !py-1.5 sm:!py-3.5 !text-[11px] sm:!text-xs"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Phase 13: Change Summary Preview Banner */}
              {changeSummary && (
                <EditChangeBanner
                  changeSummary={changeSummary}
                  onDismiss={() => setChangeSummary(null)}
                />
              )}

              {/* Phase 13: Live Reworking / Editing Status Bar */}
              {isEditing && (
                <div
                  role="status"
                  className="rounded-2xl border border-[#1F3D2B]/30 bg-[#1F3D2B]/5 p-5 flex items-center gap-3 font-mono text-xs text-[#1F3D2B] animate-pulse"
                >
                  <span className="h-4 w-4 rounded-full border-2 border-[#1F3D2B]/30 border-t-[#1F3D2B] animate-spin shrink-0" />
                  <span className="font-semibold">{editingMessage || "SafariX is reworking your journey..."}</span>
                  <span className="text-[#1F3D2B]/60 hidden sm:inline ml-auto">
                    Re-verifying with deterministic validator
                  </span>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 2. CONCISE PLANNING STATUS WORKSPACE                                      */}
              {/* ========================================================================= */}
              <PlanningStatus
                statuses={domainStatuses}
                isPlanning={planningStatus === "in_progress"}
                onStartPlanning={handleStartPlanning}
              />

              {/* Phase 13: Natural Language Journey Modification Bar */}
              {planningStatus === "completed" && (
                <NaturalLanguageEditBar
                  onApplyPrompt={handleNaturalLanguageEdit}
                  isLoading={isEditing}
                  disabled={isEditing}
                />
              )}

              {/* ========================================================================= */}
              {/* 3. FINANCIAL SYNTHESIS (REAL DATA IF COMPUTED, TRUTHFUL SUMMARY)           */}
              {/* ========================================================================= */}
              {planningResult?.budget && (
                <section className="border border-[#111111]/10 rounded-2xl bg-white/60 p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#111111]/10 pb-4">
                    <div>
                      <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#2A9D8F] font-semibold">
                        ESTIMATED TOTAL
                      </span>
                      <h3 className="font-display text-3xl sm:text-4xl font-bold text-[#111111] mt-1">
                        {planningResult.budget.currencySymbol || "$"}
                        {planningResult.budget.totalEstimatedCost.toLocaleString()}{" "}
                        <span className="font-mono text-xs text-[#111111]/50 font-normal">
                          {planningResult.budget.currency}
                        </span>
                      </h3>
                    </div>
                    <StatusIndicator
                      status={
                        planningResult.budget.budgetStatus === "within_budget"
                          ? "completed"
                          : "planning"
                      }
                      customLabel={planningResult.budget.budgetStatus.replace("_", " ")}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-[#111111]/50 uppercase tracking-wider block mb-1">
                        ACCOMMODATIONS
                      </span>
                      <span className="font-bold text-[#111111] text-base">
                        {planningResult.budget.currencySymbol || "$"}
                        {planningResult.budget.accommodationCost.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#111111]/50 uppercase tracking-wider block mb-1">
                        TRANSIT
                      </span>
                      <span className="font-bold text-[#111111] text-base">
                        {planningResult.budget.transportationCost > 0 ? (
                          `${planningResult.budget.currencySymbol || "$"}${planningResult.budget.transportationCost.toLocaleString()}`
                        ) : trip?.origin ? (
                          <span className="text-xs font-semibold text-[#1F3D2B]">Live Fares on Carrier</span>
                        ) : (
                          `${planningResult.budget.currencySymbol || "$"}0`
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#111111]/50 uppercase tracking-wider block mb-1">
                        ACTIVITIES & ADMISSION
                      </span>
                      <span className="font-bold text-[#111111] text-base">
                        {planningResult.budget.currencySymbol || "$"}
                        {planningResult.budget.activityFeesEstimate.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#111111]/50 uppercase tracking-wider block mb-1">
                        FOOD ESTIMATE
                      </span>
                      <span className="font-bold text-[#111111] text-base">
                        {planningResult.budget.currencySymbol || "$"}
                        {planningResult.budget.dailyFoodEstimate.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Trust & Limitations Notice */}
                  <div className="pt-3 border-t border-[#111111]/8 flex items-start gap-2.5 text-xs text-[#111111]/65 leading-relaxed font-normal">
                    <span className="text-[#2A9D8F] font-bold text-sm shrink-0" aria-hidden="true">ℹ</span>
                    <p>
                      <strong>Planning Estimate:</strong> Calculated from verified provider rates and historical averages for {trip.days} days and {trip.travellers} {trip.travellers === 1 ? "traveler" : "travelers"}. Official provider prices, taxes, and availability may vary. SafariX does not process payments or issue tickets directly.
                    </p>
                  </div>
                </section>
              )}

              {/* ========================================================================= */}
              {/* 4. FIVE STRUCTURED PLANNING SECTIONS (TRUTHFUL DATA / TRUTHFUL EMPTY)     */}
              {/* ========================================================================= */}
              <div className="space-y-12">
                {/* 01 GETTING THERE */}
                <section className="space-y-4">
                  <SectionHeader
                    number="01"
                    title="GETTING THERE"
                    badge={
                      <div className="flex flex-wrap items-center gap-2.5">
                        <StatusIndicator
                          status={
                            planningResult?.transportation
                              ? "completed"
                              : !trip?.origin || !trip.origin.trim()
                              ? "completed"
                              : planningResult?.itinerary
                              ? "completed"
                              : "waiting"
                          }
                          customLabel={
                            planningResult?.transportation
                              ? "TRANSPORT SELECTED"
                              : !trip?.origin || !trip.origin.trim()
                              ? "LOCAL & REGIONAL TRANSIT"
                              : planningResult?.itinerary
                              ? "EXTERNAL ROUTE SEARCH"
                              : "WAITING FOR TRANSPORTATION"
                          }
                        />
                        {planningStatus === "completed" && (
                          <button
                            type="button"
                            onClick={() => setShowTransportModal(true)}
                            disabled={isEditing}
                            className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg border border-[#111111]/20 bg-white/80 hover:bg-[#111111] hover:text-white transition-all disabled:opacity-40"
                          >
                            CHANGE TRANSPORT ↺
                          </button>
                        )}
                      </div>
                    }
                    description="Inbound, outbound, and regional transit connections."
                  />

                  {planningResult?.transportation ? (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/70 p-6 space-y-5">
                      {/* Fallback explanation when preferred mode was unavailable */}
                      {planningResult.transportation.preferredModeUnavailable && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-xs text-amber-900">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono font-bold uppercase tracking-wider text-amber-800">
                              PREFERRED MODE UNAVAILABLE
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
                              <span className="bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                                Preferred: <strong className="text-amber-950">{planningResult.transportation.preference}</strong>
                              </span>
                              <span>→</span>
                              <span className="bg-amber-600 text-white px-2 py-0.5 rounded font-bold">
                                Selected: {planningResult.transportation.mode}
                              </span>
                            </div>
                          </div>
                          <p className="text-amber-800/90 leading-relaxed">
                            {planningResult.transportation.fallbackReason ||
                              `Your preferred transportation mode (${planningResult.transportation.preference}) was not available for this route. SafariX evaluated practical alternatives and selected the optimal connection.`}
                          </p>
                        </div>
                      )}

                      {/* Route Header and Provider */}
                      {(() => {
                        const originLocation = trip?.origin || planningResult.transportation.selectedOption?.origin || "Origin";
                        const destLocation = trip?.destination || planningResult.transportation.selectedOption?.destination || "Destination";
                        const originMapUrl = buildGoogleMapsCityUrl(originLocation);
                        const destMapUrl = buildGoogleMapsCityUrl(destLocation);
                        const directionsMapUrl = buildGoogleMapsDirectionsUrl({
                          origin: originLocation,
                          destination: destLocation,
                          travelMode: planningResult.transportation.mode === "train" ? "transit" : planningResult.transportation.mode === "car" ? "driving" : undefined,
                        });

                        return (
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#111111]/8 pb-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1F3D2B] bg-[#1F3D2B]/10 px-2 py-0.5 rounded">
                                  {planningResult.transportation.mode.toUpperCase()}
                                </span>
                                {planningResult.transportation.selectedOption?.provider && (
                                  <span className="font-mono text-xs uppercase tracking-wider font-semibold text-[#111111]">
                                    {planningResult.transportation.selectedOption.provider}
                                  </span>
                                )}
                                <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/40 bg-[#111111]/5 px-1.5 py-0.5 rounded">
                                  ESTIMATED
                                </span>
                              </div>
                              <h4 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#111111] flex flex-wrap items-center gap-2">
                                <span>{originLocation}</span>
                                {originMapUrl && (
                                  <a
                                    href={originMapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-[11px] font-normal lowercase tracking-normal text-[#1F3D2B] hover:underline"
                                    title={`View ${originLocation} on Google Maps`}
                                  >
                                    [map ↗]
                                  </a>
                                )}
                                <span>→</span>
                                <span>{destLocation}</span>
                                {destMapUrl && (
                                  <a
                                    href={destMapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-[11px] font-normal lowercase tracking-normal text-[#1F3D2B] hover:underline"
                                    title={`View ${destLocation} on Google Maps`}
                                  >
                                    [map ↗]
                                  </a>
                                )}
                              </h4>
                              {directionsMapUrl && (
                                <div className="pt-0.5">
                                  <a
                                    href={directionsMapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-[11px] text-[#1F3D2B] hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>View Directions on Google Maps</span>
                                    <span aria-hidden="true">↗</span>
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Transit Stats: Duration and Cost */}
                            <div className="flex items-center gap-4 sm:text-right">
                              {Boolean(planningResult.transportation.durationMinutes || planningResult.transportation.selectedOption?.durationMinutes) ? (
                                <div>
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block">
                                    DURATION
                                  </span>
                                  <span className="font-mono text-sm font-bold text-[#111111]">
                                    Approx. {Math.floor((planningResult.transportation.durationMinutes || planningResult.transportation.selectedOption?.durationMinutes || 0) / 60)}h {(planningResult.transportation.durationMinutes || planningResult.transportation.selectedOption?.durationMinutes || 0) % 60}m
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block">
                                    SCHEDULE & DURATION
                                  </span>
                                  <span className="font-mono text-xs font-semibold text-[#111111]/70 block">
                                    Varies by carrier
                                  </span>
                                </div>
                              )}
                              {(typeof planningResult.transportation.selectedOption?.price === "number" && planningResult.transportation.selectedOption.price > 0) || (typeof planningResult.transportation.estimatedCost === "number" && planningResult.transportation.estimatedCost > 0) ? (
                                <div>
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block">
                                    ESTIMATED COST
                                  </span>
                                  <span className="font-mono text-sm font-bold text-[#1F3D2B]">
                                    ${((planningResult.transportation.estimatedCost ?? planningResult.transportation.selectedOption?.price ?? 0)).toLocaleString()} / traveler
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block">
                                    FARE
                                  </span>
                                  <span className="font-mono text-xs font-semibold text-[#1F3D2B] block">
                                    Live Fares on Carrier
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Reasoning */}
                      <div className="space-y-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block">
                          WHY SAFARIX CHOSE THIS
                        </span>
                        <p className="text-sm text-[#111111]/85 leading-relaxed font-normal">
                          {planningResult.transportation.reasoning}
                        </p>
                      </div>

                      {/* Trade-off Considerations */}
                      {planningResult.transportation.tradeoffs.length > 0 && (
                        <div className="pt-2 border-t border-[#111111]/8">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block mb-1">
                            TRADE-OFF CONSIDERATIONS
                          </span>
                          <ul className="list-disc list-inside text-xs text-[#111111]/70 space-y-1">
                            {planningResult.transportation.tradeoffs.map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Alternatives Evaluated */}
                      {planningResult.transportation.alternativeOptionIds.length > 0 && (
                        <div className="pt-2 text-[11px] font-mono text-[#111111]/50">
                          {planningResult.transportation.alternativeOptionIds.length} candidate alternatives evaluated across cost, duration, and comfort metrics.
                        </div>
                      )}

                      {/* Action Bar: Outbound live search / booking */}
                      <div className="pt-3 border-t border-[#111111]/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block">
                            {planningResult.transportation.mode === "train"
                              ? "EXTERNAL RAIL SEARCH"
                              : planningResult.transportation.mode === "car"
                              ? "ROAD TRANSIT & DIRECTIONS"
                              : "EXTERNAL CARRIER SEARCH"}
                          </span>
                          <span className="text-xs text-[#111111]/60">
                            {planningResult.transportation.mode === "train"
                              ? "Real-time train schedules and platform bookings handled on official transit provider sites."
                              : planningResult.transportation.mode === "car"
                              ? "Direct driving navigation, live road traffic, and route geometry via Google Maps."
                              : "Real-time airline seat pricing and live booking handled externally on provider sites."}
                          </span>
                        </div>
                        {planningResult.transportation.mode === "train" ? (
                          <a
                            href={buildTransitSearchUrl({
                              origin: trip?.origin || planningResult.transportation.selectedOption?.origin || "Origin",
                              destination: trip?.destination || planningResult.transportation.selectedOption?.destination || "Destination",
                              mode: "train",
                              bookingUrl: (planningResult.transportation.selectedOption as { bookingUrl?: string } | undefined)?.bookingUrl,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111111] text-white hover:bg-[#111111]/85 text-xs font-mono font-medium transition-colors shrink-0"
                          >
                            Search Live Trains ↗
                          </a>
                        ) : planningResult.transportation.mode === "car" ? (
                          <a
                            href={buildGoogleMapsDirectionsUrl({
                              origin: trip?.origin || planningResult.transportation.selectedOption?.origin || "Origin",
                              destination: trip?.destination || planningResult.transportation.selectedOption?.destination || "Destination",
                              travelMode: "driving",
                            }) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111111] text-white hover:bg-[#111111]/85 text-xs font-mono font-medium transition-colors shrink-0"
                          >
                            View Driving Route ↗
                          </a>
                        ) : (
                          <a
                            href={buildFlightSearchUrl({
                              origin: trip?.origin || planningResult.transportation.selectedOption?.origin || "Origin",
                              destination: trip?.destination || planningResult.transportation.selectedOption?.destination || "Destination",
                              travelers: trip?.travellers || 1,
                              bookingUrl: (planningResult.transportation.selectedOption as { bookingUrl?: string } | undefined)?.bookingUrl,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111111] text-white hover:bg-[#111111]/85 text-xs font-mono font-medium transition-colors shrink-0"
                          >
                            Search Flights on Google Flights ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ) : trip?.preferences?.transportPreference === "train" ? (
                    <div className="border border-amber-500/30 rounded-xl bg-amber-500/10 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 flex-wrap gap-2">
                        <span className="font-mono text-xs uppercase tracking-wider font-bold text-amber-900 bg-amber-500/20 px-2 py-0.5 rounded">
                          TRAIN // NO LIVE TRAIN OPTIONS AVAILABLE
                        </span>
                        {trip?.origin && trip?.destination && (
                          <a
                            href={buildGoogleMapsDirectionsUrl({
                              origin: trip.origin,
                              destination: trip.destination,
                              travelMode: "transit",
                            }) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-amber-950 underline hover:text-amber-800"
                          >
                            Check Transit on Google Maps ↗
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-amber-900/90 leading-relaxed font-normal">
                        You requested <strong>train</strong> transport, but no direct or practical train schedules were found between {trip?.origin || "your origin"} and {trip?.destination || "destination"}. SafariX does not silently substitute a flight when train is explicitly chosen.
                      </p>
                      {trip?.origin && (
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <a
                            href={buildGoogleMapsDirectionsUrl({
                              origin: trip.origin,
                              destination: trip.destination,
                              travelMode: "transit",
                            }) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111111] text-white hover:bg-[#111111]/85 text-xs font-mono font-medium transition-colors"
                          >
                            Search Rail Directions ↗
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (!trip?.origin || !trip.origin.trim()) ? (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/70 p-6 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#111111]/8 pb-3">
                        <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#2A9D8F]">
                          LOCAL & REGIONAL TRANSIT
                        </span>
                      </div>
                      <p className="text-sm text-[#111111]/80 leading-relaxed font-normal">
                        No intercity long-distance transit was required or specified from an origin hub. Local transport and on-demand transfers are coordinated on arrival per your daily schedule.
                      </p>
                    </div>
                  ) : planningResult?.itinerary ? (
                    <div className="border border-amber-500/30 rounded-xl bg-amber-500/10 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 flex-wrap gap-2">
                        <span className="font-mono text-xs uppercase tracking-wider font-bold text-amber-900 bg-amber-500/20 px-2 py-0.5 rounded">
                          INTERCITY TRANSIT // EXTERNAL ROUTE SEARCH
                        </span>
                      </div>
                      <p className="text-sm text-amber-900/90 leading-relaxed font-normal">
                        Direct scheduled transit data from {trip.origin} to {trip.destination} could not be confirmed automatically. You can view direct flight queries or road/transit directions using the live providers below:
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <a
                          href={buildFlightSearchUrl({
                            origin: trip.origin,
                            destination: trip.destination,
                            travelers: trip.travellers || 1,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111111] text-white hover:bg-[#111111]/85 text-xs font-mono font-medium transition-colors"
                        >
                          Search Flights on Google Flights ↗
                        </a>
                        <a
                          href={buildGoogleMapsDirectionsUrl({
                            origin: trip.origin,
                            destination: trip.destination,
                            travelMode: "transit",
                          }) || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#111111]/20 bg-white hover:bg-[#111111]/5 text-[#111111] text-xs font-mono font-medium transition-colors"
                        >
                          Check Transit Directions on Google Maps ↗
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/30 p-6 text-sm text-[#111111]/70">
                      SafariX will compare available flights, trains, and transfers once planning is initiated.
                    </div>
                  )}
                </section>

                {/* 02 WHERE YOU'LL STAY */}
                <section className="space-y-4">
                  <SectionHeader
                    number="02"
                    title="WHERE YOU'LL STAY"
                    badge={
                      <div className="flex flex-wrap items-center gap-2.5">
                        <StatusIndicator
                          status={
                            planningResult?.stay
                              ? "completed"
                              : domainStatuses.stays === "unavailable"
                              ? "unavailable"
                              : domainStatuses.stays === "no_results"
                              ? "no_results"
                              : "waiting"
                          }
                          customLabel={
                            planningResult?.stay
                              ? "ACCOMMODATIONS CURATED"
                              : domainStatuses.stays === "unavailable"
                              ? "ACCOMMODATION PROVIDER UNAVAILABLE"
                              : domainStatuses.stays === "no_results"
                              ? "NO ACCOMMODATIONS FOUND"
                              : "WAITING FOR ACCOMMODATIONS"
                          }
                        />
                        {planningStatus === "completed" && (
                          <button
                            type="button"
                            onClick={openStayModal}
                            disabled={isEditing}
                            className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg border border-[#111111]/20 bg-white/80 hover:bg-[#111111] hover:text-white transition-all disabled:opacity-40"
                          >
                            CHANGE STAY ↺
                          </button>
                        )}
                      </div>
                    }
                    description="Curated properties matching your chosen comfort tier."
                  />

                  {planningResult?.stay ? (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/70 p-6 space-y-4">
                      {planningResult.selectedStayDetails ? (
                        <>
                          {/* Stay Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#111111]/8 pb-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#1F3D2B] bg-[#1F3D2B]/10 px-2 py-0.5 rounded">
                                  {planningResult.selectedStayDetails.category.toUpperCase()}
                                </span>
                                {planningResult.selectedStayDetails.comfortLevel && (
                                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#2A9D8F] bg-[#2A9D8F]/10 px-2 py-0.5 rounded border border-[#2A9D8F]/20">
                                    {planningResult.selectedStayDetails.comfortLevel.toUpperCase()}
                                  </span>
                                )}
                                {planningResult.selectedStayDetails.priceType === "free" || planningResult.selectedStayDetails.pricePerNight === 0 ? (
                                  <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                    COMPLIMENTARY
                                  </span>
                                ) : planningResult.selectedStayDetails.isPriceEstimate ? (
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/40 bg-[#111111]/5 px-1.5 py-0.5 rounded">
                                    ESTIMATED
                                  </span>
                                ) : (
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    VERIFIED
                                  </span>
                                )}
                                {planningResult.selectedStayDetails.availability === "limited" && (
                                  <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    LIMITED INVENTORY
                                  </span>
                                )}
                              </div>
                              <h4 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#111111]">
                                {planningResult.selectedStayDetails.name}
                              </h4>
                              <p className="text-xs text-[#111111]/60">
                                {planningResult.selectedStayDetails.address}
                                {planningResult.selectedStayDetails.roomType && ` · ${planningResult.selectedStayDetails.roomType}`}
                              </p>
                            </div>

                            {/* Stay Pricing & Rating Stats */}
                            <div className="flex items-center gap-4 sm:text-right shrink-0">
                              {planningResult.selectedStayDetails.rating > 0 && (
                                <div>
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block">
                                    RATING
                                  </span>
                                  <span className="font-mono text-sm font-bold text-[#111111]">
                                    ★ {planningResult.selectedStayDetails.rating.toFixed(1)}
                                    <span className="text-xs font-normal text-[#111111]/50 ml-1">
                                      ({planningResult.selectedStayDetails.reviewCount.toLocaleString()})
                                    </span>
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block">
                                  NIGHTLY RATE
                                </span>
                                <span className="font-mono text-sm font-bold text-[#1F3D2B]">
                                  {planningResult.selectedStayDetails.priceType === "free" || planningResult.selectedStayDetails.pricePerNight === 0 ? (
                                    "Free"
                                  ) : planningResult.selectedStayDetails.pricePerNight !== null ? (
                                    `$${planningResult.selectedStayDetails.pricePerNight.toLocaleString()} / night`
                                  ) : (
                                    "Rate on Request"
                                  )}
                                </span>
                                {planningResult.selectedStayDetails.pricePerNight !== null && planningResult.selectedStayDetails.pricePerNight > 0 && (
                                  <span className="font-mono text-[10px] text-[#111111]/50 block">
                                    ~${(planningResult.selectedStayDetails.pricePerNight * Math.max(1, (trip?.days || 2) - 1)).toLocaleString()} total ({Math.max(1, (trip?.days || 2) - 1)} {Math.max(1, (trip?.days || 2) - 1) === 1 ? "night" : "nights"})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Amenities Pills & Check-in Details */}
                          {planningResult.selectedStayDetails.amenities && planningResult.selectedStayDetails.amenities.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {planningResult.selectedStayDetails.amenities.map((amenity, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-[#111111]/5 font-mono text-[10px] uppercase font-semibold text-[#111111]/70"
                                >
                                  {amenity}
                                </span>
                              ))}
                              {(planningResult.selectedStayDetails.checkIn || planningResult.selectedStayDetails.checkOut) && (
                                <span className="text-[11px] font-mono text-[#111111]/50 ml-2">
                                  Check-in {planningResult.selectedStayDetails.checkIn} · Check-out {planningResult.selectedStayDetails.checkOut}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Primary Stay Action Links */}
                          <div className="flex items-center gap-3 pt-2 flex-wrap">
                            {buildGoogleMapsUrl({
                              latitude: planningResult.selectedStayDetails.latitude,
                              longitude: planningResult.selectedStayDetails.longitude,
                              label: planningResult.selectedStayDetails.name,
                              address: planningResult.selectedStayDetails.address,
                              placeId: (planningResult.selectedStayDetails as { googlePlaceId?: string }).googlePlaceId || planningResult.selectedStayDetails.source?.providerId,
                              googlePlaceId: (planningResult.selectedStayDetails as { googlePlaceId?: string }).googlePlaceId,
                              googleMapsUri: (planningResult.selectedStayDetails as { googleMapsUri?: string }).googleMapsUri,
                            }) && (
                              <a
                                href={buildGoogleMapsUrl({
                                  latitude: planningResult.selectedStayDetails.latitude,
                                  longitude: planningResult.selectedStayDetails.longitude,
                                  label: planningResult.selectedStayDetails.name,
                                  address: planningResult.selectedStayDetails.address,
                                  placeId: (planningResult.selectedStayDetails as { googlePlaceId?: string }).googlePlaceId || planningResult.selectedStayDetails.source?.providerId,
                                  googlePlaceId: (planningResult.selectedStayDetails as { googlePlaceId?: string }).googlePlaceId,
                                  googleMapsUri: (planningResult.selectedStayDetails as { googleMapsUri?: string }).googleMapsUri,
                                })!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#111111]/15 hover:border-[#111111]/30 bg-white text-[#111111] text-xs font-mono font-medium transition-colors"
                              >
                                View on Google Maps ↗
                              </a>
                            )}

                            {planningResult.selectedStayDetails.website ? (
                              <a
                                href={planningResult.selectedStayDetails.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] text-white hover:bg-[#111111]/85 text-xs font-mono font-medium transition-colors"
                              >
                                Official Website ↗
                              </a>
                            ) : planningResult.selectedStayDetails.bookingUrl ? (
                              <a
                                href={planningResult.selectedStayDetails.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] text-white hover:bg-[#111111]/85 text-xs font-mono font-medium transition-colors"
                              >
                                Search on Google Hotels ↗
                              </a>
                            ) : (
                              <span className="text-xs font-mono text-[#111111]/45 italic py-1">
                                Website unavailable
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#111111]/8 pb-3">
                          <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#1F3D2B]">
                            RECOMMENDED PROPERTY // #{planningResult.stay.recommendedStayId}
                          </span>
                          {planningResult.stay.alternativeStayIds.length > 0 && (
                            <span className="font-mono text-xs text-[#111111]/50">
                              {planningResult.stay.alternativeStayIds.length} alternatives evaluated
                            </span>
                          )}
                        </div>
                      )}

                      {/* Reasoning */}
                      <div className="space-y-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block">
                          WHY SAFARIX CHOSE THIS
                        </span>
                        <p className="text-sm text-[#111111]/85 leading-relaxed font-normal">
                          {planningResult.stay.reasoning}
                        </p>
                      </div>

                      {/* Trade-off Considerations */}
                      {planningResult.stay.tradeoffs.length > 0 && (
                        <div className="pt-2 border-t border-[#111111]/8">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block mb-1">
                            PROPERTY HIGHLIGHTS & TRADE-OFFS
                          </span>
                          <ul className="list-disc list-inside text-xs text-[#111111]/70 space-y-1">
                            {planningResult.stay.tradeoffs.map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Accommodation Alternatives */}
                      <div className="pt-4 border-t border-[#111111]/8 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/50 block">
                            ADDITIONAL ACCOMMODATION OPTIONS ({planningResult.stayAlternativesDetails?.length || 0})
                          </span>
                        </div>

                        {planningResult.stayAlternativesDetails && planningResult.stayAlternativesDetails.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {planningResult.stayAlternativesDetails.map((alt, altIdx) => {
                              const mapsUrl = buildGoogleMapsUrl({
                                latitude: alt.latitude,
                                longitude: alt.longitude,
                                label: alt.name,
                                address: alt.address,
                                placeId: (alt as { googlePlaceId?: string }).googlePlaceId || alt.source?.providerId,
                                googlePlaceId: (alt as { googlePlaceId?: string }).googlePlaceId,
                                googleMapsUri: (alt as { googleMapsUri?: string }).googleMapsUri,
                              });
                              const websiteUrl = buildHotelWebsiteUrl(alt);

                              return (
                                <div
                                  key={alt.id || altIdx}
                                  className="border border-[#111111]/10 rounded-xl bg-white/50 p-4 space-y-2 hover:border-[#111111]/25 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono text-[9px] uppercase tracking-wider font-semibold text-[#1F3D2B] bg-[#1F3D2B]/10 px-1.5 py-0.5 rounded">
                                          ALTERNATIVE {altIdx + 1}
                                        </span>
                                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#111111]/60 bg-[#111111]/5 px-1.5 py-0.5 rounded">
                                          {alt.category}
                                        </span>
                                        {alt.comfortLevel && (
                                          <span className="font-mono text-[9px] uppercase tracking-wider text-[#2A9D8F] bg-[#2A9D8F]/10 px-1.5 py-0.5 rounded">
                                            {alt.comfortLevel}
                                          </span>
                                        )}
                                      </div>
                                      <h5 className="font-display text-sm font-bold text-[#111111] truncate">
                                        {alt.name}
                                      </h5>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-mono text-xs font-bold text-[#1F3D2B]">
                                        {alt.pricePerNight !== null ? `$${alt.pricePerNight.toLocaleString()} / nt` : "Rate on Request"}
                                      </span>
                                      {alt.rating > 0 && (
                                        <span className="font-mono text-[10px] text-[#111111]/60 block">
                                          ★ {alt.rating.toFixed(1)}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-[#111111]/60 truncate">
                                    📍 {alt.address}
                                  </p>

                                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                                    {alt.website ? (
                                      <a
                                        href={alt.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#111111] text-white hover:bg-[#111111]/85 text-[10px] font-mono font-medium transition-colors"
                                      >
                                        Official Website ↗
                                      </a>
                                    ) : (alt as { bookingUrl?: string }).bookingUrl ? (
                                      <a
                                        href={(alt as { bookingUrl?: string }).bookingUrl!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#111111] text-white hover:bg-[#111111]/85 text-[10px] font-mono font-medium transition-colors"
                                      >
                                        Search on Google Hotels ↗
                                      </a>
                                    ) : websiteUrl ? (
                                      <a
                                        href={websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#111111] text-white hover:bg-[#111111]/85 text-[10px] font-mono font-medium transition-colors"
                                      >
                                        View Hotel ↗
                                      </a>
                                    ) : (
                                      <span className="text-[10px] font-mono text-[#111111]/40 italic">
                                        Website unavailable
                                      </span>
                                    )}
                                    {mapsUrl && (
                                      <a
                                        href={mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#111111]/15 hover:border-[#111111]/30 bg-white text-[#111111] text-[10px] font-mono font-medium transition-colors"
                                      >
                                        Open in Maps ↗
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#111111]/60 italic">
                            Only 1 live accommodation option was returned for this destination and criteria.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : domainStatuses.stays === "unavailable" ? (
                    <div className="border border-amber-300/40 rounded-xl bg-amber-500/[0.04] p-6 space-y-2">
                      <div className="flex items-center gap-2 text-amber-800 font-mono text-xs uppercase font-bold tracking-wider">
                        <span>⚠</span>
                        <span>ACCOMMODATION PROVIDER ACCESS REQUIRED</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#111111]/80 leading-relaxed font-normal">
                        Live accommodation search is currently unavailable because Duffel Stays access is not enabled on the configured account (requires Duffel sales activation). In accordance with SafariX zero-mock policy, mock or simulated hotel inventory is not substituted.
                      </p>
                    </div>
                  ) : domainStatuses.stays === "no_results" ? (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/40 p-6 space-y-2">
                      <div className="flex items-center gap-2 text-[#5C625E] font-mono text-xs uppercase font-bold tracking-wider">
                        <span>ℹ</span>
                        <span>NO VERIFIED ACCOMMODATIONS FOUND</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#111111]/70 leading-relaxed">
                        No verified properties matching your party size and comfort tier were returned by the stay provider for this destination.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/30 p-6 text-sm text-[#111111]/70">
                      Sanctuaries and boutique accommodations tailored to your party will appear here.
                    </div>
                  )}
                </section>

                {/* 03 WHAT YOU'LL EXPERIENCE */}
                <section className="space-y-4">
                  <SectionHeader
                    number="03"
                    title="WHAT YOU'LL EXPERIENCE"
                    badge={
                      <StatusIndicator
                        status={
                          planningResult?.activities
                            ? "completed"
                            : domainStatuses.experiences === "unavailable"
                            ? "unavailable"
                            : domainStatuses.experiences === "no_results"
                            ? "no_results"
                            : "waiting"
                        }
                        customLabel={
                          planningResult?.activities
                            ? "ACTIVITIES MATCHED"
                            : domainStatuses.experiences === "unavailable"
                            ? "ATTRACTIONS PROVIDER UNAVAILABLE"
                            : domainStatuses.experiences === "no_results"
                            ? "NO ACTIVITIES FOUND"
                            : "WAITING FOR EXPERIENCES"
                        }
                      />
                    }
                    description="Places, landmarks, and experiences curated for your interests."
                  />

                  {planningResult?.activities ? (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/70 p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#111111]/8 pb-3">
                        <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#F06C5B]">
                          CURATED SELECTION // {planningResult.activities.selectedPlaceIds.length} HIGHLIGHTS CURATED
                        </span>
                        {planningResult.activities.selectedPlaces && (
                          <span className="font-mono text-xs text-[#111111]/50">
                            Ranked by location intelligence & travel interest
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#111111]/80 leading-relaxed font-normal">
                        {planningResult.activities.reasoning}
                      </p>

                      {/* Rich Place Cards Grid */}
                      {planningResult.selectedPlacesDetails && planningResult.selectedPlacesDetails.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {planningResult.selectedPlacesDetails.map((place) => {
                            const selectionReason = planningResult.activities?.selectedPlaces?.find(
                              (p) => p.placeId === place.id,
                            )?.reason;

                            return (
                              <div
                                key={place.id}
                                className="border border-[#111111]/10 rounded-xl p-4 bg-white/60 space-y-3 hover:border-[#F06C5B]/40 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2 py-0.5 rounded bg-[#111111]/5 font-mono text-[10px] uppercase font-semibold text-[#111111]/70">
                                        {place.type}
                                      </span>
                                      {place.priceType === "free" || place.ticketPrice === 0 || place.priceLevel === "free" ? (
                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono text-[10px] font-semibold">
                                          FREE ENTRY
                                        </span>
                                      ) : typeof place.ticketPrice === "number" && place.ticketPrice > 0 ? (
                                        <span className="px-2 py-0.5 rounded bg-[#1F3D2B]/10 text-[#1F3D2B] border border-[#1F3D2B]/20 font-mono text-[10px] font-semibold">
                                          {place.currency || "INR"} {place.ticketPrice.toLocaleString()}{place.isPriceEstimate ? " (EST.)" : ""}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded bg-[#111111]/5 text-[#111111]/50 font-mono text-[10px]">
                                          PRICE UNAVAILABLE
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-display text-base font-bold text-[#111111] truncate">
                                      {place.name}
                                    </h4>
                                  </div>
                                  <div className="text-right shrink-0">
                                    {place.rating > 0 ? (
                                      <span className="font-mono text-xs font-bold text-[#F06C5B]">
                                        ★ {place.rating.toFixed(1)}
                                      </span>
                                    ) : (
                                      <span className="font-mono text-[10px] text-[#111111]/40 uppercase tracking-wider bg-[#111111]/5 px-1.5 py-0.5 rounded">
                                        UNRATED
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-[#111111]/70 line-clamp-2 leading-relaxed">
                                  {place.description || selectionReason || "Curated point of interest."}
                                </p>

                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#111111]/8 font-mono text-[11px] text-[#111111]/55">
                                  <span className="truncate max-w-[65%]">
                                    📍 {place.address || "Central District"}
                                  </span>
                                  <span className="shrink-0 font-medium text-[#111111]/70">
                                    ⏱ ~{place.estimatedDurationMinutes || 60} min
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#111111]/60">
                                  <span>🕒</span>
                                  <span>
                                    {place.openingHours?.isAlwaysOpen
                                      ? "Always open (24/7)"
                                      : place.openingHours?.text && !place.openingHours?.isUnknown
                                      ? place.openingHours.text
                                      : "Hours: Unknown (verify locally)"}
                                  </span>
                                </div>

                                {/* External Location & Website Links + Replace Action */}
                                <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-dashed border-[#111111]/10 font-mono text-[11px] flex-wrap">
                                  <div className="flex items-center gap-3">
                                    <a
                                      href={buildGoogleMapsUrl({
                                        latitude: place.latitude,
                                        longitude: place.longitude,
                                        address: place.address,
                                        label: place.name,
                                        placeId: place.googlePlaceId || place.source?.providerId,
                                        googlePlaceId: place.googlePlaceId,
                                        googleMapsUri: place.googleMapsUri,
                                      }) || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[#1F3D2B] hover:underline font-semibold"
                                    >
                                      <span>View on Map</span>
                                      <span aria-hidden="true">↗</span>
                                    </a>

                                    {buildPlaceWebsiteUrl({
                                      website: place.website,
                                      sourceUrl: place.source?.sourceUrl,
                                    }) ? (
                                      <a
                                        href={buildPlaceWebsiteUrl({
                                          website: place.website,
                                          sourceUrl: place.source?.sourceUrl,
                                        })!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[#111111]/75 hover:text-[#111111] hover:underline font-medium"
                                      >
                                        <span>Official Site</span>
                                        <span aria-hidden="true">↗</span>
                                      </a>
                                    ) : (
                                      <span className="text-[#111111]/40 text-[10px]">
                                        Website unavailable
                                      </span>
                                    )}
                                  </div>

                                  {planningStatus === "completed" && (
                                    <button
                                      type="button"
                                      onClick={() => openReplaceModal("activity", place.id, place.name)}
                                      disabled={isEditing}
                                      className="text-[#F06C5B] hover:text-[#F06C5B]/80 font-bold hover:underline disabled:opacity-40 ml-auto"
                                    >
                                      REPLACE ↺
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {planningResult.activities.selectedPlaceIds.map((pid) => (
                            <span
                              key={pid}
                              className="px-3 py-1 rounded-md bg-[#111111]/5 font-mono text-xs text-[#111111]"
                            >
                              {pid.replace("place_", "").replace(/_/g, " ").toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : domainStatuses.experiences === "unavailable" ? (
                    <div className="border border-amber-300/40 rounded-xl bg-amber-500/[0.04] p-6 space-y-2">
                      <div className="flex items-center gap-2 text-amber-800 font-mono text-xs uppercase font-bold tracking-wider">
                        <span>⚠</span>
                        <span>ATTRACTIONS PROVIDER ACCESS REQUIRED</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#111111]/80 leading-relaxed font-normal">
                        Live attractions and sights search is currently unavailable because Google Places API requires Google Cloud Billing activation and Places API (New) enabled on your project. In accordance with SafariX zero-mock policy, mock or simulated tourist sights are not substituted.
                      </p>
                    </div>
                  ) : domainStatuses.experiences === "no_results" ? (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/40 p-6 space-y-2">
                      <div className="flex items-center gap-2 text-[#5C625E] font-mono text-xs uppercase font-bold tracking-wider">
                        <span>ℹ</span>
                        <span>NO VERIFIED EXPERIENCES FOUND</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#111111]/70 leading-relaxed">
                        No verified attractions or experiences matching your interests were returned by the provider for this destination.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/30 p-6 text-sm text-[#111111]/70">
                      Curated sights, walks, and activities matching your preferences will be detailed here.
                    </div>
                  )}
                </section>

                {/* 04 EAT & DRINK */}
                <section className="space-y-4">
                  <SectionHeader
                    number="04"
                    title="EAT & DRINK"
                    badge={
                      <StatusIndicator
                        status={
                          planningResult?.food
                            ? "completed"
                            : domainStatuses.food === "unavailable"
                            ? "unavailable"
                            : domainStatuses.food === "no_results"
                            ? "no_results"
                            : "waiting"
                        }
                        customLabel={
                          planningResult?.food
                            ? "DINING CURATED"
                            : domainStatuses.food === "unavailable"
                            ? "DINING PROVIDER UNAVAILABLE"
                            : domainStatuses.food === "no_results"
                            ? "NO RESTAURANTS FOUND"
                            : "WAITING FOR DINING"
                        }
                      />
                    }
                    description="Local gastronomy, authentic dining, and culinary highlights."
                  />

                  {planningResult?.food ? (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/70 p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#111111]/8 pb-3">
                        <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#1F3D2B]">
                          RESTAURANT SELECTIONS // {planningResult.food.selectedRestaurantIds.length} DINING SPOTS
                        </span>
                        {planningResult.food.selectedRestaurants && (
                          <span className="font-mono text-[11px] text-[#111111]/50">
                            {planningResult.food.selectedRestaurants.length} curated dining spots
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#111111]/80 leading-relaxed font-normal">
                        {planningResult.food.reasoning}
                      </p>

                      {/* Rich Restaurant Cards Grid */}
                      {planningResult.selectedRestaurantsDetails && planningResult.selectedRestaurantsDetails.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {planningResult.selectedRestaurantsDetails.map((restaurant) => {
                            const selectionMeta = planningResult.food?.selectedRestaurants?.find(
                              (r) => r.restaurantId === restaurant.id,
                            );

                            return (
                              <div
                                key={restaurant.id}
                                className="border border-[#111111]/10 rounded-xl p-4 bg-white/60 space-y-3 hover:border-[#1F3D2B]/40 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {restaurant.cuisine.slice(0, 2).map((c, i) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 rounded bg-[#111111]/5 font-mono text-[10px] uppercase font-semibold text-[#111111]/70"
                                        >
                                          {c}
                                        </span>
                                      ))}
                                      {selectionMeta?.mealType && (
                                        <span className="px-2 py-0.5 rounded bg-[#2A9D8F]/10 text-[#2A9D8F] border border-[#2A9D8F]/20 font-mono text-[10px] uppercase font-semibold">
                                          {selectionMeta.mealType}
                                        </span>
                                      )}
                                      {restaurant.priceType === "free" || restaurant.averagePricePerPerson === 0 ? (
                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono text-[10px] font-semibold">
                                          FREE TASTING
                                        </span>
                                      ) : typeof restaurant.averagePricePerPerson === "number" && restaurant.averagePricePerPerson > 0 ? (
                                        <span className="px-2 py-0.5 rounded bg-[#1F3D2B]/10 text-[#1F3D2B] border border-[#1F3D2B]/20 font-mono text-[10px] font-semibold">
                                          {restaurant.currency || "INR"} {restaurant.averagePricePerPerson.toLocaleString()} / person{restaurant.isPriceEstimate ? " (EST.)" : ""}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded bg-[#111111]/5 text-[#111111]/50 font-mono text-[10px]">
                                          PRICE UNAVAILABLE
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-display text-base font-bold text-[#111111] truncate">
                                      {restaurant.name}
                                    </h4>
                                  </div>
                                  <div className="text-right shrink-0">
                                    {restaurant.rating > 0 ? (
                                      <span className="font-mono text-xs font-bold text-[#F06C5B]">
                                        ★ {restaurant.rating.toFixed(1)}
                                      </span>
                                    ) : (
                                      <span className="font-mono text-[10px] text-[#111111]/40 uppercase tracking-wider bg-[#111111]/5 px-1.5 py-0.5 rounded">
                                        UNRATED
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-[#111111]/70 line-clamp-2 leading-relaxed">
                                  {restaurant.description || selectionMeta?.reason || "Curated dining experience."}
                                </p>

                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#111111]/8 font-mono text-[11px] text-[#111111]/55">
                                  <span className="truncate max-w-[65%]">
                                    📍 {restaurant.address || "Central District"}
                                  </span>
                                  {restaurant.dietaryOptions && restaurant.dietaryOptions.length > 0 ? (
                                    <span className="shrink-0 font-medium text-emerald-700">
                                      🌱 {restaurant.dietaryOptions[0]}
                                    </span>
                                  ) : (
                                    <span className="shrink-0 font-medium text-[#111111]/60">
                                      {restaurant.category || "Dining"}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#111111]/60">
                                  <span>🕒</span>
                                  <span>
                                    {restaurant.openingHours?.isAlwaysOpen
                                      ? "Always open (24/7)"
                                      : restaurant.openingHours?.text && !restaurant.openingHours?.isUnknown
                                      ? restaurant.openingHours.text
                                      : "Hours: Unknown (verify locally)"}
                                  </span>
                                </div>

                                {/* External Location & Menu/Website Links */}
                                {/* External Location & Website Links + Replace Action */}
                                <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-dashed border-[#111111]/10 font-mono text-[11px] flex-wrap">
                                  <div className="flex items-center gap-3">
                                    <a
                                      href={buildGoogleMapsUrl({
                                        latitude: restaurant.latitude,
                                        longitude: restaurant.longitude,
                                        address: restaurant.address,
                                        label: restaurant.name,
                                        placeId: restaurant.googlePlaceId || restaurant.source?.providerId,
                                        googlePlaceId: restaurant.googlePlaceId,
                                        googleMapsUri: restaurant.googleMapsUri,
                                      }) || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[#1F3D2B] hover:underline font-semibold"
                                    >
                                      <span>View on Map</span>
                                      <span aria-hidden="true">↗</span>
                                    </a>

                                    {buildPlaceWebsiteUrl({
                                      website: restaurant.website,
                                      sourceUrl: restaurant.source?.sourceUrl,
                                    }) ? (
                                      <a
                                        href={buildPlaceWebsiteUrl({
                                          website: restaurant.website,
                                          sourceUrl: restaurant.source?.sourceUrl,
                                        })!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[#111111]/75 hover:text-[#111111] hover:underline font-medium"
                                      >
                                        <span>Website / Menu</span>
                                        <span aria-hidden="true">↗</span>
                                      </a>
                                    ) : (
                                      <span className="text-[#111111]/40 text-[10px]">
                                        Website unavailable
                                      </span>
                                    )}
                                  </div>

                                  {planningStatus === "completed" && (
                                    <button
                                      type="button"
                                      onClick={() => openReplaceModal("restaurant", restaurant.id, restaurant.name)}
                                      disabled={isEditing}
                                      className="text-[#1F3D2B] hover:text-[#1F3D2B]/80 font-bold hover:underline disabled:opacity-40 ml-auto"
                                    >
                                      REPLACE ↺
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {planningResult.food.selectedRestaurantIds.map((rid) => (
                            <span
                              key={rid}
                              className="px-3 py-1 rounded-md bg-[#111111]/5 font-mono text-xs text-[#111111]"
                            >
                              {rid.replace("rest_", "").replace(/_/g, " ").toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : domainStatuses.food === "unavailable" ? (
                    <div className="border border-amber-300/40 rounded-xl bg-amber-500/[0.04] p-6 space-y-2">
                      <div className="flex items-center gap-2 text-amber-800 font-mono text-xs uppercase font-bold tracking-wider">
                        <span>⚠</span>
                        <span>DINING PROVIDER ACCESS REQUIRED</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#111111]/80 leading-relaxed font-normal">
                        Live dining and culinary recommendations could not be retrieved from the dining provider for this location. In accordance with SafariX data integrity policies, fabricated or placeholder dining venues are never substituted.
                      </p>
                    </div>
                  ) : domainStatuses.food === "no_results" ? (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/40 p-6 space-y-2">
                      <div className="flex items-center gap-2 text-[#5C625E] font-mono text-xs uppercase font-bold tracking-wider">
                        <span>ℹ</span>
                        <span>NO VERIFIED RESTAURANTS FOUND</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#111111]/70 leading-relaxed">
                        No verified restaurants matching your culinary preferences were returned by the dining provider for this destination.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/30 p-6 text-sm text-[#111111]/70">
                      Food recommendations and dining reservations will be populated by the food agent.
                    </div>
                  )}
                </section>

                {/* 05 YOUR ITINERARY */}
                <section className="space-y-4">
                  <SectionHeader
                    number="05"
                    title="YOUR ITINERARY"
                    badge={
                      <StatusIndicator
                        status={
                          planningResult?.completeness?.isComplete === false
                            ? "failed"
                            : planningResult?.itinerary
                            ? "completed"
                            : "waiting"
                        }
                        customLabel={
                          planningResult?.completeness?.isComplete === false
                            ? "INCOMPLETE JOURNEY"
                            : planningResult?.itinerary
                            ? "ITINERARY BUILT"
                            : "WAITING FOR ITINERARY"
                        }
                      />
                    }
                    description="Day-by-day balanced progression across transit, stays, and activities."
                  />

                  {planningResult?.itinerary ? (
                    <div className="space-y-6">
                      {planningResult.completeness?.isComplete === false && (
                        <div className="border border-amber-300/60 rounded-xl bg-amber-500/[0.06] p-5 space-y-2">
                          <div className="flex items-center gap-2 text-amber-900 font-mono text-xs uppercase font-bold tracking-wider">
                            <span>⚠</span>
                            <span>INCOMPLETE JOURNEY PLAN — PROVIDER DATA MISSING</span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#111111]/80 leading-relaxed font-normal">
                            {planningResult.completeness.hollowReason ||
                              "This itinerary contains only transit timing or open free time because verified accommodation and attractions providers did not return inventory. Real provider inventory is required for a complete travel plan."}
                          </p>
                        </div>
                      )}
                      {/* Sticky Interactive Day Navigation Tabs (Reference 3, 4, 5) */}
                      <div className="sticky top-20 z-20 bg-[#F8F5EE]/95 backdrop-blur-md py-3 border-y border-[#171A18]/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setSelectedDayTab("all")}
                          className={`px-3.5 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider font-bold transition-all shrink-0 ${
                            selectedDayTab === "all"
                              ? "bg-[#1F3D2B] text-white shadow-sm"
                              : "bg-white/80 text-[#5C625E] border border-[#171A18]/10 hover:text-[#171A18]"
                          }`}
                        >
                          ALL DAYS ({planningResult.itinerary.days.length})
                        </button>
                        {planningResult.itinerary.days.map((dayPlan) => (
                          <button
                            key={dayPlan.dayNumber}
                            type="button"
                            onClick={() => setSelectedDayTab(dayPlan.dayNumber)}
                            className={`px-3.5 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                              selectedDayTab === dayPlan.dayNumber
                                ? "bg-[#1F3D2B] text-white shadow-sm"
                                : "bg-white/80 text-[#5C625E] border border-[#171A18]/10 hover:text-[#171A18]"
                            }`}
                          >
                            <span>DAY {dayPlan.dayNumber}</span>
                            <span className="opacity-60 text-[10px] font-normal truncate max-w-[120px]">
                              {dayPlan.theme}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        {planningResult.itinerary.days
                          .filter((d) => selectedDayTab === "all" || d.dayNumber === selectedDayTab)
                          .map((dayPlan) => (
                            <div
                              key={dayPlan.dayNumber}
                              className="border border-[#111111]/10 rounded-2xl bg-white/80 p-5 sm:p-6 space-y-4 shadow-xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#111111]/8 pb-2.5">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs uppercase tracking-widest text-[#F06C5B] font-bold">
                                    DAY {dayPlan.dayNumber.toString().padStart(2, "0")}
                                  </span>
                              {planningStatus === "completed" && (
                                <button
                                  type="button"
                                  onClick={() => handleRegenerateDay(dayPlan.dayNumber)}
                                  disabled={isEditing}
                                  className="font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-[#F06C5B]/30 text-[#F06C5B] hover:bg-[#F06C5B] hover:text-white transition-colors disabled:opacity-40"
                                >
                                  REGENERATE DAY ↺
                                </button>
                              )}
                            </div>
                            <h4 className="font-display text-lg font-bold text-[#111111]">
                              {dayPlan.theme}
                            </h4>
                          </div>

                          <div className="divide-y divide-[#111111]/8">
                            {dayPlan.items.map((item, itemIdx) => {
                              const matchedPlace =
                                item.type === "activity"
                                  ? planningResult.selectedPlacesDetails?.find((p) => p.id === item.referenceId)
                                  : null;

                              const matchedRestaurant =
                                item.type === "food"
                                  ? planningResult.selectedRestaurantsDetails?.find((r) => r.id === item.referenceId)
                                  : null;

                              const matchedStay =
                                item.type === "stay"
                                  ? planningResult.selectedStayDetails
                                  : null;

                              const itemEntity = matchedPlace || matchedRestaurant || matchedStay;
                              const itemMapUrl = itemEntity
                                ? buildGoogleMapsUrl({
                                    latitude: itemEntity.latitude,
                                    longitude: itemEntity.longitude,
                                    address: itemEntity.address,
                                    label: itemEntity.name,
                                    placeId: (itemEntity as { googlePlaceId?: string }).googlePlaceId || itemEntity.source?.providerId,
                                    googlePlaceId: (itemEntity as { googlePlaceId?: string }).googlePlaceId,
                                    googleMapsUri: (itemEntity as { googleMapsUri?: string }).googleMapsUri,
                                  })
                                : null;

                              return (
                                <div
                                  key={itemIdx}
                                  className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <span className="font-mono text-[11px] text-[#111111]/50 w-24 shrink-0">
                                      {item.startTime} – {item.endTime}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-[#111111]/5 font-mono text-[10px] uppercase font-semibold text-[#111111]/70">
                                      {item.type.replace("_", " ")}
                                    </span>
                                    {matchedPlace && (
                                      <span className="font-bold text-[#111111] text-xs">
                                        {matchedPlace.name}
                                      </span>
                                    )}
                                    {matchedStay && (
                                      <span className="font-bold text-[#111111] text-xs">
                                        {matchedStay.name}
                                      </span>
                                    )}
                                    {matchedPlace?.priceType === "free" && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono text-[9px] font-semibold">
                                        FREE
                                      </span>
                                    )}
                                    {matchedPlace?.ticketPrice && matchedPlace.ticketPrice > 0 && (
                                      <span className="px-1.5 py-0.5 rounded bg-[#1F3D2B]/10 text-[#1F3D2B] font-mono text-[9px] font-semibold">
                                        {matchedPlace.currency || "INR"} {matchedPlace.ticketPrice.toLocaleString()}
                                      </span>
                                    )}
                                    {matchedPlace?.estimatedDurationMinutes && (
                                      <span className="font-mono text-[10px] text-[#111111]/40">
                                        ({matchedPlace.estimatedDurationMinutes}m)
                                      </span>
                                    )}

                                    {matchedRestaurant && (
                                      <span className="font-bold text-[#111111] text-xs">
                                        {matchedRestaurant.name}
                                      </span>
                                    )}
                                    {matchedRestaurant?.cuisine && matchedRestaurant.cuisine.length > 0 && (
                                      <span className="font-mono text-[10px] text-[#111111]/50">
                                        ({matchedRestaurant.cuisine[0]})
                                      </span>
                                    )}
                                    {matchedRestaurant?.priceType === "free" || matchedRestaurant?.averagePricePerPerson === 0 ? (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono text-[9px] font-semibold">
                                        FREE
                                      </span>
                                    ) : typeof matchedRestaurant?.averagePricePerPerson === "number" && matchedRestaurant.averagePricePerPerson > 0 ? (
                                      <span className="px-1.5 py-0.5 rounded bg-[#1F3D2B]/10 text-[#1F3D2B] font-mono text-[9px] font-semibold">
                                        {matchedRestaurant.currency || "INR"} {matchedRestaurant.averagePricePerPerson.toLocaleString()}
                                      </span>
                                    ) : null}

                                    {itemMapUrl && (
                                      <a
                                        href={itemMapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-0.5 text-[#1F3D2B] hover:underline font-mono text-[10px] ml-1 shrink-0"
                                        title="View on Google Maps"
                                      >
                                        <span>Map</span>
                                        <span aria-hidden="true">↗</span>
                                      </a>
                                    )}

                                    {planningStatus === "completed" && item.type === "activity" && matchedPlace && (
                                      <button
                                        type="button"
                                        onClick={() => openReplaceModal("activity", matchedPlace.id, matchedPlace.name)}
                                        disabled={isEditing}
                                        className="font-mono text-[10px] text-[#F06C5B] hover:underline font-semibold ml-1 shrink-0"
                                        title="Replace activity"
                                      >
                                        [Replace ↺]
                                      </button>
                                    )}

                                    {planningStatus === "completed" && item.type === "food" && matchedRestaurant && (
                                      <button
                                        type="button"
                                        onClick={() => openReplaceModal("restaurant", matchedRestaurant.id, matchedRestaurant.name)}
                                        disabled={isEditing}
                                        className="font-mono text-[10px] text-[#1F3D2B] hover:underline font-semibold ml-1 shrink-0"
                                        title="Replace restaurant"
                                      >
                                        [Replace ↺]
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-[#111111]/80 text-xs sm:text-right flex-1 leading-relaxed">
                                    {item.reasoning}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-[#111111]/10 rounded-xl bg-white/30 p-6 text-sm text-[#111111]/70">
                      Your complete day-by-day plan will assemble once multi-agent synthesis runs.
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>

        {/* Mark as Completed Confirmation Dialog */}
        {showCompleteConfirm && trip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md rounded-2xl bg-[#FAF7F0] border border-[#111111]/15 p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#2A9D8F] font-semibold">
                  JOURNEY ARCHIVE
                </span>
                <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#111111]">
                  MARK AS COMPLETED
                </h3>
                <p className="text-sm text-[#111111]/70 leading-relaxed font-normal">
                  Are you sure you want to mark this {trip.days}-day expedition to {trip.destination} as completed? The journey will be archived in your travel history.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteConfirm(false)}
                  disabled={isUpdatingStatus}
                  className="rounded-full border border-[#111111]/20 bg-transparent px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#111111] hover:bg-[#111111]/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMarkCompleted}
                  disabled={isUpdatingStatus}
                  className="rounded-full bg-[#2A9D8F] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#238276] transition-all shadow-sm flex items-center gap-2"
                >
                  {isUpdatingStatus ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Archiving...</span>
                    </>
                  ) : (
                    <span>Confirm Completion</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 13 Modals */}
        <RegenerateJourneyModal
          isOpen={showRegenerateModal}
          onClose={() => setShowRegenerateModal(false)}
          onConfirm={handleRegenerateWholeJourney}
          isLoading={isEditing}
        />

        <ChangeTransportModal
          isOpen={showTransportModal}
          onClose={() => setShowTransportModal(false)}
          currentMode={planningResult?.transportation?.mode || "auto"}
          onSelectMode={handleChangeTransport}
          isLoading={isEditing}
        />

        <ChangeStayModal
          isOpen={showStayModal}
          onClose={() => setShowStayModal(false)}
          candidates={
            stayCandidates.length > 0
              ? stayCandidates
              : (planningResult?.stayAlternativesDetails || []).map((s) => ({
                  id: s.id,
                  name: s.name,
                  category: s.category,
                  comfortLevel: s.comfortLevel,
                  pricePerNight: s.pricePerNight,
                  rating: s.rating,
                  reviewCount: s.reviewCount,
                  address: s.address,
                  isSelected: s.id === (planningResult?.stay?.recommendedStayId || planningResult?.selectedStayDetails?.id),
                }))
          }
          providerStatus={stayProviderStatus}
          providerError={stayProviderError}
          onSelectStay={handleChangeStay}
          isLoading={isEditing}
        />

        {replaceModalConfig && (
          <ReplaceItemModal
            isOpen={replaceModalConfig.isOpen}
            onClose={() => setReplaceModalConfig(null)}
            title={replaceModalConfig.title}
            itemType={replaceModalConfig.itemType}
            currentTargetName={replaceModalConfig.targetName}
            candidates={itemCandidates}
            onSelectReplacement={handleReplaceItem}
            isLoading={isEditing}
          />
        )}

        <VersionHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          versions={versions}
          isLoading={isLoadingVersions}
          onRestoreVersion={handleRestoreVersion}
          isRestoring={isRestoringVersion}
          currentVersionNumber={versions[0]?.versionNumber}
        />
      </div>

    </AppShell>
  );
}
