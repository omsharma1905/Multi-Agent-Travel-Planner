/**
 * @file src/lib/travel/validators/travel-schemas.ts
 *
 * Runtime Zod schemas for validating provider responses at the system boundary.
 * Prevents invalid external or mock data from leaking into domain consumers.
 */

import { z } from "zod";

export const sourceMetadataSchema = z.object({
  provider: z.string().min(1),
  providerId: z.string().optional(),
  fetchedAt: z.string().datetime(),
  isEstimate: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
  cached: z.boolean().optional(),
  sourceUrl: z.string().url().optional(),
  attribution: z.string().optional(),
});


export const dayScheduleSchema = z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  isClosed: z.boolean().optional(),
  isUnknown: z.boolean().optional(),
});

export const openingHoursSchema = z.object({
  monday: dayScheduleSchema.optional(),
  tuesday: dayScheduleSchema.optional(),
  wednesday: dayScheduleSchema.optional(),
  thursday: dayScheduleSchema.optional(),
  friday: dayScheduleSchema.optional(),
  saturday: dayScheduleSchema.optional(),
  sunday: dayScheduleSchema.optional(),
  text: z.string().nullable().optional(),
  isAlwaysOpen: z.boolean().optional(),
  isUnknown: z.boolean().optional(),
});

export const destinationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  country: z.string().min(1),
  countryCode: z.string().length(2),
  region: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  description: z.string(),
  aliases: z.array(z.string()),
  imageUrl: z.string().url().optional(),
  source: sourceMetadataSchema,
});

export const placeTypeSchema = z.enum([
  "attraction",
  "museum",
  "landmark",
  "park",
  "beach",
  "temple",
  "viewpoint",
  "market",
  "neighborhood",
  "activity",
]);

export const priceLevelSchema = z.enum(["free", "budget", "moderate", "expensive", "luxury"]);
export const placePriceTypeSchema = z.enum(["free", "paid", "unknown"]);

export const placeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: placeTypeSchema,
  destinationId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  priceLevel: priceLevelSchema,
  address: z.string(),
  description: z.string(),
  openingHours: openingHoursSchema.nullable().optional(),
  website: z.string().url().optional(),
  tags: z.array(z.string()),
  source: sourceMetadataSchema,
  estimatedDurationMinutes: z.number().int().positive().optional(),
  ticketPrice: z.number().nonnegative().nullable().optional(),
  currency: z.string().optional(),
  isPriceEstimate: z.boolean().optional(),
  priceType: placePriceTypeSchema.optional(),
  imageUrl: z.string().optional(),
  googlePlaceId: z.string().optional(),
  googleMapsUri: z.string().optional(),
});

export const restaurantPriceTypeSchema = z.enum(["free", "budget", "moderate", "premium", "unknown"]);
export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "cafe", "snack"]);

export const restaurantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  destinationId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  cuisine: z.array(z.string()).min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  priceLevel: priceLevelSchema,
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  address: z.string(),
  openingHours: openingHoursSchema.nullable().optional(),
  website: z.string().url().optional(),
  tags: z.array(z.string()),
  source: sourceMetadataSchema,
  mealTypes: z.array(mealTypeSchema).optional(),
  averagePricePerPerson: z.number().nonnegative().nullable().optional(),
  currency: z.string().optional(),
  priceType: restaurantPriceTypeSchema.optional(),
  isPriceEstimate: z.boolean().optional(),
  dietaryOptions: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  googlePlaceId: z.string().optional(),
  googleMapsUri: z.string().optional(),
});

export const stayCategorySchema = z.enum([
  "hotel",
  "resort",
  "villa",
  "boutique",
  "hostel",
  "ryokan",
  "apartment",
]);

export const stayComfortLevelSchema = z.enum([
  "budget",
  "standard",
  "comfort",
  "premium",
  "luxury",
]);

export const stayPriceTypeSchema = z.enum([
  "exact",
  "estimated",
  "free",
  "unknown",
]);

