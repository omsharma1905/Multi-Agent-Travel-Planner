/**
 * @file src/lib/design-tokens.ts
 *
 * Centralized Design Tokens for the SafariX Travel Product.
 *
 * Core Principle:
 * EDITORIAL TRAVEL PRODUCT + INTELLIGENT TRIP PLANNER + MODERN TRAVEL APPLICATION.
 * Palette with strict semantic meaning.
 */

export const PALETTE = {
  ink: "#171A18",
  charcoal: "#171A18",
  warmIvory: "#F8F5EE",
  cream: "#EFECE3",
  forest: "#1F3D2B", // Primary action / brand signature
  forestDeep: "#14281C",
  sage: "#52795D", // Foliage green / badges
  sageLight: "#E3EBE4",
  sageBadge: "#D8E4DA",
  safarixBlue: "#1F3D2B", // Mapped to forest for unified design system
  veoraBlue: "#1F3D2B", // Backward compatibility alias
  coral: "#E0604E", // Terracotta sunset accent
  naturalGreen: "#1F3D2B", // Confirmed / completed / success
  amber: "#E5A83B", // Warm gold / pending / notice
  mutedGray: "#5C625E",
  subtleBorder: "rgba(23, 26, 24, 0.10)",
  strongBorder: "rgba(23, 26, 24, 0.22)",
} as const;

export const SEMANTIC = {
  // Destructive actions: restrained danger terracotta
  danger: {
    text: "#C53030",
    hoverBg: "#FFF5F5",
    border: "rgba(197, 48, 48, 0.3)",
    solidBg: "#C53030",
    solidHover: "#9B2C2C",
  },
  // Wishlist & Bookmark actions: Forest & Sage
  wishlist: {
    text: "#1F3D2B",
    hoverBg: "#E3EBE4",
    border: "rgba(31, 61, 43, 0.3)",
    solidBg: "#1F3D2B",
    solidHover: "#14281C",
  },
} as const;

export const TYPOGRAPHY = {
  display: "font-display font-bold uppercase tracking-tight",
  editorialAccent: "font-serif italic font-normal",
  uiHeading: "font-display font-semibold tracking-tight",
  uiLabel: "font-mono text-xs uppercase tracking-[0.2em]",
  uiBody: "text-sm text-[#171A18]/85 leading-relaxed",
  uiMeta: "font-mono text-xs text-[#5C625E] uppercase tracking-wider",
} as const;

export const STATUS_STYLES = {
  planning: {
    label: "PLANNING",
    badge: "bg-[#E0604E]/10 text-[#E0604E] border-[#E0604E]/30",
    dot: "bg-[#E0604E]",
  },
  waiting: {
    label: "WAITING",
    badge: "bg-[#171A18]/5 text-[#5C625E] border-[#171A18]/15",
    dot: "bg-[#171A18]/40",
  },
  in_progress: {
    label: "IN PROGRESS",
    badge: "bg-[#1F3D2B]/10 text-[#1F3D2B] border-[#1F3D2B]/30",
    dot: "bg-[#1F3D2B] animate-pulse",
  },
  completed: {
    label: "COMPLETED",
    badge: "bg-[#D8E4DA] text-[#1F3D2B] border-[#52795D]/30",
    dot: "bg-[#1F3D2B]",
  },
  upcoming: {
    label: "UPCOMING",
    badge: "bg-[#E3EBE4] text-[#1F3D2B] border-[#52795D]/30",
    dot: "bg-[#52795D]",
  },
  ongoing: {
    label: "ONGOING",
    badge: "bg-[#D8E4DA] text-[#1F3D2B] border-[#52795D]/30",
    dot: "bg-[#1F3D2B] animate-pulse",
  },
  failed: {
    label: "ATTENTION NEEDED",
    badge: "bg-red-500/10 text-red-700 border-red-500/30",
    dot: "bg-red-500",
  },
  unavailable: {
    label: "PROVIDER UNAVAILABLE",
    badge: "bg-amber-500/10 text-amber-800 border-amber-500/30",
    dot: "bg-amber-600",
  },
  no_results: {
    label: "NO RESULTS FOUND",
    badge: "bg-[#171A18]/5 text-[#5C625E] border-[#171A18]/20",
    dot: "bg-[#5C625E]",
  },
} as const;
