"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { StitchIcon } from "./StitchIcon";

interface StitchTripPlannerConsoleProps {
  className?: string;
  variant?: "desktop" | "mobile";
}

const DESTINATIONS = [
  "Ha Long Bay, Vietnam",
  "Kyoto, Japan",
  "Dolomites, Italy",
  "Serengeti, Tanzania",
  "Reykjavik, Iceland",
  "Patagonia, Chile",
];

const TIERS = [
  {
    label: "Eco-Luxe ($5k+)",
    value: "luxury",
    tagline: "Eco-sanctuaries, private tenders & guided caving",
    badge: "Curated",
  },
  {
    label: "Comfort Explorer ($2k+)",
    value: "moderate",
    tagline: "Boutique retreats & scenic panoramic transfers",
    badge: "Balanced",
  },
  {
    label: "Signature Sovereign ($10k+)",
    value: "luxury",
    tagline: "Private estates, charter aviation & 24/7 concierge",
    badge: "Elite",
  },
];

const GUESTS_OPTIONS = [
  { label: "1 Adventurer", subtitle: "Solo bespoke expedition", icon: "person" },
  { label: "2 Adventurers", subtitle: "Couple or companion voyage", icon: "group" },
  { label: "4 Adventurers", subtitle: "Family or small delegation", icon: "group" },
  { label: "Private Group (6+)", subtitle: "Exclusive private charter cohort", icon: "group" },
];

