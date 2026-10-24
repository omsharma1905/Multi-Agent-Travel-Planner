import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export function FinalCTA() {
  return (
    <section
      id="final-cta"
      className="relative min-h-[36vh] sm:min-h-[40vh] flex items-center justify-center overflow-hidden bg-[#082D23] px-6 py-12 sm:px-10 sm:py-16 text-center border-t border-[#104735]/60"
      aria-labelledby="final-cta-heading"
    >
      {/* Warm sunset coastal horizon photograph */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=85"
          alt="Warm sunset coastal travel horizon"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#082D23] via-[#082D23]/70 to-black/60" />
      </div>

      {/* Center Content */}
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 backdrop-blur-md border border-white/20">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F06C5B]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-[#F3F0E6]">
            COMMENCE EXPEDITION
          </span>
        </div>

        <h2
          id="final-cta-heading"
          className="mt-4 font-display text-[clamp(2.2rem,5vw,4.25rem)] font-bold uppercase leading-[1.02] tracking-tight text-[#F3F0E6]"
        >
          <span>WHERE WILL </span>
          <br className="hidden sm:inline" />
          <span className="font-serif italic font-normal text-[#DDE8DA] lowercase">you explore next?</span>
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm sm:text-base font-normal text-[#F3F0E6]/80 leading-relaxed">
          Tell SafariX where you want to go. We&apos;ll synthesize the entire journey around your rhythm.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href={ROUTES.trips.new}
            className="group inline-flex items-center gap-2.5 rounded-full bg-[#F3F0E6] hover:bg-white text-[#082D23] px-7 sm:px-8 py-3.5 text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.16em] shadow-xl shadow-black/40 transition-all duration-300 hover:scale-[1.02]"
          >
            <span>PLAN MY JOURNEY</span>
            <span
              className="transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
