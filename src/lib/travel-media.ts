/**
 * @file src/lib/travel-media.ts
 * Curated travel imagery and media assets for SafariX.
 * Centralized registry with high-aesthetic travel photography and rich gradient fallbacks.
 */

export interface TravelMediaItem {
  id: string;
  title: string;
  subtitle?: string;
  location: string;
  coordinates?: string;
  src: string;
  fallbackGradient: string;
  aspect?: "portrait" | "landscape" | "square" | "panorama";
}

export const TRAVEL_ASSETS = {
  hero: {
    videoSrc: "/videos/hero-travel.mp4",
    posterSrc:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80",
    fallbackGradient:
      "radial-gradient(ellipse at 40% 40%, #152238 0%, #0c121e 55%, #05070b 100%)",
  },
  destinations: {
    tokyo: {
      id: "tokyo",
      title: "TOKYO",
      subtitle: "NEON SANCTUARIES & SPEED",
      location: "Japan",
      coordinates: "35.6762° N · 139.6503° E",
      src: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80",
      fallbackGradient: "linear-gradient(145deg, #1b2838 0%, #0e1622 60%, #06090e 100%)",
      aspect: "portrait",
    },
    kyoto: {
      id: "kyoto",
      title: "KYOTO",
      subtitle: "BAMBOO CANOPIES & STILLNESS",
      location: "Japan",
      coordinates: "35.0116° N · 135.7681° E",
      src: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
      fallbackGradient: "linear-gradient(145deg, #242921 0%, #121611 60%, #070906 100%)",
      aspect: "square",
    },
    bali: {
      id: "bali",
      title: "BALI",
      subtitle: "CLIFFSIDE MIST & RITUALS",
      location: "Indonesia",
      coordinates: "8.3405° S · 115.0920° E",
      src: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
      fallbackGradient: "linear-gradient(145deg, #1d2b26 0%, #0f1814 60%, #070a09 100%)",
      aspect: "square",
    },
    paris: {
      id: "paris",
      title: "PARIS",
      subtitle: "HAUSSMANN BOULEVARDS AT DUSK",
      location: "France",
      coordinates: "48.8566° N · 2.3522° E",
      src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80",
      fallbackGradient: "linear-gradient(145deg, #2a2223 0%, #161213 60%, #080607 100%)",
      aspect: "landscape",
    },
    switzerland: {
      id: "switzerland",
      title: "SWISS ALPS",
      subtitle: "GLACIAL VALLEYS & SILENCE",
      location: "Switzerland",
      coordinates: "46.5562° N · 8.0345° E",
      src: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=2000&q=80",
      fallbackGradient: "linear-gradient(145deg, #1b2631 0%, #0f151b 60%, #07090d 100%)",
      aspect: "panorama",
    },
    iceland: {
      id: "iceland",
      title: "ICELAND",
      subtitle: "BLACK SANDS & AURORAS",
      location: "Nordic",
      coordinates: "64.9631° N · 19.0208° W",
      src: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1600&q=80",
      fallbackGradient: "linear-gradient(145deg, #17202a 0%, #0d1217 60%, #05080b 100%)",
      aspect: "portrait",
    },
  },
  experience: {
    agentBackdrop:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1800&q=80",
    itineraryBackdrop:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1800&q=80",
    ctaBackdrop:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2000&q=80",
  },
} as const;
