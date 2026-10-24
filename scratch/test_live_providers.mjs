/**
 * @file scratch/test_live_providers.mjs
 * Live connectivity and status check for all external providers in SafariX.
 */

import { DuffelTransportProvider } from "../src/lib/travel/providers/duffel/duffel-transport-provider.js";
import { DuffelStayProvider } from "../src/lib/travel/providers/duffel/duffel-stay-provider.js";
import { GooglePlacesProvider } from "../src/lib/travel/providers/google/places-provider.js";
import { GoogleFoodProvider } from "../src/lib/travel/providers/google/food-provider.js";
import { OpenMeteoWeatherProvider } from "../src/lib/travel/providers/openmeteo/weather-provider.js";
import { OsrmRoutingProvider } from "../src/lib/travel/providers/osrm/routing-provider.js";
import { getDefaultLLMProvider } from "../src/lib/ai/index.js";

async function testProviders() {
  console.log("=== SAFARIX LIVE PROVIDER CONNECTIVITY AUDIT ===");

  // 1. Duffel Flights
  console.log("\n[1] Testing Duffel Transport Provider...");
  try {
    const flightProvider = new DuffelTransportProvider();
    const flightRes = await flightProvider.searchFlights({
      origin: "Bhopal",
      destination: "London",
      departureDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      passengers: 1,
    });
    console.log(`✓ Duffel Flights: SUCCESS (${flightRes.length} offers returned)`);
    if (flightRes.length > 0) {
      console.log(`  Sample: ${flightRes[0].mode} from ${flightRes[0].origin} to ${flightRes[0].destination} (${flightRes[0].currency} ${flightRes[0].price})`);
    }
  } catch (err) {
    console.log(`✗ Duffel Flights: FAILED -> ${err.message}`);
  }

  // 2. Duffel Stays
  console.log("\n[2] Testing Duffel Stay Provider...");
  try {
    const stayProvider = new DuffelStayProvider();
    const stayRes = await stayProvider.searchStays({
      location: "London",
      checkIn: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      checkOut: new Date(Date.now() + 17 * 86400000).toISOString().split("T")[0],
      guests: 1,
    });
    console.log(`✓ Duffel Stays: SUCCESS (${stayRes.length} stays returned)`);
  } catch (err) {
    console.log(`✗ Duffel Stays: FAILED -> ${err.message}`);
  }

  // 3. Google Places
  console.log("\n[3] Testing Google Places Provider...");
  try {
    const placesProvider = new GooglePlacesProvider();
    const placesRes = await placesProvider.searchPlaces("Tokyo", { limit: 5 });
    console.log(`✓ Google Places: SUCCESS (${placesRes.length} places returned)`);
  } catch (err) {
    console.log(`✗ Google Places: FAILED -> ${err.message}`);
  }

  // 4. Google Food
  console.log("\n[4] Testing Google Food Provider...");
  try {
    const foodProvider = new GoogleFoodProvider();
    const foodRes = await foodProvider.searchRestaurants("Tokyo", { limit: 5 });
    console.log(`✓ Google Food: SUCCESS (${foodRes.length} restaurants returned)`);
  } catch (err) {
    console.log(`✗ Google Food: FAILED -> ${err.message}`);
  }

  // 5. Open-Meteo Weather
  console.log("\n[5] Testing Open-Meteo Weather...");
  try {
    const weatherProvider = new OpenMeteoWeatherProvider();
    const weatherRes = await weatherProvider.getForecast({ latitude: 35.6762, longitude: 139.6503 });
    console.log(`✓ Open-Meteo Weather: SUCCESS (${weatherRes.forecast?.length || 0} forecast entries)`);
  } catch (err) {
    console.log(`✗ Open-Meteo Weather: FAILED -> ${err.message}`);
  }

  // 6. OSRM Routing
  console.log("\n[6] Testing OSRM Routing...");
  try {
    const routingProvider = new OsrmRoutingProvider();
    const routeRes = await routingProvider.getRoute(
      { latitude: 51.5074, longitude: -0.1278 },
      { latitude: 51.5155, longitude: -0.0922 },
      "driving"
    );
    console.log(`✓ OSRM Routing: SUCCESS (distance: ${routeRes.distanceMeters}m, duration: ${routeRes.durationMinutes}m)`);
  } catch (err) {
    console.log(`✗ OSRM Routing: FAILED -> ${err.message}`);
  }

  // 7. Gemini LLM Provider
  console.log("\n[7] Testing Gemini LLM Provider...");
  try {
    const llm = getDefaultLLMProvider();
    const llmRes = await llm.generateText("Return only the word OK");
    console.log(`✓ Gemini LLM: SUCCESS (response: "${llmRes.trim()}")`);
  } catch (err) {
    console.log(`✗ Gemini LLM: FAILED -> ${err.message}`);
  }

  console.log("\n=== AUDIT COMPLETE ===");
}

testProviders().catch(console.error);
