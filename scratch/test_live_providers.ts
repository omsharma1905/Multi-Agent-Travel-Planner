/**
 * @file scratch/test_live_providers.ts
 * Live connectivity and status check for all external providers in SafariX.
 */

import { z } from "zod";
import {
  DuffelTransportProvider,
  DuffelStayProvider,
  GooglePlacesProvider,
  GoogleFoodProvider,
  OpenMeteoDestinationProvider,
  OsrmMapProvider,
} from "../src/lib/travel/providers/real";
import { getDefaultLLMProvider } from "../src/lib/ai";

async function testProviders() {
  console.log("=== SAFARIX LIVE PROVIDER CONNECTIVITY AUDIT ===");

  // 1. Duffel Flights
  console.log("\n[1] Testing Duffel Transport Provider...");
  try {
    const flightProvider = new DuffelTransportProvider();
    const flightRes = await flightProvider.searchTransport({
      origin: "Bhopal",
      destination: "London",
      travellers: 1,
    });
    console.log(`✓ Duffel Flights: SUCCESS (${flightRes.length} offers returned)`);
    if (flightRes.length > 0) {
      console.log(`  Sample: ${flightRes[0].mode} from ${flightRes[0].origin} to ${flightRes[0].destination} (${flightRes[0].currency} ${flightRes[0].price})`);
    }
  } catch (err: any) {
    console.log(`✗ Duffel Flights: FAILED -> ${err.message}`);
  }

  // 2. Duffel Stays
  console.log("\n[2] Testing Duffel Stay Provider...");
  try {
    const stayProvider = new DuffelStayProvider();
    const stayRes = await stayProvider.searchStays({
      destinationId: "london",
      nights: 3,
      guests: 1,
    });
    console.log(`✓ Duffel Stays: SUCCESS (${stayRes.length} stays returned)`);
  } catch (err: any) {
    console.log(`✗ Duffel Stays: FAILED -> ${err.message}`);
  }

  // 3. Google Places
  console.log("\n[3] Testing Google Places Provider...");
  try {
    const placesProvider = new GooglePlacesProvider();
    const placesRes = await placesProvider.searchPlaces({ destinationId: "Tokyo" });
    console.log(`✓ Google Places: SUCCESS (${placesRes.length} places returned)`);
  } catch (err: any) {
    console.log(`✗ Google Places: FAILED -> ${err.message}`);
  }

  // 4. Google Food
  console.log("\n[4] Testing Google Food Provider...");
  try {
    const foodProvider = new GoogleFoodProvider();
    const foodRes = await foodProvider.searchRestaurants({ destinationId: "Tokyo" });
    console.log(`✓ Google Food: SUCCESS (${foodRes.length} restaurants returned)`);
  } catch (err: any) {
    console.log(`✗ Google Food: FAILED -> ${err.message}`);
  }

  // 5. Open-Meteo Weather / Destination
  console.log("\n[5] Testing Open-Meteo Destination Provider...");
  try {
    const destProvider = new OpenMeteoDestinationProvider();
    const destRes = await destProvider.searchDestinations({ query: "Tokyo" });
    console.log(`✓ Open-Meteo: SUCCESS (${destRes.length} destinations resolved)`);
    if (destRes.length > 0) {
      console.log(`  Resolved: ${destRes[0].name}, ${destRes[0].country} (lat: ${destRes[0].latitude}, lng: ${destRes[0].longitude})`);
    }
  } catch (err: any) {
    console.log(`✗ Open-Meteo: FAILED -> ${err.message}`);
  }

  // 6. OSRM Routing
  console.log("\n[6] Testing OSRM Routing...");
  try {
    const routingProvider = new OsrmMapProvider();
    const routeRes = await routingProvider.getRoute({
      origin: { latitude: 51.5074, longitude: -0.1278 },
      destination: { latitude: 51.5155, longitude: -0.0922 },
      mode: "drive",
    });
    console.log(`✓ OSRM Routing: SUCCESS (distance: ${routeRes.distanceKm}km, duration: ${routeRes.durationMinutes}m)`);
  } catch (err: any) {
    console.log(`✗ OSRM Routing: FAILED -> ${err.message}`);
  }

  // 7. Gemini LLM Provider
  console.log("\n[7] Testing Gemini LLM Provider...");
  try {
    const llm = getDefaultLLMProvider();
    const testSchema = z.object({ status: z.string() });
    const llmRes = await llm.generateStructured(testSchema, "Return JSON with status: 'ok'");
    console.log(`✓ Gemini LLM: SUCCESS (response status: "${llmRes.status}")`);
  } catch (err: any) {
    console.log(`✗ Gemini LLM: FAILED -> ${err.message}`);
  }

  console.log("\n=== AUDIT COMPLETE ===");
}

testProviders().catch(console.error);
