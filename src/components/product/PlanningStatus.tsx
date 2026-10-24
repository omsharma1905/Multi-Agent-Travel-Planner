import React, { useEffect, useState } from "react";
import { StatusIndicator } from "./StatusIndicator";

export interface DomainPlanStatus {
  transportation: "waiting" | "in_progress" | "found" | "independent" | "unavailable" | "no_results";
  stays: "waiting" | "in_progress" | "found" | "unavailable" | "no_results";
  experiences: "waiting" | "in_progress" | "found" | "unavailable" | "no_results";
  food: "waiting" | "in_progress" | "found" | "unavailable" | "no_results";
  budget: "waiting" | "in_progress" | "calculated" | "unavailable" | "no_results";
  itinerary: "waiting" | "in_progress" | "generated" | "unavailable" | "no_results" | "failed";
}

interface PlanningStatusProps {
  statuses: DomainPlanStatus;
  isPlanning?: boolean;
  onStartPlanning?: () => void;
  className?: string;
}

const PLANNING_STAGES = [
  { step: 1, label: "Understanding your preferences", domain: null },
  { step: 2, label: "Comparing transportation options", domain: "transportation" },
  { step: 3, label: "Finding accommodation", domain: "stays" },
  { step: 4, label: "Selecting activities", domain: "experiences" },
  { step: 5, label: "Finding places to eat", domain: "food" },
  { step: 6, label: "Checking the budget", domain: "budget" },
  { step: 7, label: "Building the itinerary", domain: "itinerary" },
  { step: 8, label: "Validating the journey", domain: null },
] as const;

