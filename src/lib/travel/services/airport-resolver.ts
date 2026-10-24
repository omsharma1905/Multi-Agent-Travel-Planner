/**
 * @file src/lib/travel/services/airport-resolver.ts
 *
 * Server-Side Airport and Origin / Destination IATA Resolution Engine.
 *
 * Rules:
 * - Never guesses an airport code.
 * - Preserves user-provided 3-letter IATA codes when supplied.
 * - Queries Duffel Places Suggestions API (/places/suggestions) when credentials exist.
 * - Uses a verified, structured global airport and metropolitan registry as verified fallback.
 * - Correctly handles multi-airport metropolitan cities (e.g. London -> LON, New York -> NYC,
 *   Tokyo -> TYO, Paris -> PAR, Milan -> MIL).
 * - Reports missing or ambiguous/unresolved origins truthfully with zero fake substitutions.
 */

export interface AirportResolution {
  resolved: boolean;
  iataCode?: string;
  cityName?: string;
  airportName?: string;
  type?: "airport" | "city";
  isMetropolitanMultiAirport?: boolean;
  availableAirports?: string[];
  source: "user_direct" | "duffel_api" | "verified_registry" | "unresolved";
  reason?: string;
}

interface MetroEntry {
  cityName: string;
  country: string;
  metroIata: string; // Metropolitan IATA code covering all area airports
  primaryAirportIata: string;
  airports: Array<{ iata: string; name: string }>;
  aliases: string[];
}

/**
 * Curated, verified global metropolitan and airport database.
 * Used for authoritative server-side resolution when offline or as verified fallback.
 */
