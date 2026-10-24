import { User } from "@/features/auth/types";
import { TripsRepository } from "./repository";
import { CreateTripSchemaInput } from "./schemas";
import { Trip, TripWithPreferences } from "./types";

export const TripsService = {
  /**
   * Deterministically generates a clean, editorial trip title.
   * e.g., "Kyoto Journey" or "Tokyo, Japan Journey"
   */
  generateTitle(destination: string): string {
    const trimmed = destination.trim();
    if (trimmed.toLowerCase().includes("journey") || trimmed.toLowerCase().includes("trip")) {
      return trimmed;
    }
    return `${trimmed} Journey`;
  },

  /**
   * Handles trip creation: ensures user exists, generates title, creates trip + preferences.
   */
  async createTrip(user: User, input: CreateTripSchemaInput): Promise<TripWithPreferences> {
    await TripsRepository.ensureUser(user);
    const title = this.generateTitle(input.destination);
    return await TripsRepository.createTrip(user.id, title, input);
  },

  /**
   * Retrieves single trip with preferences strictly enforcing ownership.
   */
  async getTrip(tripId: string, userId: string): Promise<TripWithPreferences | null> {
    return await TripsRepository.getTripById(tripId, userId);
  },

  /**
   * Lists trips for the user.
   */
  async listUserTrips(userId: string): Promise<Trip[]> {
    return await TripsRepository.getTripsByUserId(userId);
  },

  /**
   * Updates trip plan and status transactionally.
   */
  async updateTripPlan(
    tripId: string,
    userId: string,
    plan: import("@/lib/orchestration/types").OrchestrationResult,
    status: import("@/types").TripStatus,
  ): Promise<TripWithPreferences | null> {
    return await TripsRepository.updateTripPlan(tripId, userId, plan, status);
  },

  /**
   * Updates trip status directly (e.g. marking journey as completed).
   */
  async updateTripStatus(
    tripId: string,
    userId: string,
    status: import("@/types").TripStatus,
  ): Promise<TripWithPreferences | null> {
    return await TripsRepository.updateTripStatus(tripId, userId, status);
  },

  /**
   * Sets the saved (bookmarked) state of a trip.
   */
  async setTripSaved(
    tripId: string,
    userId: string,
    isSaved: boolean,
  ): Promise<TripWithPreferences | null> {
    return await TripsRepository.updateTripSaved(tripId, userId, isSaved);
  },

  /**
   * Permanently deletes a trip and its preferences.
   */
  async deleteTrip(tripId: string, userId: string): Promise<boolean> {
    return await TripsRepository.deleteTrip(tripId, userId);
  },

  /**
   * Lists all saved trips for the user regardless of lifecycle status.
   */
  async listSavedTrips(userId: string): Promise<Trip[]> {
    const all = await TripsRepository.getTripsByUserId(userId);
    return all.filter((t) => t.isSaved);
  },

  /**
   * Records a new version snapshot for a trip.
   */
  async recordTripVersion(params: Parameters<typeof TripsRepository.recordTripVersion>[0]) {
    return await TripsRepository.recordTripVersion(params);
  },

  /**
   * Lists all version snapshots for a trip (newest first).
   */
  async listTripVersions(tripId: string, userId: string) {
    return await TripsRepository.listTripVersions(tripId, userId);
  },

  /**
   * Retrieves a specific version snapshot.
   */
  async getTripVersion(tripId: string, versionId: string, userId: string) {
    return await TripsRepository.getTripVersion(tripId, versionId, userId);
  },

  /**
   * Restores a specific version snapshot.
   */
  async restoreTripVersion(tripId: string, versionId: string, userId: string) {
    return await TripsRepository.restoreTripVersion(tripId, versionId, userId);
  },
};


