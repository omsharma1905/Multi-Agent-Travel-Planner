/**
 * @file src/types/index.ts
 *
 * Foundational domain types for the Travel Planner application.
 *
 * These types represent the core data model. More detailed interfaces
 * will be added in later phases when the corresponding features are built.
 */

// ---------------------------------------------------------------------------
// Trip
// ---------------------------------------------------------------------------

/**
 * Lifecycle status of a trip.
 *
 * - `planning`   — user is configuring the trip; not yet confirmed
 * - `upcoming`   — trip is confirmed and in the future
 * - `ongoing`    — trip is currently in progress
 * - `completed`  — trip has ended; archived in travel history
 * - `cancelled`  — trip was abandoned by the user
 * - `failed`     — AI agent pipeline encountered an unrecoverable error
 */
export type TripStatus =
  | "planning"
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "failed";

/**
 * Budget tier selected by the user when creating a trip.
 */
export type BudgetTier = "budget" | "moderate" | "premium" | "luxury";

/**
 * Travel style preferences a user can select.
 */
export type TravelPreference =
  | "adventure"
  | "relaxation"
  | "cultural"
  | "foodie"
  | "nature"
  | "nightlife"
  | "family"
  | "romantic"
  | "business";

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------

/**
 * Lifecycle status of a wishlist item.
 */
export type WishlistItemStatus = "saved" | "planning" | "visited";

// ---------------------------------------------------------------------------
// Shared / Utility
// ---------------------------------------------------------------------------

/**
 * Generic paginated response shape.
 * Used when list endpoints are introduced in later phases.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Generic API error response shape.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
