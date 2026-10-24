import Image from "next/image";

export function WhatWeDo() {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-[#F8F5EE] text-[#171A18] px-6 py-20 sm:px-10 sm:py-32 lg:px-16"
      aria-labelledby="what-we-do-heading"
    >
      <div id="what-we-do" className="absolute -top-24 left-0" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Editorial Section Header */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.22em] text-[#1F3D2B]">
            <span>02 // THE FOUNDATION</span>
          </div>

          <h2
            id="what-we-do-heading"
            className="mt-4 font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-bold uppercase leading-[0.98] tracking-tight text-[#171A18]"
          >
            <span>TELL US WHERE.</span>
            <br />
            <span className="font-serif italic font-normal text-[#171A18]/80">
              WE&apos;LL HARMONIZE THE REST.
            </span>
          </h2>

          <p className="mt-5 text-base sm:text-lg font-normal leading-relaxed text-[#5C625E] max-w-xl">
            Tell SafariX your destination, timing, budget tier, and travel passions. Our multi-agent intelligence maps out every transit leg, lodging, dining, and cultural experience into a cohesive living plan.
          </p>
        </div>

        {/* Asymmetric composition: Large travel image with editorial floating annotations */}
        <div className="mt-14 sm:mt-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Main Visual with floating annotations (8 cols) */}
          <div className="lg:col-span-8 relative">
            <div className="relative h-[440px] sm:h-[580px] w-full overflow-hidden rounded-2xl shadow-xl border border-black/5">
              <Image
                src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1800&q=85"
                alt="Tokyo street and vibrant horizon"
                fill
                sizes="(max-width: 1024px) 100vw, 65vw"
                className="object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>

            {/* Editorial Annotation: Destination (Top Left) */}
            <div className="absolute top-3 left-3 sm:-top-5 sm:-left-4 rounded-xl bg-white/95 px-4 py-3 sm:px-5 sm:py-4 shadow-xl border border-black/5 backdrop-blur-md">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#1F3D2B] font-semibold">
                DESTINATION SPOTLIGHT
              </span>
              <p className="mt-0.5 font-display text-base sm:text-lg font-bold text-[#171A18]">
                Tokyo, Japan
              </p>
            </div>

            {/* Editorial Annotation: Budget & Travellers (Bottom Right) */}
            <div className="absolute bottom-3 right-3 sm:-bottom-5 sm:-right-4 rounded-xl bg-[#171A18]/95 px-4 py-3 sm:px-6 sm:py-5 shadow-2xl text-white backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#E5A83B]">
                SYNTHESIZED DOSSIER
              </span>
              <p className="mt-1 font-display text-lg sm:text-xl font-bold text-[#F8F5EE]">
                ₹1,50,000
              </p>
              <div className="mt-1 flex items-center gap-2.5 text-xs text-[#E3EBE4]/80 font-mono">
                <span>8 days</span>
                <span>·</span>
                <span>2 travellers</span>
                <span>·</span>
                <span className="text-[#D8E4DA]">Comfort Tier</span>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Parameter Annotations (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="rounded-2xl bg-white p-6 border border-black/5 shadow-xs">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#E0604E]">
                CURATED PASSIONS
              </span>
              <h3 className="mt-2 font-display text-lg font-bold text-[#171A18]">
                Food · Culture · Heritage
              </h3>
              <p className="mt-1.5 text-sm text-[#5C625E] leading-relaxed">
                From morning temple courtyards to evening alley counters, activities balance energetic discovery with spacious pauses.
              </p>
            </div>

            <div className="rounded-2xl bg-[#1F3D2B] text-white p-6 shadow-md border border-white/10">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#D8E4DA]">
                FEASIBILITY-CHECKED TRANSIT
              </span>
              <h3 className="mt-2 font-display text-lg font-bold text-white">
                Coordinated Rail & Air Links
              </h3>
              <p className="mt-1.5 text-sm text-[#E3EBE4]/85 leading-relaxed">
                Realistic transfer buffers, authentic schedules, and zero impossible multi-city commutes.
              </p>
            </div>

            <div className="rounded-2xl bg-[#E3EBE4]/60 p-5 border border-[#52795D]/20">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#1F3D2B]">
                DETERMINISTIC VALIDATION
              </span>
              <p className="mt-1 text-xs text-[#5C625E] leading-relaxed">
                Every suggested plan is vetted against geographic feasibility and transparent budget arithmetic.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
