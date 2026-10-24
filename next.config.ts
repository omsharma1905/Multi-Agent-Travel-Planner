import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for catching potential issues during development
  reactStrictMode: true,

  // Disable X-Powered-By header to prevent technology fingerprinting
  poweredByHeader: false,

  // Image optimization configuration — allow trusted remote hosts
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
      },
    ],
  },

  // Baseline & Hardened HTTP security headers
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    // Content Security Policy (CSP) tailored for Next.js, Framer Motion, and SafariX Travel Providers
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://upload.wikimedia.org https://commons.wikimedia.org https://api.dicebear.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://geocoding-api.open-meteo.com https://router.project-osrm.org https://maps.googleapis.com https://en.wikipedia.org https://commons.wikimedia.org https://photon.komoot.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    const headersList: { key: string; value: string }[] = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "Content-Security-Policy",
        value: cspDirectives,
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      },
    ];

    if (isProd) {
      headersList.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: headersList,
      },
    ];
  },

  // Experimental features — extend as needed per phase
  experimental: {},
};

export default nextConfig;
