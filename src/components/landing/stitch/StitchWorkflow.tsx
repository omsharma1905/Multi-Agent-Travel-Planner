"use client";

interface WorkflowStep {
  step: string;
  title: string;
  narrative: string;
  tag: string;
}

const STEPS: WorkflowStep[] = [
  {
    step: "01",
    title: "Share Your Vision",
    narrative:
      "Whisper your desires: climate preference, quiet retreats, architectural wonders, or culinary dreams.",
    tag: "Natural Voice & Text",
  },
  {
    step: "02",
    title: "Multi-Agent Deep Search",
    narrative:
      "Agents search multi-modal transit options, verified destination intelligence, and handpicked stays simultaneously.",
    tag: "Curated Knowledge Graph",
  },
  {
    step: "03",
    title: "Collaborative Synthesis",
    narrative:
      "Logistical friction is eliminated. Weather anomalies, transfer overlaps, and pacing are vetted autonomously.",
    tag: "Multi-Model Consensus",
  },
  {
    step: "04",
    title: "Validated Itinerary",
    narrative:
      "Receive an interactive, structured itinerary with day-by-day routes, curated stays, and exportable travel plans.",
    tag: "Interactive Synthesis",
  },
];

export function StitchWorkflow() {
  return (
    <section id="methodology" className="w-full px-4 sm:px-6 lg:px-12 py-14 sm:py-20 bg-surface relative scroll-mt-28">
      <div className="max-w-7xl mx-auto flex flex-col gap-12 sm:gap-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-label-md text-xs uppercase tracking-wider text-secondary">
              Intuitive Workflow
            </span>
            <h2 className="font-headline-xl text-3xl sm:text-4xl lg:text-5xl text-on-surface mt-1">
              From impulse to master itinerary
            </h2>
          </div>
          <p className="font-body-md text-sm sm:text-base text-on-surface-variant max-w-sm leading-relaxed">
            A friction-free bridge between human spontaneous desire and verified expedition logistics.
          </p>
        </div>

        {/* 4-Step Process Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((stepItem) => (
            <div
              key={stepItem.step}
              className="p-6 rounded-2xl bg-surface-container-low border border-white/5 flex flex-col gap-5 relative group hover:bg-surface-container hover:border-white/10 transition-all duration-300 shadow-md"
            >
              <div className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center font-headline-md text-xl text-secondary group-hover:scale-105 transition-transform">
                {stepItem.step}
              </div>

              <div className="flex flex-col gap-2 flex-1">
                <h3 className="font-title-lg text-lg text-on-surface font-semibold group-hover:text-primary transition-colors">
                  {stepItem.title}
                </h3>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {stepItem.narrative}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5">
                <span className="font-label-sm text-[11px] text-tertiary font-medium">
                  {stepItem.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