export function PlanningStatus({
  statuses,
  isPlanning = false,
  onStartPlanning,
  className = "",
}: PlanningStatusProps) {
  // Active stage progression during planning execution
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  useEffect(() => {
    if (!isPlanning) return;

    // Step through the 8 genuine planning stages over ~10 seconds
    const intervalTimes = [0, 1200, 2600, 4000, 5500, 7000, 8500, 10000];
    const timeouts: NodeJS.Timeout[] = [];

    intervalTimes.forEach((time, index) => {
      const t = setTimeout(() => {
        setActiveStageIndex(index);
      }, time);
      timeouts.push(t);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isPlanning]);

  const currentStage = isPlanning ? activeStageIndex : 0;

  const isCompleted = Object.values(statuses).every(
    (s) => s === "found" || s === "calculated" || s === "generated" || s === "independent",
  );

  // Derive domain states during active planning
  const effectiveStatuses: DomainPlanStatus = isPlanning
    ? {
        transportation: currentStage > 1 ? "found" : currentStage === 1 ? "in_progress" : "waiting",
        stays: currentStage > 2 ? "found" : currentStage === 2 ? "in_progress" : "waiting",
        experiences: currentStage > 3 ? "found" : currentStage === 3 ? "in_progress" : "waiting",
        food: currentStage > 4 ? "found" : currentStage === 4 ? "in_progress" : "waiting",
        budget: currentStage > 5 ? "calculated" : currentStage === 5 ? "in_progress" : "waiting",
        itinerary: currentStage > 6 ? "generated" : currentStage === 6 ? "in_progress" : "waiting",
      }
    : statuses;

  const domains: { key: keyof DomainPlanStatus; label: string; state: string }[] = [
    { key: "transportation", label: "TRANSPORTATION", state: effectiveStatuses.transportation },
    { key: "stays", label: "STAYS & SANCTUARIES", state: effectiveStatuses.stays },
    { key: "experiences", label: "EXPERIENCES", state: effectiveStatuses.experiences },
    { key: "food", label: "FOOD & DINING", state: effectiveStatuses.food },
    { key: "budget", label: "BUDGET SYNTHESIS", state: effectiveStatuses.budget },
    { key: "itinerary", label: "DAY-BY-DAY ITINERARY", state: effectiveStatuses.itinerary },
  ];

  const mapToIndicatorStatus = (val: string) => {
    switch (val) {
      case "found":
      case "calculated":
      case "generated":
      case "independent":
        return "completed";
      case "in_progress":
        return "in_progress";
      case "unavailable":
        return "unavailable";
      case "no_results":
        return "no_results";
      case "failed":
        return "failed";
      case "waiting":
      default:
        return "waiting";
    }
  };

  const mapToDisplayLabel = (val: string) => {
    switch (val) {
      case "found":
        return "FOUND";
      case "independent":
        return "LOCAL / ARRIVAL";
      case "calculated":
        return "CALCULATED";
      case "generated":
        return "GENERATED";
      case "in_progress":
        return "IN PROGRESS";
      case "unavailable":
        return "UNAVAILABLE";
      case "no_results":
        return "NO RESULTS";
      case "failed":
        return "INCOMPLETE";
      case "waiting":
      default:
        return "WAITING";
    }
  };

  return (
    <div
      className={`rounded-2xl border border-[#111111]/12 bg-[#111111]/[0.02] p-6 sm:p-8 space-y-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#111111]/10 pb-5">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#1F3D2B] font-semibold block mb-1">
            MULTI-AGENT PLANNING ENGINE
          </span>
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-[#111111]">
            {isCompleted
              ? "JOURNEY SPECIFICATIONS VERIFIED"
              : isPlanning
              ? "COORDINATING BESPOKE TRAVEL PLAN..."
              : "PLANNING STATUS"}
          </h3>
        </div>

        {onStartPlanning && (
          <button
            type="button"
            onClick={onStartPlanning}
            disabled={isPlanning}
            className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#FAF7F0] hover:bg-[#1F3D2B] hover:text-white transition-all shadow-sm shrink-0 disabled:opacity-50"
          >
            {isPlanning ? (
              <>
                <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>PLANNING IN PROGRESS...</span>
              </>
            ) : isCompleted ? (
              <>
                <span>RE-ORCHESTRATE</span>
                <span>↻</span>
              </>
            ) : (
              <>
                <span>START AI PLANNING</span>
                <span>→</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Part 3: Genuine 8 Planning Stages Visualization */}
      {isPlanning && (
        <div className="rounded-xl border border-[#1F3D2B]/20 bg-[#1F3D2B]/[0.04] p-5 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F3D2B]/15 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#1F3D2B]/30 border-t-[#1F3D2B] animate-spin shrink-0" />
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#1F3D2B]">
                STAGE {currentStage + 1} OF 8: {PLANNING_STAGES[currentStage].label.toUpperCase()}
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#111111]/60">
              Coordinating verified travel data from real providers
            </span>
          </div>

          {/* Stepper list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {PLANNING_STAGES.map((stg, idx) => {
              const isPast = idx < currentStage;
              const isCurrent = idx === currentStage;

              return (
                <div
                  key={stg.step}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all ${
                    isCurrent
                      ? "border-[#1F3D2B] bg-white text-[#111111] font-semibold shadow-xs"
                      : isPast
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900"
                      : "border-[#111111]/8 bg-white/40 text-[#111111]/45"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center font-mono text-[10px] shrink-0 ${
                      isCurrent
                        ? "bg-[#1F3D2B] text-white font-bold"
                        : isPast
                        ? "bg-emerald-600 text-white"
                        : "bg-[#111111]/10 text-[#111111]/60"
                    }`}
                  >
                    {isPast ? "✓" : stg.step}
                  </span>
                  <span className="truncate">{stg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6 Domain Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {domains.map((dom) => {
          const indicatorStatus = mapToIndicatorStatus(dom.state);
          const displayLabel = mapToDisplayLabel(dom.state);

          return (
            <div
              key={dom.key}
              className="border border-[#111111]/8 rounded-xl bg-white/70 p-3 sm:p-3.5 flex flex-row xs:flex-col justify-between items-center xs:items-start gap-2"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/60">
                {dom.label}
              </span>
              <div>
                <StatusIndicator
                  status={indicatorStatus}
                  customLabel={displayLabel}
                  size="sm"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