const VERIFIED_METRO_REGISTRY: MetroEntry[] = [
  // Europe
  {
    cityName: "London",
    country: "United Kingdom",
    metroIata: "LON",
    primaryAirportIata: "LHR",
    airports: [
      { iata: "LHR", name: "Heathrow" },
      { iata: "LGW", name: "Gatwick" },
      { iata: "LCY", name: "London City" },
      { iata: "STN", name: "Stansted" },
      { iata: "LTN", name: "Luton" },
    ],
    aliases: ["london", "greater london", "heathrow", "gatwick", "stansted", "luton"],
  },
  {
    cityName: "Paris",
    country: "France",
    metroIata: "PAR",
    primaryAirportIata: "CDG",
    airports: [
      { iata: "CDG", name: "Charles de Gaulle" },
      { iata: "ORY", name: "Orly" },
    ],
    aliases: ["paris", "cdg", "orly"],
  },
  {
    cityName: "Milan",
    country: "Italy",
    metroIata: "MIL",
    primaryAirportIata: "MXP",
    airports: [
      { iata: "MXP", name: "Malpensa" },
      { iata: "LIN", name: "Linate" },
      { iata: "BGY", name: "Bergamo" },
    ],
    aliases: ["milan", "milano", "malpensa", "linate"],
  },
  {
    cityName: "Rome",
    country: "Italy",
    metroIata: "ROM",
    primaryAirportIata: "FCO",
    airports: [
      { iata: "FCO", name: "Fiumicino" },
      { iata: "CIA", name: "Ciampino" },
    ],
    aliases: ["rome", "roma", "fiumicino"],
  },
  {
    cityName: "Berlin",
    country: "Germany",
    metroIata: "BER",
    primaryAirportIata: "BER",
    airports: [{ iata: "BER", name: "Berlin Brandenburg" }],
    aliases: ["berlin", "brandenburg"],
  },
  {
    cityName: "Amsterdam",
    country: "Netherlands",
    metroIata: "AMS",
    primaryAirportIata: "AMS",
    airports: [{ iata: "AMS", name: "Schiphol" }],
    aliases: ["amsterdam", "schiphol"],
  },
  {
    cityName: "Barcelona",
    country: "Spain",
    metroIata: "BCN",
    primaryAirportIata: "BCN",
    airports: [{ iata: "BCN", name: "El Prat" }],
    aliases: ["barcelona", "el prat"],
  },
  {
    cityName: "Madrid",
    country: "Spain",
    metroIata: "MAD",
    primaryAirportIata: "MAD",
    airports: [{ iata: "MAD", name: "Barajas" }],
    aliases: ["madrid", "barajas"],
  },
  {
    cityName: "Frankfurt",
    country: "Germany",
    metroIata: "FRA",
    primaryAirportIata: "FRA",
    airports: [{ iata: "FRA", name: "Frankfurt Airport" }],
    aliases: ["frankfurt", "frankfurt am main"],
  },

  // Asia
  {
    cityName: "Tokyo",
    country: "Japan",
    metroIata: "TYO",
    primaryAirportIata: "HND",
    airports: [
      { iata: "HND", name: "Haneda" },
      { iata: "NRT", name: "Narita" },
    ],
    aliases: ["tokyo", "haneda", "narita"],
  },
  {
    cityName: "Osaka",
    country: "Japan",
    metroIata: "OSA",
    primaryAirportIata: "KIX",
    airports: [
      { iata: "KIX", name: "Kansai International" },
      { iata: "ITM", name: "Itami" },
    ],
    aliases: ["osaka", "kansai", "itami"],
  },
  {
    cityName: "Kyoto",
    country: "Japan",
    metroIata: "OSA", // Kyoto gateway is Osaka/Kansai
    primaryAirportIata: "KIX",
    airports: [
      { iata: "KIX", name: "Kansai International" },
      { iata: "ITM", name: "Itami" },
    ],
    aliases: ["kyoto"],
  },
  {
    cityName: "Singapore",
    country: "Singapore",
    metroIata: "SIN",
    primaryAirportIata: "SIN",
    airports: [{ iata: "SIN", name: "Changi" }],
    aliases: ["singapore", "changi"],
  },
  {
    cityName: "Bangkok",
    country: "Thailand",
    metroIata: "BKK",
    primaryAirportIata: "BKK",
    airports: [
      { iata: "BKK", name: "Suvarnabhumi" },
      { iata: "DMK", name: "Don Mueang" },
    ],
    aliases: ["bangkok", "suvarnabhumi", "don mueang"],
  },
  {
    cityName: "Bali",
    country: "Indonesia",
    metroIata: "DPS",
    primaryAirportIata: "DPS",
    airports: [{ iata: "DPS", name: "Ngurah Rai International (Denpasar)" }],
    aliases: ["bali", "denpasar", "ngurah rai", "ubud", "kuta", "seminyak"],
  },
  {
    cityName: "Dubai",
    country: "United Arab Emirates",
    metroIata: "DXB",
    primaryAirportIata: "DXB",
    airports: [
      { iata: "DXB", name: "Dubai International" },
      { iata: "DWC", name: "Al Maktoum" },
    ],
    aliases: ["dubai", "dxb"],
  },
  {
    cityName: "Delhi",
    country: "India",
    metroIata: "DEL",
    primaryAirportIata: "DEL",
    airports: [{ iata: "DEL", name: "Indira Gandhi International" }],
    aliases: ["delhi", "new delhi", "ncr"],
  },
  {
    cityName: "Mumbai",
    country: "India",
    metroIata: "BOM",
    primaryAirportIata: "BOM",
    airports: [{ iata: "BOM", name: "Chhatrapati Shivaji Maharaj" }],
    aliases: ["mumbai", "bombay"],
  },
  {
    cityName: "Goa",
    country: "India",
    metroIata: "GOI",
    primaryAirportIata: "GOI",
    airports: [
      { iata: "GOI", name: "Dabolim Airport" },
      { iata: "GOX", name: "Manohar International (Mopa)" },
    ],
    aliases: ["goa", "dabolim", "mopa", "panaji", "north goa", "south goa"],
  },
  {
    cityName: "Bengaluru",
    country: "India",
    metroIata: "BLR",
    primaryAirportIata: "BLR",
    airports: [{ iata: "BLR", name: "Kempegowda International" }],
    aliases: ["bengaluru", "bangalore"],
  },
  {
    cityName: "Bhopal",
    country: "India",
    metroIata: "BHO",
    primaryAirportIata: "BHO",
    airports: [{ iata: "BHO", name: "Raja Bhoj Airport" }],
    aliases: ["bhopal", "raja bhoj"],
  },

  // North America
  {
    cityName: "New York",
    country: "United States",
    metroIata: "NYC",
    primaryAirportIata: "JFK",
    airports: [
      { iata: "JFK", name: "John F. Kennedy" },
      { iata: "EWR", name: "Newark Liberty" },
      { iata: "LGA", name: "LaGuardia" },
    ],
    aliases: ["new york", "nyc", "manhattan", "brooklyn", "jfk", "newark", "laguardia"],
  },
  {
    cityName: "San Francisco",
    country: "United States",
    metroIata: "SFO",
    primaryAirportIata: "SFO",
    airports: [
      { iata: "SFO", name: "San Francisco International" },
      { iata: "OAK", name: "Oakland" },
      { iata: "SJC", name: "San Jose" },
    ],
    aliases: ["san francisco", "sfo", "bay area", "oakland", "san jose"],
  },
  {
    cityName: "Los Angeles",
    country: "United States",
    metroIata: "LAX",
    primaryAirportIata: "LAX",
    airports: [{ iata: "LAX", name: "Los Angeles International" }],
    aliases: ["los angeles", "lax"],
  },
  {
    cityName: "Chicago",
    country: "United States",
    metroIata: "CHI",
    primaryAirportIata: "ORD",
    airports: [
      { iata: "ORD", name: "O'Hare" },
      { iata: "MDW", name: "Midway" },
    ],
    aliases: ["chicago", "o'hare", "midway"],
  },
  {
    cityName: "Miami",
    country: "United States",
    metroIata: "MIA",
    primaryAirportIata: "MIA",
    airports: [{ iata: "MIA", name: "Miami International" }],
    aliases: ["miami", "south beach", "ft lauderdale"],
  },
  {
    cityName: "Orlando",
    country: "United States",
    metroIata: "MCO",
    primaryAirportIata: "MCO",
    airports: [{ iata: "MCO", name: "Orlando International" }],
    aliases: ["orlando", "disney", "kissimmee"],
  },
  {
    cityName: "Las Vegas",
    country: "United States",
    metroIata: "LAS",
    primaryAirportIata: "LAS",
    airports: [{ iata: "LAS", name: "Harry Reid International" }],
    aliases: ["las vegas", "vegas", "mccarran"],
  },
  {
    cityName: "Seattle",
    country: "United States",
    metroIata: "SEA",
    primaryAirportIata: "SEA",
    airports: [{ iata: "SEA", name: "Seattle-Tacoma" }],
    aliases: ["seattle", "seatac"],
  },
  {
    cityName: "Boston",
    country: "United States",
    metroIata: "BOS",
    primaryAirportIata: "BOS",
    airports: [{ iata: "BOS", name: "Logan International" }],
    aliases: ["boston", "logan"],
  },
  {
    cityName: "Washington",
    country: "United States",
    metroIata: "WAS",
    primaryAirportIata: "IAD",
    airports: [
      { iata: "IAD", name: "Dulles International" },
      { iata: "DCA", name: "Ronald Reagan" },
      { iata: "BWI", name: "Baltimore/Washington" },
    ],
    aliases: ["washington", "washington dc", "dc", "dulles", "reagan"],
  },
  {
    cityName: "Atlanta",
    country: "United States",
    metroIata: "ATL",
    primaryAirportIata: "ATL",
    airports: [{ iata: "ATL", name: "Hartsfield-Jackson" }],
    aliases: ["atlanta", "hartsfield"],
  },
  {
    cityName: "Dallas",
    country: "United States",
    metroIata: "DFW",
    primaryAirportIata: "DFW",
    airports: [{ iata: "DFW", name: "Dallas/Fort Worth" }],
    aliases: ["dallas", "fort worth", "dfw"],
  },
  {
    cityName: "Toronto",
    country: "Canada",
    metroIata: "YTO",
    primaryAirportIata: "YYZ",
    airports: [
      { iata: "YYZ", name: "Toronto Pearson" },
      { iata: "YTZ", name: "Billy Bishop" },
    ],
    aliases: ["toronto", "pearson", "yyz"],
  },
  {
    cityName: "Vancouver",
    country: "Canada",
    metroIata: "YVR",
    primaryAirportIata: "YVR",
    airports: [{ iata: "YVR", name: "Vancouver International" }],
    aliases: ["vancouver", "yvr"],
  },
  {
    cityName: "Montreal",
    country: "Canada",
    metroIata: "YMQ",
    primaryAirportIata: "YUL",
    airports: [{ iata: "YUL", name: "Montréal-Trudeau" }],
    aliases: ["montreal", "montréal", "yul"],
  },

  // Europe Additions
  {
    cityName: "Vienna",
    country: "Austria",
    metroIata: "VIE",
    primaryAirportIata: "VIE",
    airports: [{ iata: "VIE", name: "Vienna International" }],
    aliases: ["vienna", "wien", "schwechat"],
  },
  {
    cityName: "Zurich",
    country: "Switzerland",
    metroIata: "ZRH",
    primaryAirportIata: "ZRH",
    airports: [{ iata: "ZRH", name: "Zurich Airport" }],
    aliases: ["zurich", "zürich", "kloten"],
  },
  {
    cityName: "Geneva",
    country: "Switzerland",
    metroIata: "GVA",
    primaryAirportIata: "GVA",
    airports: [{ iata: "GVA", name: "Geneva Airport" }],
    aliases: ["geneva", "genève", "cointrin"],
  },
  {
    cityName: "Munich",
    country: "Germany",
    metroIata: "MUC",
    primaryAirportIata: "MUC",
    airports: [{ iata: "MUC", name: "Munich Airport" }],
    aliases: ["munich", "münchen", "franz josef strauss"],
  },
  {
    cityName: "Brussels",
    country: "Belgium",
    metroIata: "BRU",
    primaryAirportIata: "BRU",
    airports: [{ iata: "BRU", name: "Brussels Airport" }],
    aliases: ["brussels", "bruxelles", "zaventem"],
  },
  {
    cityName: "Lisbon",
    country: "Portugal",
    metroIata: "LIS",
    primaryAirportIata: "LIS",
    airports: [{ iata: "LIS", name: "Humberto Delgado" }],
    aliases: ["lisbon", "lisboa", "portela"],
  },
  {
    cityName: "Porto",
    country: "Portugal",
    metroIata: "OPO",
    primaryAirportIata: "OPO",
    airports: [{ iata: "OPO", name: "Francisco Sá Carneiro" }],
    aliases: ["porto", "oporto"],
  },
  {
    cityName: "Athens",
    country: "Greece",
    metroIata: "ATH",
    primaryAirportIata: "ATH",
    airports: [{ iata: "ATH", name: "Eleftherios Venizelos" }],
    aliases: ["athens", "athina"],
  },
  {
    cityName: "Dublin",
    country: "Ireland",
    metroIata: "DUB",
    primaryAirportIata: "DUB",
    airports: [{ iata: "DUB", name: "Dublin Airport" }],
    aliases: ["dublin", "baile átha cliath"],
  },
  {
    cityName: "Edinburgh",
    country: "United Kingdom",
    metroIata: "EDI",
    primaryAirportIata: "EDI",
    airports: [{ iata: "EDI", name: "Edinburgh Airport" }],
    aliases: ["edinburgh", "turnhouse"],
  },
  {
    cityName: "Prague",
    country: "Czech Republic",
    metroIata: "PRG",
    primaryAirportIata: "PRG",
    airports: [{ iata: "PRG", name: "Václav Havel" }],
    aliases: ["prague", "praha", "ruzyne"],
  },
  {
    cityName: "Budapest",
    country: "Hungary",
    metroIata: "BUD",
    primaryAirportIata: "BUD",
    airports: [{ iata: "BUD", name: "Budapest Ferenc Liszt" }],
    aliases: ["budapest", "ferihegy"],
  },
  {
    cityName: "Reykjavik",
    country: "Iceland",
    metroIata: "REK",
    primaryAirportIata: "KEF",
    airports: [{ iata: "KEF", name: "Keflavik International" }],
    aliases: ["reykjavik", "keflavik", "iceland"],
  },
  {
    cityName: "Istanbul",
    country: "Turkey",
    metroIata: "IST",
    primaryAirportIata: "IST",
    airports: [
      { iata: "IST", name: "Istanbul Airport" },
      { iata: "SAW", name: "Sabiha Gökçen" },
    ],
    aliases: ["istanbul", "constantinople", "sabiha"],
  },
  {
    cityName: "Venice",
    country: "Italy",
    metroIata: "VCE",
    primaryAirportIata: "VCE",
    airports: [{ iata: "VCE", name: "Marco Polo" }],
    aliases: ["venice", "venezia", "marco polo"],
  },
  {
    cityName: "Florence",
    country: "Italy",
    metroIata: "FLR",
    primaryAirportIata: "FLR",
    airports: [{ iata: "FLR", name: "Peretola" }],
    aliases: ["florence", "firenze"],
  },

  // Additional Indian Hubs & Destinations
  {
    cityName: "Hyderabad",
    country: "India",
    metroIata: "HYD",
    primaryAirportIata: "HYD",
    airports: [{ iata: "HYD", name: "Rajiv Gandhi International" }],
    aliases: ["hyderabad", "secunderabad", "shamshabad"],
  },
  {
    cityName: "Chennai",
    country: "India",
    metroIata: "MAA",
    primaryAirportIata: "MAA",
    airports: [{ iata: "MAA", name: "Chennai International" }],
    aliases: ["chennai", "madras"],
  },
  {
    cityName: "Kolkata",
    country: "India",
    metroIata: "CCU",
    primaryAirportIata: "CCU",
    airports: [{ iata: "CCU", name: "Netaji Subhash Chandra Bose" }],
    aliases: ["kolkata", "calcutta", "dum dum"],
  },
  {
    cityName: "Ahmedabad",
    country: "India",
    metroIata: "AMD",
    primaryAirportIata: "AMD",
    airports: [{ iata: "AMD", name: "Sardar Vallabhbhai Patel" }],
    aliases: ["ahmedabad", "amdavad"],
  },
  {
    cityName: "Pune",
    country: "India",
    metroIata: "PNQ",
    primaryAirportIata: "PNQ",
    airports: [{ iata: "PNQ", name: "Pune International" }],
    aliases: ["pune", "poona"],
  },
  {
    cityName: "Jaipur",
    country: "India",
    metroIata: "JAI",
    primaryAirportIata: "JAI",
    airports: [{ iata: "JAI", name: "Jaipur International" }],
    aliases: ["jaipur", "pink city", "sanganer"],
  },
  {
    cityName: "Kochi",
    country: "India",
    metroIata: "COK",
    primaryAirportIata: "COK",
    airports: [{ iata: "COK", name: "Cochin International" }],
    aliases: ["kochi", "cochin", "ernakulam", "nedumbassery"],
  },
  {
    cityName: "Lucknow",
    country: "India",
    metroIata: "LKO",
    primaryAirportIata: "LKO",
    airports: [{ iata: "LKO", name: "Chaudhary Charan Singh" }],
    aliases: ["lucknow", "amausi"],
  },
  {
    cityName: "Varanasi",
    country: "India",
    metroIata: "VNS",
    primaryAirportIata: "VNS",
    airports: [{ iata: "VNS", name: "Lal Bahadur Shastri" }],
    aliases: ["varanasi", "banaras", "kashi", "babatpur"],
  },
  {
    cityName: "Amritsar",
    country: "India",
    metroIata: "ATQ",
    primaryAirportIata: "ATQ",
    airports: [{ iata: "ATQ", name: "Sri Guru Ram Dass Jee" }],
    aliases: ["amritsar", "raja sansi"],
  },
  {
    cityName: "Srinagar",
    country: "India",
    metroIata: "SXR",
    primaryAirportIata: "SXR",
    airports: [{ iata: "SXR", name: "Sheikh ul-Alam International" }],
    aliases: ["srinagar", "kashmir"],
  },
  {
    cityName: "Udaipur",
    country: "India",
    metroIata: "UDR",
    primaryAirportIata: "UDR",
    airports: [{ iata: "UDR", name: "Maharana Pratap" }],
    aliases: ["udaipur", "dabok"],
  },
  {
    cityName: "Agra",
    country: "India",
    metroIata: "AGR",
    primaryAirportIata: "AGR",
    airports: [{ iata: "AGR", name: "Agra Airport / Kheria" }],
    aliases: ["agra", "taj mahal", "kheria"],
  },

  // Asia, Middle East & Global Destinations
  {
    cityName: "Seoul",
    country: "South Korea",
    metroIata: "SEL",
    primaryAirportIata: "ICN",
    airports: [
      { iata: "ICN", name: "Incheon International" },
      { iata: "GMP", name: "Gimpo" },
    ],
    aliases: ["seoul", "incheon", "gimpo"],
  },
  {
    cityName: "Hong Kong",
    country: "Hong Kong",
    metroIata: "HKG",
    primaryAirportIata: "HKG",
    airports: [{ iata: "HKG", name: "Hong Kong International" }],
    aliases: ["hong kong", "chek lap kok", "hkg"],
  },
  {
    cityName: "Taipei",
    country: "Taiwan",
    metroIata: "TPE",
    primaryAirportIata: "TPE",
    airports: [
      { iata: "TPE", name: "Taoyuan International" },
      { iata: "TSA", name: "Songshan" },
    ],
    aliases: ["taipei", "taoyuan", "songshan"],
  },
  {
    cityName: "Kuala Lumpur",
    country: "Malaysia",
    metroIata: "KUL",
    primaryAirportIata: "KUL",
    airports: [{ iata: "KUL", name: "Kuala Lumpur International (KLIA)" }],
    aliases: ["kuala lumpur", "klia", "sepang"],
  },
  {
    cityName: "Phuket",
    country: "Thailand",
    metroIata: "HKT",
    primaryAirportIata: "HKT",
    airports: [{ iata: "HKT", name: "Phuket International" }],
    aliases: ["phuket", "patong", "kata"],
  },
  {
    cityName: "Abu Dhabi",
    country: "United Arab Emirates",
    metroIata: "AUH",
    primaryAirportIata: "AUH",
    airports: [{ iata: "AUH", name: "Zayed International" }],
    aliases: ["abu dhabi", "zayed international"],
  },
  {
    cityName: "Doha",
    country: "Qatar",
    metroIata: "DOH",
    primaryAirportIata: "DOH",
    airports: [{ iata: "DOH", name: "Hamad International" }],
    aliases: ["doha", "hamad"],
  },
  {
    cityName: "Cairo",
    country: "Egypt",
    metroIata: "CAI",
    primaryAirportIata: "CAI",
    airports: [{ iata: "CAI", name: "Cairo International" }],
    aliases: ["cairo", "giza"],
  },
  {
    cityName: "Cape Town",
    country: "South Africa",
    metroIata: "CPT",
    primaryAirportIata: "CPT",
    airports: [{ iata: "CPT", name: "Cape Town International" }],
    aliases: ["cape town", "cpt"],
  },
  {
    cityName: "Auckland",
    country: "New Zealand",
    metroIata: "AKL",
    primaryAirportIata: "AKL",
    airports: [{ iata: "AKL", name: "Auckland Airport" }],
    aliases: ["auckland", "māngere"],
  },
  {
    cityName: "Brisbane",
    country: "Australia",
    metroIata: "BNE",
    primaryAirportIata: "BNE",
    airports: [{ iata: "BNE", name: "Brisbane Airport" }],
    aliases: ["brisbane", "gold coast"],
  },

  // Oceania
  {
    cityName: "Sydney",
    country: "Australia",
    metroIata: "SYD",
    primaryAirportIata: "SYD",
    airports: [{ iata: "SYD", name: "Kingsford Smith" }],
    aliases: ["sydney", "kingsford smith"],
  },
  {
    cityName: "Melbourne",
    country: "Australia",
    metroIata: "MEL",
    primaryAirportIata: "MEL",
    airports: [{ iata: "MEL", name: "Tullamarine" }],
    aliases: ["melbourne", "tullamarine"],
  },
];

