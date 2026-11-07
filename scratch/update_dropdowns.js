const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/landing/stitch/StitchTripPlannerConsole.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the section for party size and tier selectors
const startMarker = '        {/* Party Size & Tier Row */}';
const endMarker = '        {/* Action Button */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found!");
  process.exit(1);
}

const replacement = `        {/* Party Size & Tier Row */}
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
        </div>\r\n\r\n`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated StitchTripPlannerConsole.tsx dropdowns!");
