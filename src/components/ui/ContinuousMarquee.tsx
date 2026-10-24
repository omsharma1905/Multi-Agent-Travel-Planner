import { cn } from "@/lib/utils";

interface MarqueeRowProps {
  items: string[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  className?: string;
  itemClassName?: string;
  separator?: string;
}

const speedClasses = {
  left: {
    fast: "animate-marquee-left-fast",
    normal: "animate-marquee-left",
    slow: "animate-marquee-left-slow",
  },
  right: {
    fast: "animate-marquee-right-fast",
    normal: "animate-marquee-right",
    slow: "animate-marquee-right-slow",
  },
};

export function MarqueeRow({
  items,
  direction = "left",
  speed = "normal",
  className,
  itemClassName,
  separator = "—",
}: MarqueeRowProps) {
  const animClass = speedClasses[direction][speed];

  return (
    <div className={cn("marquee-container relative overflow-hidden py-1 sm:py-2", className)}>
      {/* Primary track */}
      <div className={cn("marquee-track flex shrink-0 items-center gap-8 sm:gap-14", animClass)}>
        {items.map((text, idx) => (
          <span
            key={`a-${idx}`}
            className={cn("inline-flex items-center gap-8 sm:gap-14 whitespace-nowrap", itemClassName)}
          >
            <span>{text}</span>
            {separator && <span className="opacity-30 select-none">{separator}</span>}
          </span>
        ))}
      </div>

      {/* Duplicate track for seamless infinite continuity */}
      <div
        className={cn("marquee-track flex shrink-0 items-center gap-8 sm:gap-14", animClass)}
        aria-hidden="true"
      >
        {items.map((text, idx) => (
          <span
            key={`b-${idx}`}
            className={cn("inline-flex items-center gap-8 sm:gap-14 whitespace-nowrap", itemClassName)}
          >
            <span>{text}</span>
            {separator && <span className="opacity-30 select-none">{separator}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ContinuousMarquee() {
  const layer1 = ["DISCOVER", "EXPLORE", "WANDER", "IMMERSE", "EXPEDITIONS", "JOURNEY", "DISCOVER"];
  const layer2 = [
    "TOKYO",
    "KYOTO",
    "BALI",
    "ICELAND",
    "LISBON",
    "LADAKH",
    "OSAKA",
    "PATAGONIA",
    "AMALFI",
    "OAXACA",
  ];
  const layer3 = [
    "GO FARTHER",
    "STAY LONGER",
    "SEE MORE",
    "LIVE DEEPLY",
    "TRAVEL INTELLIGENTLY",
    "GO FARTHER",
    "STAY LONGER",
  ];

  return (
    <section
      id="continuous-marquee"
      className="relative overflow-hidden bg-[#082D23] text-[#F3F0E6] py-6 sm:py-9 border-y border-[#104735]/60"
      aria-label="Continuous Travel Marquee"
    >
      <div className="relative flex flex-col gap-1.5 sm:gap-2">
        {/* Layer 1: Leftward clean bold display sans in warm ivory */}
        <MarqueeRow
          items={layer1}
          direction="left"
          speed="normal"
          separator="—"
          itemClassName="font-display text-[clamp(2.25rem,6vw,5rem)] font-bold uppercase tracking-tight text-[#F3F0E6]"
        />

        {/* Layer 2: Rightward destination ribbon with signature coral accent typography */}
        <MarqueeRow
          items={layer2}
          direction="right"
          speed="fast"
          separator="✦"
          className="border-y border-white/10 py-1.5 sm:py-2 bg-black/20"
          itemClassName="font-mono text-[clamp(0.95rem,2.2vw,1.65rem)] font-bold uppercase tracking-[0.25em] text-[#F06C5B]"
        />

        {/* Layer 3: Leftward editorial italic philosophy in pale sage */}
        <MarqueeRow
          items={layer3}
          direction="left"
          speed="slow"
          separator="/"
          itemClassName="font-serif text-[clamp(1.75rem,4.5vw,3.75rem)] italic font-light tracking-tight text-[#DDE8DA]/85"
        />
      </div>
    </section>
  );
}
