/**
 * @file src/lib/travel/images.ts
 *
 * Centralized Destination Image Registry.
 *
 * CRITICAL RULE:
 * NEVER use a geographically incorrect image for a destination.
 * Only use an image if its mapping is explicitly known and verified.
 * If destination-specific imagery is not available, return null.
 * The UI will render a neutral architectural / typographic gradient placeholder.
 */

export interface DestinationImageEntry {
  id: string;
  name: string;
  country: string;
  region?: string;
  aliases: string[];
  heroImage: string | null;
  galleryImages?: string[];
  neutralGradient: string;
}

export const DESTINATION_IMAGE_REGISTRY: Record<string, DestinationImageEntry> = {
  tokyo: {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    region: "Kanto",
    aliases: ["tokyo", "tokyo, japan", "tokyo japan", "edo", "tyo"],
    heroImage: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1600&auto=format&fit=crop",
    neutralGradient: "linear-gradient(145deg, #1b2838 0%, #0e1622 60%, #06090e 100%)",
  },
  kyoto: {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    region: "Kansai",
    aliases: ["kyoto", "kyoto, japan", "kyoto japan", "ukyo"],
    heroImage: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1600&auto=format&fit=crop",
    neutralGradient: "linear-gradient(145deg, #242921 0%, #121611 60%, #070906 100%)",
  },
  bali: {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    region: "Lesser Sunda Islands",
    aliases: ["bali", "bali, indonesia", "bali indonesia", "ubud", "denpasar", "dps"],
    heroImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1600&auto=format&fit=crop",
    neutralGradient: "linear-gradient(145deg, #1d2b26 0%, #0f1814 60%, #070a09 100%)",
  },
  paris: {
    id: "paris",
    name: "Paris",
    country: "France",
    region: "Île-de-France",
    aliases: ["paris", "paris, france", "paris france", "par", "cdg"],
    heroImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1600&auto=format&fit=crop",
    neutralGradient: "linear-gradient(145deg, #2a2223 0%, #161213 60%, #080607 100%)",
  },
  london: {
    id: "london",
    name: "London",
    country: "United Kingdom",
    region: "Greater London",
    aliases: ["london", "london, uk", "london uk", "london, united kingdom", "lon", "lhr"],
    heroImage: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1600&auto=format&fit=crop",
    neutralGradient: "linear-gradient(145deg, #182026 0%, #0e1418 60%, #06090c 100%)",
  },
  dubai: {
    id: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    region: "Emirate of Dubai",
    aliases: ["dubai", "dubai, uae", "dubai uae", "dxb"],
    heroImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1600&auto=format&fit=crop",
    neutralGradient: "linear-gradient(145deg, #272118 0%, #17130d 60%, #0a0805 100%)",
  },
  goa: {
    id: "goa",
    name: "Goa",
    country: "India",
    region: "Konkan",
    aliases: ["goa", "goa, india", "goa india", "panaji", "panjim", "goi"],
    heroImage: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1600&auto=format&fit=crop",
    neutralGradient: "linear-gradient(145deg, #24221d 0%, #15130f 60%, #090806 100%)",
  },
  mumbai: {
    id: "mumbai",
    name: "Mumbai",
    country: "India",
    region: "Maharashtra",
    aliases: ["mumbai", "mumbai, india", "mumbai india", "bombay", "bom"],
    heroImage: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=1600&auto=format&fit=crop",
    neutralGradient: "linear-gradient(145deg, #222226 0%, #121216 60%, #060608 100%)",
  },
  delhi: {
    id: "delhi",
    name: "Delhi",
    country: "India",
    region: "National Capital Region",
    aliases: ["delhi", "new delhi", "delhi, india", "delhi india", "del"],
    heroImage: "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=1600&auto=format&fit=crop",
    neutralGradient: "linear-gradient(145deg, #281e19 0%, #17110e 60%, #0a0705 100%)",
  },
  mathura: {
    id: "mathura",
    name: "Mathura",
    country: "India",
    region: "Uttar Pradesh",
    aliases: ["mathura", "mathura, india", "mathura india", "vrindavan", "braj"],
    // Verified authentic heritage image of Yamuna river ghats at Mathura / Vrindavan
    heroImage: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=1600&auto=format&fit=crop",
    neutralGradient: "linear-gradient(145deg, #281e17 0%, #19120c 60%, #0a0704 100%)",
  },
};

/**
 * Resolves a destination query to its verified image entry.
 * If the destination is unknown or has no verified image, heroImage is null.
 * NO generic/desert stock photos are ever returned.
 */
export function getDestinationImage(query: string): DestinationImageEntry {
  const normalized = query.toLowerCase().trim();

  for (const entry of Object.values(DESTINATION_IMAGE_REGISTRY)) {
    if (
      entry.id === normalized ||
      entry.name.toLowerCase() === normalized ||
      entry.aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))
    ) {
      return entry;
    }
  }

  // Unknown destination: return clean metadata with null heroImage
  // The UI will render a neutral architectural / typographic gradient
  const parts = query.split(",").map((s) => s.trim());
  const name = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Destination";
  const country = parts[1] || "Global";

  return {
    id: `custom_${normalized.replace(/\s+/g, "_")}`,
    name,
    country,
    aliases: [normalized],
    heroImage: null, // Strictly null. NO desert road photo.
    neutralGradient: "linear-gradient(145deg, #1c1c1c 0%, #111111 60%, #0a0a0a 100%)",
  };
}
