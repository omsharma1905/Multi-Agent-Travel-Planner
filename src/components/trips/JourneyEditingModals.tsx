/**
 * @file src/components/trips/JourneyEditingModals.tsx
 *
 * Comprehensive UI components for SafariX Journey Editing & Regeneration:
 * 1. NaturalLanguageEditBar — Natural language modifications with quick chips
 * 2. RegenerateJourneyModal — Whole journey regeneration confirmation with optional guidance
 * 3. ChangeTransportModal — Mode switcher (flight, train, bus, car, auto)
 * 4. ChangeStayModal — Stay replacement modal with real candidate properties
 * 5. ReplaceItemModal — Activity or Restaurant candidate replacement modal
 * 6. EditChangeBanner — Before/After budget and change summary banner
 */

"use client";

import React, { useState } from "react";
import { EditChangeSummary } from "@/lib/orchestration/editing/schemas";

// =============================================================================
// 1. NATURAL LANGUAGE EDIT BAR
// =============================================================================

interface NaturalLanguageEditBarProps {
  onApplyPrompt: (prompt: string) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

const QUICK_CHIPS = [
  { label: "Make it cheaper", prompt: "Make the journey cheaper and reduce overall costs" },
  { label: "Prioritize luxury", prompt: "Upgrade accommodations and experiences to luxury" },
  { label: "Travel by train", prompt: "Switch transportation to train" },
  { label: "Travel by flight", prompt: "Switch transportation to flight" },
  { label: "More nature / outdoors", prompt: "Add more nature and outdoor activities" },
  { label: "More culture & history", prompt: "Add more cultural and historic places" },
];

export function NaturalLanguageEditBar({
  onApplyPrompt,
  isLoading,
  disabled = false,
}: NaturalLanguageEditBarProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || disabled) return;
    await onApplyPrompt(prompt.trim());
    setPrompt("");
  };

  const handleChipClick = async (chipPrompt: string) => {
    if (isLoading || disabled) return;
    setPrompt(chipPrompt);
    await onApplyPrompt(chipPrompt);
  };

  return (
    <div className="border border-[#111111]/15 rounded-2xl bg-white/80 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#111111]/8 pb-3">
        <div className="space-y-0.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1F3D2B] font-semibold block">
            AI JOURNEY MODIFICATION
          </span>
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-[#111111]">
            HOW SHOULD WE CHANGE IT?
          </h3>
        </div>
        <span className="font-mono text-xs text-[#111111]/50">
          SafariX re-plans collaboratively
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Make it cheaper, prioritize beaches, travel by train, upgrade stay..."
          disabled={isLoading || disabled}
          className="flex-1 rounded-xl border border-[#111111]/20 bg-white px-4 py-3 font-sans text-xs sm:text-sm text-[#111111] placeholder:text-[#111111]/40 focus:border-[#1F3D2B] focus:outline-none focus:ring-1 focus:ring-[#1F3D2B] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isLoading || disabled}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111111] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#111111]/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {isLoading ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>REWORKING...</span>
            </>
          ) : (
            <span>APPLY CHANGES →</span>
          )}
        </button>
      </form>

      {/* Quick Action Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/45 mr-1">
          SUGGESTIONS:
        </span>
        {QUICK_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleChipClick(chip.prompt)}
            disabled={isLoading || disabled}
            className="rounded-full border border-[#111111]/15 bg-white/60 px-3 py-1 font-mono text-[11px] text-[#111111]/75 hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-all disabled:opacity-40"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// 2. REGENERATE JOURNEY MODAL
// =============================================================================

interface RegenerateJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (guidance?: string) => Promise<void>;
  isLoading: boolean;
}

export function RegenerateJourneyModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: RegenerateJourneyModalProps) {
  const [guidance, setGuidance] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-[#FAF7F0] border border-[#111111]/15 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#F06C5B] font-semibold">
            FULL REGENERATION
          </span>
          <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#111111]">
            REGENERATE WHOLE JOURNEY
          </h3>
          <p className="text-xs sm:text-sm text-[#111111]/70 leading-relaxed font-normal">
            This will re-run the entire multi-agent coordination loop across transport, accommodations, activities, dining, and daily scheduling.
          </p>
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase tracking-wider text-[#111111]/70 block font-semibold">
            GUIDANCE / PREFERENCES (OPTIONAL)
          </label>
          <textarea
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            placeholder="e.g., Focus more on relaxed mornings, prioritize beach spots, keep stays under $150/night..."
            rows={3}
            disabled={isLoading}
            className="w-full rounded-xl border border-[#111111]/20 bg-white p-3 font-sans text-xs sm:text-sm text-[#111111] placeholder:text-[#111111]/40 focus:border-[#1F3D2B] focus:outline-none focus:ring-1 focus:ring-[#1F3D2B] disabled:opacity-50 resize-none"
          />
        </div>

        <div className="rounded-xl border border-[#111111]/10 bg-white/60 p-4 font-mono text-[11px] text-[#111111]/70 space-y-1">
          <div className="font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
            <span>🛡</span>
            <span>FAIL-SAFE GUARANTEE</span>
          </div>
          <p className="leading-relaxed">
            Your current journey remains 100% safe and intact. If the regenerated plan fails validation or feasibility checks, your existing itinerary will not be changed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#111111]/20 font-mono text-xs uppercase tracking-wider text-[#111111]/70 hover:bg-[#111111]/5 transition-colors disabled:opacity-40"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => onConfirm(guidance.trim() || undefined)}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#F06C5B] font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#F06C5B]/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>REGENERATING...</span>
              </>
            ) : (
              <span>CONFIRM REGENERATION</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 3. CHANGE TRANSPORT MODAL
// =============================================================================

interface ChangeTransportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: string;
  onSelectMode: (mode: string) => Promise<void>;
  isLoading: boolean;
}

const MODES = [
  { id: "flight", label: "FLIGHT", description: "Fastest for long distances; airports & carrier connections." },
  { id: "train", label: "TRAIN", description: "Scenic rail connections, stations in city center." },
  { id: "bus", label: "BUS / COACH", description: "Budget-friendly regional bus connections." },
  { id: "car", label: "CAR / RENTAL", description: "Road trip flexibility, highway routing." },
  { id: "auto", label: "AUTO-RECOMMENDED", description: "Let SafariX pick the best mode based on distance and budget." },
];

export function ChangeTransportModal({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  isLoading,
}: ChangeTransportModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const currentSelected = selected ?? (currentMode || "auto");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-[#FAF7F0] border border-[#111111]/15 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#1F3D2B] font-semibold">
            TRANSPORT PREFERENCE
          </span>
          <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#111111]">
            CHANGE TRANSPORT
          </h3>
          <p className="text-xs text-[#111111]/60">
            Select your preferred transit mode. If selected mode is unavailable, SafariX will report it honestly.
          </p>
        </div>

        <div className="space-y-2.5">
          {MODES.map((m) => {
            const isCurrent = m.id === currentMode;
            const isPicked = m.id === currentSelected;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                disabled={isLoading}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isPicked
                    ? "border-[#1F3D2B] bg-[#1F3D2B]/5 ring-1 ring-[#1F3D2B]"
                    : "border-[#111111]/15 bg-white/70 hover:border-[#111111]/30"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#111111]">
                      {m.label}
                    </span>
                    {isCurrent && (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#111111]/10 text-[#111111]/70 font-semibold">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#111111]/60">{m.description}</p>
                </div>
                <div className="pt-0.5">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isPicked ? "border-[#1F3D2B] bg-[#1F3D2B]" : "border-[#111111]/30"
                  }`}>
                    {isPicked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl border border-[#111111]/20 font-mono text-xs uppercase tracking-wider text-[#111111]/70 hover:bg-[#111111]/5 transition-colors disabled:opacity-40"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => onSelectMode(currentSelected)}
            disabled={isLoading || currentSelected === currentMode}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#111111] font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#111111]/85 transition-colors disabled:opacity-40"
          >
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>UPDATING...</span>
              </>
            ) : (
              <span>SWITCH MODE</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 4. CHANGE STAY MODAL
// =============================================================================

export interface StayCandidateItem {
  id: string;
  name: string;
  category: string;
  comfortLevel?: string;
  pricePerNight: number | null;
  rating: number;
  reviewCount: number;
  address: string;
  isSelected?: boolean;
}

interface ChangeStayModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: StayCandidateItem[];
  onSelectStay: (stayId: string) => Promise<void>;
  isLoading: boolean;
  providerStatus?: "available" | "unavailable" | "partial";
  providerError?: string;
}

export function ChangeStayModal({
  isOpen,
  onClose,
  candidates,
  onSelectStay,
  isLoading,
  providerStatus,
  providerError,
}: ChangeStayModalProps) {
  const [selectedStayId, setSelectedStayId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#FAF7F0] border border-[#111111]/15 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#2A9D8F] font-semibold">
            ACCOMMODATIONS POOL
          </span>
          <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#111111]">
            CHANGE STAY
          </h3>
          <p className="text-xs text-[#111111]/60">
            Choose an alternative hotel or sanctuary verified by Stay Agent. Accommodation budgets will recalculate automatically.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {providerStatus === "unavailable" ? (
            <div className="py-8 px-4 rounded-xl border border-amber-300/60 bg-amber-500/[0.05] space-y-2 text-center">
              <span className="font-mono text-xs uppercase font-bold text-amber-900 block">
                ⚠ ACCOMMODATION PROVIDER ACCESS REQUIRED
              </span>
              <p className="text-xs text-[#111111]/80 max-w-md mx-auto leading-relaxed">
                {providerError ||
                  "Live accommodation search is currently unavailable because Duffel Stays access is not enabled on the configured account (requires Duffel sales activation). SafariX does not substitute mock accommodations in production."}
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-[#111111]/50">
              No alternative accommodations available for this destination.
            </div>
          ) : (
            candidates.map((s) => {
              const isSelected = selectedStayId === s.id;
              const isCurrent = s.isSelected;

              return (
                <div
                  key={s.id}
                  onClick={() => !isCurrent && setSelectedStayId(s.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "border-[#2A9D8F] bg-[#2A9D8F]/10 ring-1 ring-[#2A9D8F]"
                      : isCurrent
                      ? "border-[#111111]/20 bg-emerald-50/50 cursor-default"
                      : "border-[#111111]/15 bg-white/70 hover:border-[#111111]/30"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#111111]/10 text-[#111111]/80 font-bold">
                        {s.category}
                      </span>
                      {s.comfortLevel && (
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#2A9D8F]/15 text-[#2A9D8F] font-bold">
                          {s.comfortLevel}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">
                          CURRENTLY SELECTED
                        </span>
                      )}
                    </div>
                    <h4 className="font-display text-base font-bold text-[#111111] truncate">
                      {s.name}
                    </h4>
                    <p className="text-[11px] text-[#111111]/60 truncate">📍 {s.address}</p>
                  </div>

                  <div className="flex items-baseline sm:flex-col sm:items-end justify-between gap-2 shrink-0">
                    <span className="font-mono text-sm font-bold text-[#2A9D8F]">
                      {s.pricePerNight ? `$${s.pricePerNight} / night` : "Free / Rate on Request"}
                    </span>
                    {s.rating > 0 && (
                      <span className="font-mono text-xs text-[#111111]/60">
                        ★ {s.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#111111]/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl border border-[#111111]/20 font-mono text-xs uppercase tracking-wider text-[#111111]/70 hover:bg-[#111111]/5 transition-colors disabled:opacity-40"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => selectedStayId && onSelectStay(selectedStayId)}
            disabled={isLoading || !selectedStayId}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#2A9D8F] font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#2A9D8F]/90 transition-colors disabled:opacity-40"
          >
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>UPDATING STAY...</span>
              </>
            ) : (
              <span>SWITCH TO THIS STAY</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 5. REPLACE ACTIVITY / RESTAURANT ITEM MODAL
// =============================================================================

export interface AlternativeCandidateItem {
  id: string;
  name: string;
  type?: string;
  cuisine?: string[];
  price?: number;
  rating?: number;
  address?: string;
  isSelected?: boolean;
}

interface ReplaceItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemType: "activity" | "restaurant";
  currentTargetName: string;
  candidates: AlternativeCandidateItem[];
  onSelectReplacement: (replacementId?: string) => Promise<void>;
  isLoading: boolean;
}

export function ReplaceItemModal({
  isOpen,
  onClose,
  title,
  itemType,
  currentTargetName,
  candidates,
  onSelectReplacement,
  isLoading,
}: ReplaceItemModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#FAF7F0] border border-[#111111]/15 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="space-y-1">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#F06C5B] font-semibold">
            {itemType === "activity" ? "EXPERIENCE REPLACEMENT" : "DINING REPLACEMENT"}
          </span>
          <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#111111]">
            {title}
          </h3>
          <p className="text-xs text-[#111111]/60">
            Replacing <strong className="text-[#111111]">{currentTargetName}</strong>. Select a verified alternative or let SafariX pick the optimal match.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {candidates.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#111111]/60 space-y-3">
              <p className="leading-relaxed">
                No unassigned alternative attractions or dining venues currently remain in the verified pool for this destination.
              </p>
              <button
                type="button"
                onClick={() => onSelectReplacement()}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl bg-[#111111] text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#1F3D2B] transition-colors"
              >
                ASK AGENT TO AUTO-DISCOVER BEST MATCH →
              </button>
            </div>
          ) : (
            candidates.map((c) => {
              const isSelected = selectedId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "border-[#F06C5B] bg-[#F06C5B]/10 ring-1 ring-[#F06C5B]"
                      : "border-[#111111]/15 bg-white/70 hover:border-[#111111]/30"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.type && (
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#111111]/10 text-[#111111]/80 font-bold">
                          {c.type}
                        </span>
                      )}
                      {c.cuisine && c.cuisine.length > 0 && (
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#1F3D2B]/10 text-[#1F3D2B] font-bold">
                          {c.cuisine[0]}
                        </span>
                      )}
                    </div>
                    <h4 className="font-display text-base font-bold text-[#111111] truncate">
                      {c.name}
                    </h4>
                    {c.address && (
                      <p className="text-[11px] text-[#111111]/60 truncate">📍 {c.address}</p>
                    )}
                  </div>

                  <div className="flex items-baseline sm:flex-col sm:items-end justify-between gap-2 shrink-0">
                    {c.price !== undefined && (
                      <span className="font-mono text-xs font-bold text-[#111111]">
                        {c.price === 0 ? "Free" : `$${c.price}`}
                      </span>
                    )}
                    {c.rating && c.rating > 0 && (
                      <span className="font-mono text-xs text-[#F06C5B]">
                        ★ {c.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#111111]/10">
          <button
            type="button"
            onClick={() => onSelectReplacement()}
            disabled={isLoading}
            className="w-full sm:w-auto font-mono text-xs text-[#1F3D2B] hover:underline font-bold"
          >
            ↺ Let Agent Auto-Select Best Alternative
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-[#111111]/20 font-mono text-xs uppercase tracking-wider text-[#111111]/70 hover:bg-[#111111]/5 transition-colors disabled:opacity-40"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={() => selectedId && onSelectReplacement(selectedId)}
              disabled={isLoading || !selectedId}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#111111] font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-[#111111]/85 transition-colors disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>REPLACING...</span>
                </>
              ) : (
                <span>REPLACE</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 6. EDIT CHANGE PREVIEW BANNER
// =============================================================================

interface EditChangeBannerProps {
  changeSummary: EditChangeSummary;
  onDismiss: () => void;
}

export function EditChangeBanner({ changeSummary, onDismiss }: EditChangeBannerProps) {
  const before = changeSummary.budgetBefore ?? changeSummary.oldBudget ?? 0;
  const after = changeSummary.budgetAfter ?? changeSummary.newBudget ?? 0;
  const budgetDiff = after - before;
  const isDiffPositive = budgetDiff > 0;
  const isDiffZero = budgetDiff === 0;
  const sym = changeSummary.currencySymbol || "$";
  const curr = changeSummary.currency || "USD";

  return (
    <div className="rounded-2xl border border-[#2A9D8F]/30 bg-[#2A9D8F]/10 p-5 space-y-3 text-xs text-[#111111] animate-fadeIn">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-[#2A9D8F] text-white font-mono text-[10px] uppercase font-bold tracking-wider">
              JOURNEY UPDATED
            </span>
            <span className="font-mono text-xs uppercase tracking-wider text-[#111111]/60">
              SCOPE: {changeSummary.scope.toUpperCase()}
            </span>
          </div>
          <p className="font-sans text-sm font-semibold text-[#111111]">
            {changeSummary.description || changeSummary.summary}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-[#111111]/40 hover:text-[#111111] p-1 font-bold text-sm"
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-[#2A9D8F]/20 font-mono text-xs">
        <div>
          <span className="text-[#111111]/50 text-[10px] block">PREVIOUS BUDGET</span>
          <span className="font-bold">
            {sym}
            {before.toLocaleString()} {curr}
          </span>
        </div>
        <div>
          <span className="text-[#111111]/50 text-[10px] block">NEW BUDGET</span>
          <span className="font-bold text-[#2A9D8F]">
            {sym}
            {after.toLocaleString()} {curr}
          </span>
        </div>
        <div>
          <span className="text-[#111111]/50 text-[10px] block">DIFFERENCE</span>
          <span
            className={`font-bold ${isDiffZero ? "text-[#111111]/70" : isDiffPositive ? "text-amber-700" : "text-emerald-700"}`}
          >
            {isDiffZero
              ? "Unchanged"
              : isDiffPositive
              ? `+${sym}${budgetDiff.toLocaleString()} (Added)`
              : `-${sym}${Math.abs(budgetDiff).toLocaleString()} (Saved)`}
          </span>
        </div>
        <div className="ml-auto text-[#111111]/50 text-[10px]">Validated & Persisted</div>
      </div>
    </div>
  );
}

// =============================================================================
// 7. ITINERARY VERSION HISTORY MODAL (PHASE 20)
// =============================================================================

export interface VersionItem {
  id: string;
  tripId: string;
  userId: string;
  versionNumber: number;
  scope: string;
  instruction?: string | null;
  changeSummary?: Record<string, unknown> | null;
  totalCost: number;
  currency: string;
  currencySymbol: string;
  createdAt: string;
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: VersionItem[];
  isLoading: boolean;
  onRestoreVersion: (versionId: string) => Promise<void>;
  isRestoring: boolean;
  currentVersionNumber?: number;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  versions,
  isLoading,
  onRestoreVersion,
  isRestoring,
  currentVersionNumber,
}: VersionHistoryModalProps) {
  const [confirmVersionId, setConfirmVersionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const latestVersionNumber =
    currentVersionNumber ?? (versions.length > 0 ? versions[0].versionNumber : 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#FAF7F0] border border-[#111111]/15 p-6 sm:p-8 space-y-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#111111]/10 pb-4 shrink-0">
          <div className="space-y-1">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#1F3D2B] font-semibold">
              AUDIT TRAIL & RESTORATION
            </span>
            <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#111111]">
              ITINERARY VERSION HISTORY
            </h3>
            <p className="text-xs text-[#111111]/60 font-sans">
              Every plan modification is preserved as an immutable snapshot. You can inspect and restore any previous version.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="text-[#111111]/50 hover:text-[#111111] font-mono text-sm p-1 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto space-y-3.5 pr-1 flex-1">
          {isLoading ? (
            <div className="p-12 text-center space-y-3 font-mono text-xs text-[#111111]/50">
              <span className="inline-block h-5 w-5 rounded-full border-2 border-[#1F3D2B]/30 border-t-[#1F3D2B] animate-spin" />
              <p>Loading version history...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="p-10 text-center rounded-xl border border-dashed border-[#111111]/20 font-mono text-xs text-[#111111]/60">
              No previous version snapshots recorded yet.
            </div>
          ) : (
            versions.map((ver) => {
              const isCurrent = ver.versionNumber === latestVersionNumber;
              const isConfirming = confirmVersionId === ver.id;
              const dateStr = new Date(ver.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              const summaryText =
                (ver.changeSummary?.summary as string) ||
                ver.instruction ||
                (ver.scope === "original" ? "Initial AI journey plan" : "Journey modification");

              return (
                <div
                  key={ver.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isCurrent
                      ? "border-[#1F3D2B] bg-[#1F3D2B]/5 shadow-sm"
                      : "border-[#111111]/15 bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#111111]">
                        VERSION {ver.versionNumber}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-[#1F3D2B] text-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                          CURRENT ACTIVE
                        </span>
                      )}
                      <span className="rounded bg-[#111111]/10 text-[#111111] px-2 py-0.5 font-mono text-[10px] uppercase font-semibold">
                        {ver.scope.replace("_", " ")}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[#111111]/50">{dateStr}</span>
                  </div>

                  <p className="mt-2 text-xs sm:text-sm font-sans text-[#111111] font-medium leading-relaxed">
                    {summaryText}
                  </p>

                  <div className="mt-3 pt-3 border-t border-[#111111]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="font-mono text-xs">
                      <span className="text-[#111111]/50 text-[10px] block uppercase">
                        ESTIMATED TOTAL
                      </span>
                      <span className="font-bold text-[#111111]">
                        {ver.currencySymbol}
                        {ver.totalCost.toLocaleString()}{" "}
                        <span className="text-[10px] font-normal text-[#111111]/60">
                          {ver.currency}
                        </span>
                      </span>
                    </div>

                    {!isCurrent && (
                      <div>
                        {isConfirming ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-amber-800 font-semibold">
                              Restore this version?
                            </span>
                            <button
                              type="button"
                              onClick={() => setConfirmVersionId(null)}
                              disabled={isRestoring}
                              className="px-2.5 py-1 rounded-lg border border-[#111111]/20 font-mono text-[11px] uppercase text-[#111111]/70 hover:bg-[#111111]/5 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await onRestoreVersion(ver.id);
                                setConfirmVersionId(null);
                              }}
                              disabled={isRestoring}
                              className="px-3 py-1 rounded-lg bg-[#1F3D2B] text-white font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-[#1F3D2B]/90 transition-colors disabled:opacity-50"
                            >
                              {isRestoring ? "Restoring..." : "Confirm"}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmVersionId(ver.id)}
                            disabled={isRestoring}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#111111]/20 bg-white font-mono text-[11px] font-bold uppercase tracking-wider text-[#111111] hover:bg-[#111111] hover:text-white transition-all disabled:opacity-40"
                          >
                            <span>↺</span>
                            <span>RESTORE THIS VERSION</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#111111]/10 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isRestoring}
            className="px-5 py-2 rounded-xl bg-[#111111] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#111111]/80 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

