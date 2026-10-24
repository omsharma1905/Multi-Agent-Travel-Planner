/**
 * @file src/lib/travel/providers/interfaces.ts
 *
 * Provider interfaces decoupling callers from underlying external APIs or mock systems.
 */

import {
  Destination,
  Place,
  Restaurant,
  Stay,
  TransportOption,
  Route,
  RoutingMode,
  TransportMode,
  PlaceType,
  PriceLevel,
  StayCategory,
  StayComfortLevel,
  GeoPoint,
} from "../types";

export interface DestinationFilter {
  query: string;
  limit?: number;
}

export interface DestinationProvider {
  searchDestinations(filter: DestinationFilter): Promise<Destination[]>;
  getDestination(id: string): Promise<Destination | null>;
  resolveDestination(query: string): Promise<Destination | null>;
}

export interface PlaceFilter {
  destinationId: string;
  type?: PlaceType;
  tags?: string[];
  priceLevel?: PriceLevel;
  minRating?: number;
  limit?: number;
  latitude?: number;
  longitude?: number;
}

export interface PlaceProvider {
  searchPlaces(filter: PlaceFilter): Promise<Place[]>;
  getPlace(id: string): Promise<Place | null>;
}

export interface StayFilter {
  destinationId: string;
  category?: StayCategory;
  maxPricePerNight?: number;
  minRating?: number;
  limit?: number;
  latitude?: number;
  longitude?: number;
  budgetTier?: string;
  comfortLevel?: StayComfortLevel;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  rooms?: number;
  guests?: number;
}

export interface StayProvider {
  searchStays(filter: StayFilter): Promise<Stay[]>;
  getStay(id: string): Promise<Stay | null>;
}

export interface TransportFilter {
  origin: string;
  destination: string;
  date?: string;
  returnDate?: string;
  travellers?: number;
  preferredModes?: TransportMode[];
  maxStops?: number;
  cabinClass?: "economy" | "premium_economy" | "business" | "first";
}

export interface TransportProvider {
  searchTransport(filter: TransportFilter): Promise<TransportOption[]>;
}

export interface RestaurantFilter {
  destinationId: string;
  cuisine?: string;
  priceLevel?: PriceLevel;
  minRating?: number;
  limit?: number;
  latitude?: number;
  longitude?: number;
  mealType?: string;
}

export interface FoodProvider {
  searchRestaurants(filter: RestaurantFilter): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant | null>;
}

export interface RouteRequest {
  origin: GeoPoint | string;
  destination: GeoPoint | string;
  mode: RoutingMode;
}

export interface MapProvider {
  getRoute(request: RouteRequest): Promise<Route>;
}

export interface DestinationImageResult {
  url: string;
  photographer?: string;
  photographerUrl?: string;
  alt?: string;
  source: import("../types").SourceMetadata;
}

export interface ImageProvider {
  getDestinationImage(query: string): Promise<DestinationImageResult | null>;
}

