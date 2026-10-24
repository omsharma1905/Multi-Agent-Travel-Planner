import Link from "next/link";
import { APP_BRAND, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  markOnly?: boolean;
  markSize?: number;
  textColor?: string;
}

/**
 * The SafariX Brand Symbol:
 * An architectural waypoint chevron intersecting a clean horizon baseline.
 * Directional, memorable, and renders cleanly down to 16px.
 */
export function SafariXMark({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-300 group-hover:scale-105", className)}
      aria-hidden="true"
    >
      {/* Precision architectural route chevron + horizon vector */}
      <path
        d="M2.5 17.5H9L14 4.5L19 17.5H21.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="4.5" r="1.5" fill="#F06C5B" />
    </svg>
  );
}

// Backward-compatible alias for existing imports
export const VeoraMark = SafariXMark;

export function Logo({
  className,
  markOnly = false,
  markSize = 20,
  textColor = "text-[#F3F0E6]",
}: LogoProps) {
  return (
    <Link
      href={ROUTES.home}
      className={cn(
        "group inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#104735]",
        className,
      )}
      aria-label={`${APP_BRAND} Home`}
    >
      <SafariXMark size={markSize} className={textColor} />
      {!markOnly && (
        <span
          className={cn(
            "font-display text-sm sm:text-base font-bold tracking-[0.24em]",
            textColor,
          )}
        >
          {APP_BRAND}
        </span>
      )}
    </Link>
  );
}