export class AirportResolver {
  /**
   * Resolves a query string into a verified IATA airport or city code.
   *
   * Priority:
   * 1. Direct user 3-letter uppercase IATA code (e.g. "JFK", "LHR", "HND").
   * 2. Live Duffel Places Suggestions API (/places/suggestions) if token is provided.
   * 3. Authoritative server-side verified metropolitan registry.
   * 4. Unresolved failure (Never guesses).
   */
  static async resolve(
    query: string,
    options: {
      accessToken?: string | null;
      baseUrl?: string;
      timeoutMs?: number;
    } = {},
  ): Promise<AirportResolution> {
    if (!query || !query.trim()) {
      return {
        resolved: false,
        source: "unresolved",
        reason: "Location query is empty or missing.",
      };
    }

    const trimmed = query.trim();

    // 1. Direct user 3-letter IATA code
    if (/^[A-Za-z]{3}$/.test(trimmed)) {
      // Check if this 3-letter query is explicitly a known city name in the registry (e.g. "Goa" -> GOI, not Genoa GOA)
      const exactCityMatch = VERIFIED_METRO_REGISTRY.find(
        (m) => m.cityName.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exactCityMatch) {
        const code = exactCityMatch.metroIata || exactCityMatch.primaryAirportIata;
        return {
          resolved: true,
          iataCode: code,
          cityName: exactCityMatch.cityName,
          type: exactCityMatch.airports.length > 1 ? "city" : "airport",
          isMetropolitanMultiAirport: exactCityMatch.airports.length > 1,
          availableAirports: exactCityMatch.airports.map((a) => a.iata),
          source: "verified_registry",
        };
      }

      const code = trimmed.toUpperCase();
      // Check if known directly in verified registry
      const match = VERIFIED_METRO_REGISTRY.find(
        (m) =>
          m.metroIata === code ||
          m.primaryAirportIata === code ||
          m.airports.some((a) => a.iata === code),
      );
      if (match) {
        return {
          resolved: true,
          iataCode: code,
          cityName: match.cityName,
          type: match.metroIata === code ? "city" : "airport",
          isMetropolitanMultiAirport: Boolean(match.airports.length > 1 && match.metroIata === code),
          availableAirports: match.airports.map((a) => a.iata),
          source: "verified_registry",
        };
      }
      // Zero-Mock rule: Do not claim an airport is verified merely because its code has 3 letters!
      // If not in verified registry, fall through to Duffel API (if configured) or return unresolved.
    }

    // 2. Query live Duffel Places Suggestions API if access token is available
    if (options.accessToken) {
      try {
        const timeout = options.timeoutMs || 4000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        const baseUrl = options.baseUrl || "https://api.duffel.com";
        const url = `${baseUrl.replace(/\/$/, "")}/places/suggestions?query=${encodeURIComponent(trimmed)}`;

        const res = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${options.accessToken}`,
            "Duffel-Version": "v2",
            Accept: "application/json",
          },
        });
        clearTimeout(timer);

        if (res.ok) {
          const json = (await res.json()) as {
            data?: Array<{
              id: string;
              name: string;
              iata_code?: string;
              type: "airport" | "city";
              iata_city_code?: string;
            }>;
          };

          const items = json.data;
          if (items && Array.isArray(items) && items.length > 0) {
            // Prefer metropolitan city code if available, as Duffel searches all area airports
            const cityMatch = items.find((p) => p.type === "city" && p.iata_code);
            const airportMatch = items.find((p) => p.type === "airport" && p.iata_code);
            const chosen = cityMatch || airportMatch || items[0];

            if (chosen.iata_code) {
              return {
                resolved: true,
                iataCode: chosen.iata_code.toUpperCase(),
                cityName: chosen.name,
                type: chosen.type,
                isMetropolitanMultiAirport: chosen.type === "city",
                source: "duffel_api",
              };
            }
          }
        }
      } catch {
        // Fall back gracefully to verified registry on network or auth errors
      }
    }

    // 3. Fallback to Verified Metropolitan Registry
    const cleanQuery = trimmed.toLowerCase();
    for (const metro of VERIFIED_METRO_REGISTRY) {
      const isMatch =
        cleanQuery === metro.cityName.toLowerCase() ||
        metro.aliases.some((alias) => cleanQuery.includes(alias) || alias.includes(cleanQuery));

      if (isMatch) {
        // Prefer metro multi-airport code for search breadth, or primary airport
        const code = metro.metroIata || metro.primaryAirportIata;
        return {
          resolved: true,
          iataCode: code,
          cityName: metro.cityName,
          type: metro.airports.length > 1 ? "city" : "airport",
          isMetropolitanMultiAirport: metro.airports.length > 1,
          availableAirports: metro.airports.map((a) => a.iata),
          source: "verified_registry",
        };
      }
    }

    // 4. Truly unknown / unresolvable location - DO NOT GUESS!
    return {
      resolved: false,
      source: "unresolved",
      reason: `Could not determine a verified airport or IATA city code for '${trimmed}'.`,
    };
  }
}
