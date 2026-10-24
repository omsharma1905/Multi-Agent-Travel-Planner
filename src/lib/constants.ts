/**
 * @file src/lib/constants.ts
 * Application-wide constants — single source of truth.
 * Brand Name: SafariX
 */

export const APP_NAME = "SafariX" as const;
export const APP_BRAND = "SafariX" as const;
export const APP_TAGLINE = "Travel intelligently." as const;

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Typed route map. */
export const ROUTES = {
  home: "/",
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  dashboard: "/dashboard",
  profile: "/profile",
  trips: {
    new: "/trips/new",
    saved: "/trips/saved",
    completed: "/trips/completed",
    detail: (tripId: string) => `/trips/${tripId}`,
  },
  wishlist: "/wishlist",
  privacy: "/privacy",
  terms: "/terms",
} as const;

/** Navigation links with photography preview. */
export const NAV_LINKS = [
  {
    label: "Home",
    href: ROUTES.home,
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    tag: "OVERVIEW",
  },
  {
    label: "Plan a Journey",
    href: ROUTES.trips.new,
    image:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
    tag: "START TRIP",
  },
  {
    label: "My Journeys",
    href: ROUTES.dashboard,
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    tag: "COLLECTION",
  },
  {
    label: "Saved Journeys",
    href: ROUTES.trips.saved,
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    tag: "SAVED",
  },
  {
    label: "Archived Journeys",
    href: ROUTES.trips.completed,
    image:
      "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80",
    tag: "ARCHIVE",
  },
] as const;

export const NAV_SECONDARY_LINKS = [
  { label: "Profile", href: ROUTES.profile },
  { label: "Settings", href: ROUTES.profile },
] as const;

export const FOOTER_SECTIONS = {
  plan: [
    { label: "Create a Journey", href: ROUTES.trips.new },
    { label: "My Trips", href: ROUTES.dashboard },
    { label: "Wishlist", href: ROUTES.wishlist },
  ],
  explore: [
    { label: "Destinations", href: "#destinations" },
    { label: "About SafariX", href: "#about" },
    { label: "How It Works", href: "#how-it-works" },
  ],
  connect: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "X (Twitter)", href: "https://x.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
  legal: [
    { label: "Privacy Policy", href: ROUTES.privacy },
    { label: "Terms of Service", href: ROUTES.terms },
  ],
} as const;