export const stayAvailabilitySchema = z.enum([
  "available",
  "limited",
  "sold_out",
  "unknown",
]);

export const staySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  destinationId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string(),
  category: stayCategorySchema,
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  pricePerNight: z.number().nonnegative().nullable(),
  currency: z.string().min(3).max(3),
  amenities: z.array(z.string()),
  checkIn: z.string(),
  checkOut: z.string(),
  description: z.string(),
  website: z.string().url().optional(),
  bookingUrl: z.string().url().optional(),
  source: sourceMetadataSchema,
  comfortLevel: stayComfortLevelSchema.optional(),
  priceType: stayPriceTypeSchema.optional(),
  isPriceEstimate: z.boolean().optional(),
  totalStayPrice: z.number().nonnegative().nullable().optional(),
  availability: stayAvailabilitySchema.optional(),
  roomType: z.string().optional(),
  imageUrl: z.string().optional(),
  googlePlaceId: z.string().optional(),
  googleMapsUri: z.string().optional(),
});

export const transportModeSchema = z.enum([
  "flight",
  "train",
  "bus",
  "car",
  "taxi",
  "metro",
  "ferry",
  "walk",
]);

export const transportOptionSchema = z.object({
  id: z.string().min(1),
  mode: transportModeSchema,
  provider: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureTime: z.string().nullable().optional(),
  arrivalTime: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  price: z.number().nonnegative().nullable(),
  currency: z.string().min(1),
  stops: z.number().int().nonnegative().nullable().optional(),
  availability: z.enum(["available", "limited", "sold_out", "unknown"]),
  bookingUrl: z.string().url().nullable().optional(),
  isEstimate: z.boolean().optional(),
  source: sourceMetadataSchema,
});

export const routingModeSchema = z.enum(["drive", "transit", "walk", "fly"]);

export const routeSchema = z.object({
  origin: z.union([
    z.string(),
    z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  ]),
  destination: z.union([
    z.string(),
    z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  ]),
  distanceKm: z.number().nonnegative(),
  durationMinutes: z.number().nonnegative(),
  mode: routingModeSchema,
  geometry: z.string().optional(),
  source: sourceMetadataSchema,
});

export const destinationImageResultSchema = z.object({
  url: z.string().url(),
  photographer: z.string().optional(),
  photographerUrl: z.string().optional(),
  alt: z.string().optional(),
  source: sourceMetadataSchema,
});

export const componentAvailabilitySchema = z.object({
  status: z.enum(["available", "partial", "unavailable"]),
  reason: z.string().optional(),
  error: z.string().optional(),
});

export const tripContextSchema = z.object({
  trip: z.record(z.unknown()),
  transportPreference: z.enum(["auto", "flight", "train", "bus", "car"]).default("auto"),
  origin: destinationSchema.nullable(),
  destination: destinationSchema,
  imagery: z.object({
    hero: destinationImageResultSchema.nullable(),
    additional: z.array(destinationImageResultSchema).optional(),
  }),
  candidateStays: z.array(staySchema),
  candidatePlaces: z.array(placeSchema),
  candidateRestaurants: z.array(restaurantSchema),
  candidateTransport: z.array(transportOptionSchema),
  routes: z.array(routeSchema),
  availability: z.object({
    origin: componentAvailabilitySchema,
    destination: componentAvailabilitySchema,
    imagery: componentAvailabilitySchema,
    stays: componentAvailabilitySchema,
    places: componentAvailabilitySchema,
    food: componentAvailabilitySchema,
    transport: componentAvailabilitySchema,
    routes: componentAvailabilitySchema,
  }),
  sourceSummary: z.object({
    realProviders: z.array(z.string()),
    estimatedProviders: z.array(z.string()),
    unavailableProviders: z.array(z.string()),
  }),
  readiness: z.enum(["ready", "partial", "blocked"]),
  assembledAt: z.string().datetime(),
});