export function StitchTripPlannerConsole({ className, variant = "desktop" }: StitchTripPlannerConsoleProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"holiday" | "flight" | "hotels">("holiday");
  const [destination, setDestination] = useState("Ha Long Bay, Vietnam");
  const [departureDate, setDepartureDate] = useState("2026-11-14");
  const [returnDate, setReturnDate] = useState("2026-11-22");
  const [partySize, setPartySize] = useState("2 Adventurers");
  const [tier, setTier] = useState("Eco-Luxe ($5k+)");

  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destDropdownRef = useRef<HTMLDivElement>(null);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const tierDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside and Escape key handler for clean dismissal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(target)) {
        setShowPartyDropdown(false);
      }
      if (tierDropdownRef.current && !tierDropdownRef.current.contains(target)) {
        setShowTierDropdown(false);
      }
      if (destDropdownRef.current && !destDropdownRef.current.contains(target)) {
        setShowDestDropdown(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPartyDropdown(false);
        setShowTierDropdown(false);
        setShowDestDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const parsedGuests = partySize.replace(/[^0-9]/g, "") || "2";

    const params = new URLSearchParams({
      destination: destination.trim(),
      departure: departureDate,
      return: returnDate,
      partySize: parsedGuests,
      travelers: parsedGuests,
      tier,
      type: activeTab,
    });

    router.push(`${ROUTES.trips.new}?${params.toString()}`);
  };

  const isLightGlass = variant === "desktop";
  const isAnyDropdownOpen = showPartyDropdown || showTierDropdown || showDestDropdown;

  return (
    <div
      className={cn(
        "w-full transition-all duration-300 relative",
        isAnyDropdownOpen ? "z-50" : "z-20",
        isLightGlass
          ? "bg-[#fbfbfa] text-neutral-900 rounded-2xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4),0_10px_20px_-5px_rgba(0,0,0,0.2)] border border-white/60"
          : "bg-surface-container text-on-surface rounded-2xl p-5 shadow-xl border border-white/5",
        className,
      )}
    >
      {/* Header & Status Indicator */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2
            className={cn(
              "font-headline-md tracking-tight leading-snug",
              isLightGlass ? "text-neutral-900 text-xl sm:text-2xl" : "text-on-surface text-lg sm:text-xl",
            )}
          >
            {isLightGlass ? "Plan your bespoke journey" : "Find the best place"}
          </h2>
          <p className={cn("font-label-md text-xs", isLightGlass ? "text-neutral-500" : "text-on-surface-variant")}>
            Autonomous multi-agent orchestration
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide",
            isLightGlass ? "bg-neutral-100 text-neutral-800" : "bg-surface-container-high text-primary",
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          4-Agent Architecture
        </span>
      </div>

      {/* Segmented Tab Selector */}
      <div
        className={cn(
          "grid grid-cols-3 p-1 rounded-full mb-3",
          isLightGlass ? "bg-neutral-100" : "bg-surface-container-low",
        )}
        role="tablist"
      >
        <button
          type="button"
          onClick={() => setActiveTab("holiday")}
          className={cn(
            "py-2 px-3 rounded-full text-xs font-semibold transition-all text-center flex items-center justify-center gap-1",
            activeTab === "holiday"
              ? isLightGlass
                ? "bg-white text-neutral-900 shadow-sm"
                : "bg-primary-container text-primary-fixed shadow-sm"
              : isLightGlass
              ? "text-neutral-500 hover:text-neutral-900"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <span>Holiday</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("flight")}
          className={cn(
            "py-2 px-3 rounded-full text-xs font-semibold transition-all text-center flex items-center justify-center gap-1",
            activeTab === "flight"
              ? isLightGlass
                ? "bg-white text-neutral-900 shadow-sm"
                : "bg-primary-container text-primary-fixed shadow-sm"
              : isLightGlass
              ? "text-neutral-500 hover:text-neutral-900"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <span>Flight</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hotels")}
          className={cn(
            "py-2 px-3 rounded-full text-xs font-semibold transition-all text-center flex items-center justify-center gap-1",
            activeTab === "hotels"
              ? isLightGlass
                ? "bg-white text-neutral-900 shadow-sm"
                : "bg-primary-container text-primary-fixed shadow-sm"
              : isLightGlass
              ? "text-neutral-500 hover:text-neutral-900"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          <span>Hotels</span>
        </button>
      </div>

      {/* Scope & Honest Capability Note per Tab */}
      <div
        className={cn(
          "text-[11px] leading-relaxed p-2.5 rounded-lg mb-3 border",
          isLightGlass
            ? "bg-neutral-50 text-neutral-600 border-neutral-200/70"
            : "bg-surface-container-low text-on-surface-variant border-white/5",
        )}
      >
        {activeTab === "holiday" && (
          <span>
            ✦ <strong>Full Expedition</strong>: Synthesizes complete multimodal routes, handpicked stays, activities, and dining.
          </span>
        )}
        {activeTab === "flight" && (
          <span>
            ✦ <strong>Aviation &amp; Transit Search</strong>: SafariX compares commercial and charter routes. Ticketing is finalized directly with airline partners.
          </span>
        )}
        {activeTab === "hotels" && (
          <span>
            ✦ <strong>Sanctuaries &amp; Stays Search</strong>: SafariX curates eco-lodges and boutique estates. Bookings are confirmed directly with hosts.
          </span>
        )}
      </div>

      {/* Interactive Form */}
      <form action="javascript:void(0);" onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Destination Field with Autocomplete */}
        <div ref={destDropdownRef} className="relative flex flex-col gap-1">
          <label
            htmlFor="planner-destination-input"
            className={cn(
              "font-label-md text-[11px] uppercase tracking-wider font-semibold",
              isLightGlass ? "text-neutral-500" : "text-on-surface-variant",
            )}
          >
            Destination
          </label>
          <div
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 min-h-[46px] rounded-xl transition-all",
              isLightGlass
                ? "bg-white hover:bg-neutral-50/80 border border-neutral-200 focus-within:border-[#0E2A24]/40 focus-within:ring-2 focus-within:ring-[#0E2A24]/10 shadow-sm"
                : "bg-surface-container-low border border-white/5 focus-within:border-primary/40",
            )}
          >
            <StitchIcon
              name="public"
              className={cn("w-[18px] h-[18px] flex-shrink-0", isLightGlass ? "text-[#0E2A24]/70" : "text-primary")}
            />
            <input
              id="planner-destination-input"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onFocus={() => setShowDestDropdown(true)}
              placeholder="e.g. Ha Long Bay, Kyoto, Dolomites"
              className={cn(
                "w-full bg-transparent font-title-md text-sm outline-none",
                isLightGlass ? "text-neutral-900 placeholder:text-neutral-400" : "text-on-surface placeholder:text-outline",
              )}
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showDestDropdown && (
            <div
              className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl shadow-[0_16px_36px_-6px_rgba(14,42,36,0.18),0_4px_12px_rgba(14,42,36,0.08)] z-50 border border-[#DCE5DF] bg-[#FBFBFA] text-[#0E2A24] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-[0.98] motion-safe:slide-in-from-top-1.5 duration-200"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#64736D] px-3 py-1.5 block">
                SUGGESTED EXPEDITIONS
              </span>
              {DESTINATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onMouseDown={() => {
                    setDestination(d);
                    setShowDestDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-medium rounded-xl flex items-center gap-2.5 transition-colors hover:bg-[#F1F5F1] text-[#0E2A24]"
                >
                  <StitchIcon name="location_on" className="w-3.5 h-3.5 opacity-80 flex-shrink-0 text-[#D4AF37]" />
                  <span>{d}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Row */}
        <div className="flex flex-col gap-1">
          <label
            className={cn(
              "font-label-md text-[11px] uppercase tracking-wider font-semibold",
              isLightGlass ? "text-neutral-500" : "text-on-surface-variant",
            )}
          >
            Travel Period
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 min-h-[46px] rounded-xl border transition-all",
                isLightGlass
                  ? "bg-white hover:bg-neutral-50/80 border-neutral-200 focus-within:border-[#0E2A24]/40 focus-within:ring-2 focus-within:ring-[#0E2A24]/10 shadow-sm"
                  : "bg-surface-container-low border-white/5",
              )}
            >
              <StitchIcon
                name="calendar_today"
                className={cn("w-4 h-4 flex-shrink-0", isLightGlass ? "text-[#0E2A24]/70" : "text-primary")}
              />
              <input
                aria-label="Departure Date"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className={cn(
                  "bg-transparent text-xs font-medium outline-none w-full min-w-0",
                  isLightGlass ? "text-neutral-800" : "text-on-surface",
                )}
              />
            </div>

            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 min-h-[46px] rounded-xl border transition-all",
                isLightGlass
                  ? "bg-white hover:bg-neutral-50/80 border-neutral-200 focus-within:border-[#0E2A24]/40 focus-within:ring-2 focus-within:ring-[#0E2A24]/10 shadow-sm"
                  : "bg-surface-container-low border-white/5",
              )}
            >
              <StitchIcon
                name="event_available"
                className={cn("w-4 h-4 flex-shrink-0", isLightGlass ? "text-[#0E2A24]/70" : "text-primary")}
              />
              <input
                aria-label="Return Date"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className={cn(
                  "bg-transparent text-xs font-medium outline-none w-full min-w-0",
                  isLightGlass ? "text-neutral-800" : "text-on-surface",
                )}
              />
            </div>
          </div>
        </div>

        {/* Party Size & Tier Row */}
        <div className="grid grid-cols-2 gap-2 relative z-30">
          {/* Party Size Selector */}
          <div ref={partyDropdownRef} className="relative flex flex-col gap-1">
            <label
              className="font-label-md text-[11px] uppercase tracking-wider font-semibold text-neutral-500"
            >
              Party Size
            </label>
            <button
              type="button"
              aria-label="Select party size"
              aria-expanded={showPartyDropdown}
              onClick={() => {
                setShowPartyDropdown(!showPartyDropdown);
                setShowTierDropdown(false);
                setShowDestDropdown(false);
              }}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 min-h-[46px] rounded-xl border text-left transition-all",
                showPartyDropdown
                  ? "bg-[#FBFBFA] border-[#D4AF37] ring-2 ring-[#D4AF37]/25 shadow-sm text-[#0E2A24]"
                  : "bg-[#FBFBFA] hover:bg-[#F1F5F1] border-[#DCE5DF] shadow-sm text-[#0E2A24] hover:border-[#0E2A24]/30"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <StitchIcon
                  name="group"
                  className="w-4 h-4 flex-shrink-0 text-[#0E2A24]"
                />
                <span className="text-xs font-semibold truncate text-[#0E2A24]">{partySize}</span>
              </div>
              <StitchIcon
                name="expand_more"
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-transform duration-200",
                  showPartyDropdown ? "rotate-180 text-[#D4AF37]" : "text-[#64736D]"
                )}
              />
            </button>

            {showPartyDropdown && (
              <div
                className="absolute top-full left-0 w-[calc(200%+0.5rem)] sm:w-[280px] max-h-[min(380px,65vh)] overflow-y-auto mt-1.5 p-1.5 rounded-2xl shadow-[0_16px_36px_-6px_rgba(14,42,36,0.18),0_4px_12px_rgba(14,42,36,0.08)] z-50 border border-[#DCE5DF] bg-[#FBFBFA] text-[#0E2A24] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-[0.98] motion-safe:slide-in-from-top-1.5 duration-200"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#64736D] px-3 py-1.5 block">
                  EXPEDITION CADRE
                </span>
                {GUESTS_OPTIONS.map((opt) => {
                  const isSelected = partySize === opt.label;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      data-testid="party-option"
                      onClick={() => {
                        setPartySize(opt.label);
                        setShowPartyDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 min-h-[48px] rounded-xl flex items-center justify-between transition-all group my-0.5",
                        isSelected
                          ? "bg-[#EAF2ED] text-[#0E2A24] font-semibold"
                          : "hover:bg-[#F1F5F1] text-[#0E2A24]"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                            isSelected
                              ? "bg-[#0E2A24] text-[#D4AF37] shadow-sm"
                              : "bg-[#F1F5F1] text-[#64736D] group-hover:text-[#0E2A24]"
                          )}
                        >
                          <StitchIcon name={opt.icon} className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold leading-tight text-[#0E2A24]">{opt.label}</span>
                          <span className="text-[11px] text-[#64736D] font-normal leading-tight mt-0.5">
                            {opt.subtitle}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#D4AF37]/15 flex items-center justify-center flex-shrink-0">
                          <StitchIcon name="check" className="w-3.5 h-3.5 text-[#D4AF37]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tier Selector */}
          <div ref={tierDropdownRef} className="relative flex flex-col gap-1">
            <label
              className="font-label-md text-[11px] uppercase tracking-wider font-semibold text-neutral-500"
            >
              Tier
            </label>
            <button
              type="button"
              aria-label="Select luxury tier"
              aria-expanded={showTierDropdown}
              onClick={() => {
                setShowTierDropdown(!showTierDropdown);
                setShowPartyDropdown(false);
                setShowDestDropdown(false);
              }}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 min-h-[46px] rounded-xl border text-left transition-all",
                showTierDropdown
                  ? "bg-[#FBFBFA] border-[#D4AF37] ring-2 ring-[#D4AF37]/25 shadow-sm text-[#0E2A24]"
                  : "bg-[#FBFBFA] hover:bg-[#F1F5F1] border-[#DCE5DF] shadow-sm text-[#0E2A24] hover:border-[#0E2A24]/30"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <StitchIcon name="diamond" className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <span className="text-xs font-semibold truncate text-[#0E2A24]">{tier}</span>
              </div>
              <StitchIcon
                name="expand_more"
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-transform duration-200",
                  showTierDropdown ? "rotate-180 text-[#D4AF37]" : "text-[#64736D]"
                )}
              />
            </button>

            {showTierDropdown && (
              <div
                className="absolute top-full right-0 w-[calc(200%+0.5rem)] sm:w-[340px] max-h-[min(380px,65vh)] overflow-y-auto mt-1.5 p-1.5 rounded-2xl shadow-[0_16px_36px_-6px_rgba(14,42,36,0.18),0_4px_12px_rgba(14,42,36,0.08)] z-50 border border-[#DCE5DF] bg-[#FBFBFA] text-[#0E2A24] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-[0.98] motion-safe:slide-in-from-top-1.5 duration-200"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#64736D] px-3 py-1.5 block">
                  EXPEDITION LUXURY TIER
                </span>
                {TIERS.map((t) => {
                  const isSelected = tier === t.label;
                  const isEcoLuxe = t.label.includes("Eco-Luxe");
                  const isComfort = t.label.includes("Comfort");

                  return (
                    <button
                      key={t.label}
                      type="button"
                      data-testid="tier-option"
                      onClick={() => {
                        setTier(t.label);
                        setShowTierDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left p-3 min-h-[52px] rounded-xl flex items-start justify-between transition-all group my-0.5",
                        isSelected
                          ? "bg-[#EAF2ED] text-[#0E2A24] font-semibold"
                          : "hover:bg-[#F1F5F1] text-[#0E2A24]"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 transition-colors flex-shrink-0",
                            isSelected
                              ? "bg-[#0E2A24] text-[#D4AF37] shadow-sm"
                              : "bg-[#F1F5F1] text-[#64736D] group-hover:text-[#0E2A24]"
                          )}
                        >
                          <StitchIcon name="diamond" className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold leading-tight text-[#0E2A24]">{t.label}</span>
                            {t.badge && (
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[9px] uppercase font-mono font-bold tracking-wider",
                                  isEcoLuxe
                                    ? "bg-[#D4AF37]/20 text-[#0E2A24] border border-[#D4AF37]/40"
                                    : isComfort
                                    ? "bg-[#EAF2ED] text-[#0E2A24] border border-[#DCE5DF]"
                                    : "bg-[#0E2A24] text-[#D4AF37] border border-[#D4AF37]/50"
                                )}
                              >
                                {t.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#64736D] font-normal leading-relaxed mt-1 block">
                            {t.tagline}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#D4AF37]/15 flex items-center justify-center flex-shrink-0 mt-1">
                          <StitchIcon name="check" className="w-3.5 h-3.5 text-[#D4AF37]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "mt-2 w-full py-3.5 px-6 min-h-[48px] rounded-full font-title-md text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]",
            isLightGlass
              ? "bg-neutral-950 text-white hover:bg-neutral-800"
              : "bg-secondary text-on-secondary-container hover:bg-secondary-fixed shadow-[0_8px_20px_rgba(233,195,73,0.25)]",
          )}
        >
          {isSubmitting ? (
            <>
              <StitchIcon name="refresh" className="w-5 h-5 animate-spin" />
              <span>Synthesizing Agents...</span>
            </>
          ) : (
            <>
              <StitchIcon name="psychology" className="w-5 h-5 text-secondary" />
              <span>Explore Journey with SafariX AI</span>
              <StitchIcon name="arrow_forward" className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer Verification Indicator */}
      <div className="mt-3 pt-2.5 flex flex-col items-center justify-center gap-1 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <StitchIcon name="auto_awesome" className="w-4 h-4 text-secondary flex-shrink-0" />
          <span
            className={cn(
              "font-label-sm text-[11px]",
              isLightGlass ? "text-neutral-500" : "text-on-surface-variant/80",
            )}
          >
            Autonomous multi-agent orchestration · Verified travel intelligence
          </span>
        </div>
        <p
          className={cn(
            "text-[10px] leading-tight text-center max-w-sm",
            isLightGlass ? "text-neutral-500" : "text-on-surface-variant/70",
          )}
        >
          SafariX coordinates routes & stays. Bookings finalized with licensed partners.
        </p>
      </div>
    </div>
  );
}
