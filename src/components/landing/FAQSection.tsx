"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How does SafariX multi-agent planning work?",
    a: "SafariX uses 6 specialized AI agents (Transportation, Stay, Activities, Food, Budget, and Itinerary) working collaboratively. Rather than hallucinating a generic itinerary, each agent fetches real geographic data, evaluates genuine provider options, and passes its recommendations to a deterministic validator that verifies feasibility.",
  },
  {
    q: "Are the travel costs, durations, and routes verified?",
    a: "Yes. SafariX queries genuine provider data for transit durations, hotel prices, and location coordinates. If a flight route is unavailable or a hotel is fully booked, our system reports it honestly rather than fabricating fake travel confirmations.",
  },
  {
    q: "Can I customize or change items in my itinerary?",
    a: "Completely. SafariX features fine-grained journey editing. You can replace an individual restaurant or attraction with vetted alternatives, switch transport modes from air to high-speed rail, regenerate an entire single day, or give natural-language instructions like 'make it cheaper' or 'prioritize quiet beaches.'",
  },
  {
    q: "Does SafariX process payments directly?",
    a: "No. SafariX is an intelligent travel architect. We generate comprehensive, verified itineraries and provide direct booking and exploration links (including Google Maps navigation, airline search, and official hotel portals) so you remain in total control of your reservations.",
  },
];

export function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-[#F3F0E6] text-[#104735] px-6 py-16 sm:px-10 sm:py-24 lg:px-16 border-b border-[#104735]/15"
      aria-labelledby="faq-heading"
    >
      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-left mb-12 sm:mb-16">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#104735] mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F06C5B]" />
            <span>CLARITY & ASSURANCE // TRAVEL INQUIRIES</span>
          </div>

          <h2
            id="faq-heading"
            className="font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-bold uppercase tracking-tight text-[#082D23] leading-[1.02]"
          >
            Frequently answered <br />
            <span className="font-serif italic font-normal text-[#104735] lowercase tracking-normal">
              questions.
            </span>
          </h2>
          <p className="mt-3 text-sm text-[#52645A] font-normal leading-relaxed">
            Everything you need to know about SafariX&apos;s cooperative multi-agent architecture and planning contracts.
          </p>
        </div>

        {/* Clean Typographic Accordion with Thin Dividers */}
        <div className="border-t border-[#104735]/15 divide-y divide-[#104735]/15">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className="py-5 sm:py-6 transition-colors">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#104735] group"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-base sm:text-lg font-bold uppercase tracking-tight text-[#082D23] pr-4 group-hover:text-[#104735] transition-colors">
                    {faq.q}
                  </span>
                  <span
                    className={`shrink-0 h-6 w-6 rounded-full border border-[#104735]/30 flex items-center justify-center font-mono text-sm text-[#F06C5B] transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>

                {isOpen && (
                  <div className="pt-3 pr-8 text-xs sm:text-sm text-[#3D4E44] leading-relaxed font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
