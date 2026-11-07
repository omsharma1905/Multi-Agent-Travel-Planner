import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { AuthProvider } from "@/features/auth/provider/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${APP_NAME} — Luxury Expeditions & AI Travel Planner`,
    template: `%s — ${APP_NAME}`,
  },
  description:
    "SafariX plans bespoke luxury journeys with transportation, handpicked sanctuaries, activities, Michelin-curated dining, and autonomous multi-agent orchestration.",
  keywords: ["SafariX", "AI travel planner", "journey planner", "luxury expeditions", "bespoke itineraries", "autonomous travel"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: APP_NAME,
    title: `${APP_NAME} — Luxury Expeditions & AI Travel Planner`,
    description:
      "SafariX plans bespoke luxury journeys with transportation, handpicked sanctuaries, activities, Michelin-curated dining, and autonomous multi-agent orchestration.",
    images: [
      {
        url: "/og/safarix.png",
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — AI Travel Planner`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Luxury Expeditions & AI Travel Planner`,
    description:
      "SafariX plans bespoke luxury journeys with transportation, handpicked sanctuaries, activities, Michelin-curated dining, and autonomous multi-agent orchestration.",
    images: ["/og/safarix.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0E2A24",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${plusJakarta.variable} ${playfair.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-sans bg-surface text-on-surface antialiased selection:bg-secondary/30 selection:text-secondary">
        {/* SafariX Custom Cursor (active on desktop / fine pointers only) */}
        <CustomCursor />

        <AuthProvider>
          <ToastProvider>
            <div id="app-root" className="flex min-h-screen flex-col overflow-x-hidden">
              {children}
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
