import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SafariX Nature-Inspired & Cinematic Color System
        charcoal: {
          DEFAULT: "#171A18",
          deep: "#0F1210",
          soft: "#232724",
          light: "#2C302D",
          muted: "#5C625E",
          faint: "#8A928C",
        },
        ink: {
          DEFAULT: "#171A18",
          soft: "#232724",
          muted: "#5C625E",
          faint: "#8A928C",
        },
        ivory: {
          DEFAULT: "#F8F5EE",
          light: "#FDFCFA",
          dark: "#EFECE3",
        },
        cream: {
          DEFAULT: "#EFECE3",
          light: "#F7F5EE",
          dark: "#E4DFC5",
        },
        forest: {
          DEFAULT: "#1F3D2B",
          deep: "#14281C",
          light: "#2A523A",
          hover: "#183222",
        },
        sage: {
          DEFAULT: "#52795D",
          light: "#E3EBE4",
          badge: "#D8E4DA",
          dark: "#3B5843",
          border: "#C8D6CA",
        },
        safari: {
          forest: "#1F3D2B",
          sage: "#52795D",
          coral: "#E0604E",
          sun: "#E5A83B",
          ivory: "#F8F5EE",
          charcoal: "#171A18",
        },
        veora: {
          blue: "#1F3D2B", // Mapped to primary forest for seamless backward compatibility
          sky: "#8CC8FF",
          coral: "#E0604E",
          sun: "#E5A83B",
          forest: "#1F3D2B",
        },
      },
      fontFamily: {
        sans: ["var(--font-display)", "var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        // Controlled, sophisticated type scale (no excessive massive slabs)
        "display-2xl": ["clamp(2.5rem, 6.5vw, 5.25rem)", { lineHeight: "0.96", letterSpacing: "-0.03em" }],
        "display-xl":  ["clamp(2rem, 5vw, 4rem)",         { lineHeight: "1.0", letterSpacing: "-0.025em" }],
        "display-lg":  ["clamp(1.75rem, 3.8vw, 3rem)",    { lineHeight: "1.06", letterSpacing: "-0.02em" }],
        "display-md":  ["clamp(1.35rem, 2.5vw, 2.15rem)", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        "display-sm":  ["clamp(1.1rem, 1.8vw, 1.5rem)",   { lineHeight: "1.25" }],
      },
      spacing: {
        "page-x": "clamp(1.25rem, 5vw, 5rem)",
        "page-y": "clamp(3.5rem, 8vh, 7rem)",
        "section": "clamp(4.5rem, 9vh, 8rem)",
      },
      keyframes: {
        "marquee-left": {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "marquee-right": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0%)" },
        },
      },
      animation: {
        "marquee-left-fast": "marquee-left 24s linear infinite",
        "marquee-left": "marquee-left 36s linear infinite",
        "marquee-left-slow": "marquee-left 52s linear infinite",
        "marquee-right-fast": "marquee-right 26s linear infinite",
        "marquee-right": "marquee-right 38s linear infinite",
        "marquee-right-slow": "marquee-right 54s linear infinite",
      },
      screens: {
        xs: "480px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [],
};

export default config;
