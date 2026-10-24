import fs from "fs";
import path from "path";

// Load environment from .env.local
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const { ItineraryAgent } = await import("../src/lib/agents/itinerary/itinerary-agent.ts");
const { getDefaultLLMProvider } = await import("../src/lib/ai/index.ts");

async function testItineraryAgent() {
  const llm = getDefaultLLMProvider();
  console.log("LLM Provider Name:", llm.name);
  const agent = new ItineraryAgent(llm);

  const mockContext = {
    trip: {
      days: 3,
      travellers: 2,
      destination: "Paris",
      origin: "London",
    },
    destination: {
      id: "dest_paris",
      name: "Paris",
      country: "France",
    },
  };

  const mockInput = {
    stay: {
      id: "stay_paris_hotel",
      name: "Le Marais Boutique Hotel",
      category: "hotel",
      comfortLevel: "upscale",
      address: "10 Rue de Bretagne, 75003 Paris",
      checkIn: "15:00",
      checkOut: "11:00",
      pricePerNight: 180,
      currency: "EUR",
      roomType: "Deluxe King",
    },
    transport: {
      id: "trans_eurostar",
      mode: "train",
      provider: "Eurostar",
      departureTime: "09:30",
      arrivalTime: "12:47",
      durationMinutes: 137,
      price: 110,
      currency: "EUR",
      stops: 0,
    },
    selectedPlaces: [
      {
        id: "place_eiffel",
        name: "Eiffel Tower",
        type: "attraction",
        address: "Champ de Mars, 5 Av. Anatole France, 75007 Paris",
        estimatedDurationMinutes: 120,
        ticketPrice: 28,
        priceType: "exact",
        currency: "EUR",
        tags: ["landmark", "sightseeing"],
      },
      {
        id: "place_louvre",
        name: "Louvre Museum",
        type: "museum",
        address: "Rue de Rivoli, 75001 Paris",
        estimatedDurationMinutes: 180,
        ticketPrice: 22,
        priceType: "exact",
        currency: "EUR",
        tags: ["art", "history"],
      },
      {
        id: "place_notre_dame",
        name: "Notre-Dame Cathedral",
        type: "landmark",
        address: "6 Parvis Notre-Dame - Pl. Jean-Paul II, 75004 Paris",
        estimatedDurationMinutes: 90,
        ticketPrice: 0,
        priceType: "free",
        currency: "EUR",
        tags: ["architecture", "history"],
      },
    ],
    selectedRestaurants: [
      {
        id: "rest_bistro",
        name: "Bistrot Paul Bert",
        cuisine: "French",
        category: "casual_dining",
        address: "18 Rue Paul Bert, 75011 Paris",
        mealTypes: ["dinner"],
        averagePricePerPerson: 45,
        priceType: "estimate",
        currency: "EUR",
      },
      {
        id: "rest_cafe",
        name: "Café de Flore",
        cuisine: "French Café",
        category: "cafe",
        address: "172 Bd Saint-Germain, 75006 Paris",
        mealTypes: ["breakfast", "lunch"],
        averagePricePerPerson: 25,
        priceType: "estimate",
        currency: "EUR",
      },
    ],
  };

  console.log("Calling ItineraryAgent.run()...");
  const result = await agent.run(mockContext, mockInput, 1);
  console.log("Status:", result.status);
  console.log("Reasoning:", result.reasoning);
  console.log("Warnings:", result.warnings);
  if (result.data) {
    console.log("Generated Days:", result.data.days.length);
    console.log("Day 1 Items:", JSON.stringify(result.data.days[0], null, 2));
  }
}

testItineraryAgent().catch(console.error);
