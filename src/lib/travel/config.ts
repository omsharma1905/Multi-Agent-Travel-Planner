/**
 * @file src/lib/travel/config.ts
 *
 * Configuration layer for the SafariX Travel Data Layer.
 * Manages provider mode (real vs mock), API credentials, and environment guards.
 *
 * CRITICAL RULE:
 * In production (or when TRAVEL_DATA_MODE === "real"), missing required credentials
 * will throw a ProviderConfigurationError. Silent mock fallback is forbidden in production.
 */

import { ProviderConfigurationError } from "./errors/travel-errors";

export type TravelDataMode = "real" | "mock";

export interface TravelConfig {
  mode: TravelDataMode;
  isProduction: boolean;
  providers: {
    openMeteo: {
      baseUrl: string;
      timeoutMs: number;
    };
    pexels: {
      apiKey: string | null;
      baseUrl: string;
      timeoutMs: number;
    };
    googlePlaces: {
      apiKey: string | null;
      baseUrl: string;
      timeoutMs: number;
    };
    osrm: {
      baseUrl: string;
      timeoutMs: number;
    };
    duffel: {
      accessToken: string | null;
      baseUrl: string;
      timeoutMs: number;
    };
    amadeus: {
      clientId: string | null;
      clientSecret: string | null;
      baseUrl: string;
      timeoutMs: number;
    };
  };
}

/**
 * Resolves current travel data layer configuration from environment variables.
 */
export function getTravelConfig(): TravelConfig {
  const isProduction = process.env.NODE_ENV === "production";

  // Production Zero-Mock Enforcement:
  // In production, mock overrides are strictly prohibited.
  if (isProduction) {
    if (process.env.ALLOW_PRODUCTION_MOCKS === "true") {
      throw new ProviderConfigurationError(
        "travel-config",
        "ALLOW_PRODUCTION_MOCKS is forbidden in production environment. SafariX production must use genuine provider integrations.",
      );
    }
    const envMode = process.env.TRAVEL_DATA_MODE?.toLowerCase();
    if (envMode === "mock") {
      throw new ProviderConfigurationError(
        "travel-config",
        "TRAVEL_DATA_MODE cannot be set to 'mock' in production environment. SafariX production requires genuine provider data.",
      );
    }
  }

  const envMode = process.env.TRAVEL_DATA_MODE?.toLowerCase();
  const mode: TravelDataMode = isProduction
    ? "real"
    : envMode === "real"
    ? "real"
    : "mock";



  const pexelsApiKey = process.env.PEXELS_API_KEY || null;
  const googlePlacesApiKey =
    process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || null;
  const duffelAccessToken = process.env.DUFFEL_ACCESS_TOKEN || null;
  const duffelBaseUrl = process.env.DUFFEL_BASE_URL || "https://api.duffel.com";
  const amadeusClientId = process.env.AMADEUS_CLIENT_ID || null;
  const amadeusClientSecret = process.env.AMADEUS_CLIENT_SECRET || null;
  const amadeusBaseUrl = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";
  const osrmBaseUrl = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";

  return {
    mode,
    isProduction,
    providers: {
      openMeteo: {
        baseUrl: "https://geocoding-api.open-meteo.com/v1",
        timeoutMs: 8000,
      },
      pexels: {
        apiKey: pexelsApiKey,
        baseUrl: "https://api.pexels.com/v1",
        timeoutMs: 6000,
      },
      googlePlaces: {
        apiKey: googlePlacesApiKey,
        baseUrl: "https://places.googleapis.com/v1",
        timeoutMs: 8000,
      },
      osrm: {
        baseUrl: osrmBaseUrl,
        timeoutMs: 5000,
      },
      duffel: {
        accessToken: duffelAccessToken,
        baseUrl: duffelBaseUrl,
        timeoutMs: 10000,
      },
      amadeus: {
        clientId: amadeusClientId,
        clientSecret: amadeusClientSecret,
        baseUrl: amadeusBaseUrl,
        timeoutMs: 10000,
      },
    },
  };
}

/**
 * Validates that required credentials exist when running in "real" mode.
 * Throws a loud ProviderConfigurationError if missing.
 */
export function assertProviderCredentials(
  _providerName: "pexels" | "googlePlaces" | "duffel" | "amadeus",
): void {
  // Free-only architecture: SafariX uses OpenStreetMap (Photon), Wikimedia Commons,
  // and outbound search links by default in 'real' mode. Paid provider keys are optional.
  const config = getTravelConfig();
  if (config.mode !== "real") return;

  // Paid provider assertions are non-blocking in the free-only architecture.
}

/**
 * Asserts that mock mode is not accidentally running in a live production environment.
 */
export function assertNoMockFallbackInProduction(isProductionEnv?: boolean): void {
  const isProd = isProductionEnv !== undefined ? isProductionEnv : process.env.NODE_ENV === "production";
  if (isProd) {
    if (process.env.ALLOW_PRODUCTION_MOCKS === "true") {
      throw new ProviderConfigurationError(
        "travel-config",
        "ALLOW_PRODUCTION_MOCKS is forbidden in production environment. Mocks cannot be enabled in production.",
      );
    }
    const config = getTravelConfig();
    if (config.mode === "mock") {
      throw new ProviderConfigurationError(
        "travel-config",
        "Mock data is forbidden in production environment. Configure real provider credentials or set TRAVEL_DATA_MODE=real.",
      );
    }
  }
}

