import { eq, desc } from "drizzle-orm";
import { db, schema, isDatabaseConfigured } from "@/lib/db";
import type { User } from "@/features/auth/types";
import type { Trip, TripWithPreferences, CreateTripInput, TripVersion } from "./types";

/**
 * Resilient In-Memory store for development environments without a live PostgreSQL instance.
 * Allows full Phase 3 trip creation, review, detail resolution, and dashboard integration
 * while ensuring identical behavior when PostgreSQL is attached.
 */
declare global {
  var __memUsers: Map<string, User> | undefined;
  var __memTrips: Map<string, TripWithPreferences> | undefined;
  var __memTripVersions: Map<string, TripVersion[]> | undefined;
}

const memUsers = (global.__memUsers ??= new Map<string, User>());
const memTrips = (global.__memTrips ??= new Map<string, TripWithPreferences>());
const memTripVersions = (global.__memTripVersions ??= new Map<string, TripVersion[]>());
const memTripTimestamps = new Map<string, number>();
const CACHE_TTL_MS = 60_000; // 60 seconds bounded cache

function isTripFresh(tripId: string): boolean {
  if (!isDatabaseConfigured) return true;
  const cachedAt = memTripTimestamps.get(tripId);
  if (!cachedAt) return true;
  return Date.now() - cachedAt < CACHE_TTL_MS;
}

function cloneTrip(trip: TripWithPreferences): TripWithPreferences {
  return {
    ...trip,
    originCanonical: trip.originCanonical ? { ...trip.originCanonical } : null,
    plan: trip.plan ? JSON.parse(JSON.stringify(trip.plan)) : null,
    preferences: trip.preferences
      ? {
          ...trip.preferences,
          interests: [...trip.preferences.interests],
        }
      : null,
  };
}

function assertProductionPersistenceGuards(): void {
  if (process.env.NODE_ENV === "production") {
    if (process.env.ALLOW_DEMO_STORE === "true") {
      throw new Error(
        "SECURITY_CONFIGURATION_ERROR: ALLOW_DEMO_STORE is strictly forbidden in production environment.",
      );
    }
    if (!isDatabaseConfigured) {
      throw new Error(
        "PERSISTENCE_CONFIGURATION_ERROR: DATABASE_URL must be configured in production environment (NODE_ENV=production). In-memory persistence fallback is strictly forbidden in production.",
      );
    }
  }
}

export const TripsRepository = {
  /**
   * Idempotently ensures the authenticated user exists in the database.
   */
  async ensureUser(user: User): Promise<void> {
    assertProductionPersistenceGuards();
    memUsers.set(user.id, user);


    if (global.__memUsersRecord) {
      const existing = global.__memUsersRecord.get(user.id);
      global.__memUsersRecord.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        passwordHash: existing?.passwordHash,
      });
    }

    if (!isDatabaseConfigured) return;

    try {
      await db
        .insert(schema.users)
        .values({
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        })
        .onConflictDoUpdate({
          target: schema.users.id,
          set: {
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      console.warn("Database ensureUser error, falling back to memory store:", err);
    }
  },

  /**
   * Creates a trip and its preferences under the authenticated user.
   */
  async createTrip(
    userId: string,
    title: string,
    input: CreateTripInput,
  ): Promise<TripWithPreferences> {
    const tripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const prefId = `pref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const origin = input.origin?.trim() || null;
    const transportPreference = input.transportPreference || "auto";

    const createdRecord: TripWithPreferences = {
      id: tripId,
      userId,
      title,
      origin,
      originCanonical: null,
      destination: input.destination,
      days: input.days,
      travellers: input.travellers,
      budget: input.budget,
      status: "planning",
      isSaved: false,
      plan: null,
      createdAt: now,
      updatedAt: now,
      preferences: {
        id: prefId,
        tripId,
        transportPreference,
        interests: input.interests,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      },
    };

    assertProductionPersistenceGuards();

    // Store in memory
    memTrips.set(tripId, createdRecord);
    memTripTimestamps.set(tripId, Date.now());

    if (!isDatabaseConfigured) {
      return createdRecord;
    }


    try {
      // PostgreSQL transaction
      await db.transaction(async (tx) => {
        await tx.insert(schema.trips).values({
          id: tripId,
          userId,
          title,
          origin,
          destination: input.destination,
          days: input.days,
          travellers: input.travellers,
          budget: input.budget,
          status: "planning",
          isSaved: false,
          plan: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await tx.insert(schema.tripPreferences).values({
          id: prefId,
          tripId,
          transportPreference,
          interests: input.interests,
          notes: input.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      } catch (err) {
        console.error("Database createTrip transaction error:", err);
        if (process.env.NODE_ENV === "production") {
          throw new Error("PERSISTENCE_ERROR: Failed to persist journey in database.");
        }
        // In development, preserve record in memory store with warning
        console.warn("Retaining journey record in development memory store.");
      }

      return createdRecord;
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
      const now = new Date().toISOString();
      assertProductionPersistenceGuards();

      // Strict ownership check in memory
      const mem = memTrips.get(tripId);
      if (mem && mem.userId !== userId) {
        return null;
      }

      if (mem) {
        mem.plan = plan;
        mem.status = status;
        mem.updatedAt = now;
        memTripTimestamps.set(tripId, Date.now());
      }

      if (!isDatabaseConfigured) {
        return mem || null;
      }

      try {
        const existing = await db.query.trips.findFirst({
          where: eq(schema.trips.id, tripId),
        });

        if (!existing || existing.userId !== userId) {
          return null;
        }

        await db
          .update(schema.trips)
          .set({
            plan,
            status,
            updatedAt: new Date(),
          })
          .where(eq(schema.trips.id, tripId));

        return await this.getTripById(tripId, userId);
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("PERSISTENCE_ERROR: Failed to update journey plan in database.");
        }
        console.warn("Database updateTripPlan error, retained in memory store:", err);
        return mem || null;
      }
    },

    /**
     * Updates trip status transactionally (e.g. marking journey as completed).
     */
    async updateTripStatus(
      tripId: string,
      userId: string,
      status: import("@/types").TripStatus,
    ): Promise<TripWithPreferences | null> {
      const now = new Date().toISOString();

      assertProductionPersistenceGuards();

      // Strict ownership check in memory
      const mem = memTrips.get(tripId);
      if (mem && mem.userId !== userId) {
        return null;
      }

      if (mem) {
        mem.status = status;
        mem.updatedAt = now;
        memTripTimestamps.set(tripId, Date.now());
      }

      if (!isDatabaseConfigured) {
        return mem || null;
      }

      try {
        const existing = await db.query.trips.findFirst({
          where: eq(schema.trips.id, tripId),
        });

        if (!existing || existing.userId !== userId) {
          return null;
        }

        await db
          .update(schema.trips)
          .set({
            status,
            updatedAt: new Date(),
          })
          .where(eq(schema.trips.id, tripId));

        return await this.getTripById(tripId, userId);
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("PERSISTENCE_ERROR: Failed to update journey status in database.");
        }
        console.warn("Database updateTripStatus error, retained in memory store:", err);
        return mem || null;
      }
    },



    /**
     * Retrieves a single trip by ID scoped to the authenticated user.
     */
    async getTripById(tripId: string, userId: string): Promise<TripWithPreferences | null> {
      assertProductionPersistenceGuards();

      // In-memory cache check for instant SSR and fast navigation (bounded by freshness TTL)
      const mem = memTrips.get(tripId);
      if (mem && isTripFresh(tripId)) {
        if (mem.userId !== userId) return null;
        return cloneTrip(mem);
      }

      if (!isDatabaseConfigured) {
        if (!mem || mem.userId !== userId) return null;
        return cloneTrip(mem);
      }

      try {
        const record = await db.query.trips.findFirst({
          where: eq(schema.trips.id, tripId),
          with: {
            preferences: true,
          },
        });

        if (!record || record.userId !== userId) {
          if (!record) {
            memTrips.delete(tripId);
            memTripTimestamps.delete(tripId);
          }
          return null;
        }

        const tripRecord: TripWithPreferences = {
          id: record.id,
          userId: record.userId,
          title: record.title,
          origin: record.origin ?? null,
          originCanonical: (record.originCanonical as import("@/lib/travel").Destination) ?? null,
          destination: record.destination,
          days: record.days,
          travellers: record.travellers,
          budget: record.budget,
          status: record.status,
          isSaved: record.isSaved ?? false,
          plan: (record.plan as import("@/lib/orchestration/types").OrchestrationResult) ?? null,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
          preferences: record.preferences
            ? {
                id: record.preferences.id,
                tripId: record.preferences.tripId,
                transportPreference: (record.preferences.transportPreference as import("./types").TransportPreference) || "auto",
                interests: record.preferences.interests,
                notes: record.preferences.notes,
                createdAt: record.preferences.createdAt.toISOString(),
                updatedAt: record.preferences.updatedAt.toISOString(),
              }
            : null,
        };

        memTrips.set(tripId, tripRecord);
        memTripTimestamps.set(tripId, Date.now());
        return cloneTrip(tripRecord);
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("PERSISTENCE_ERROR: Failed to retrieve journey from database.");
        }
        console.warn("Database getTripById error, falling back to memory store:", err);
        const fallbackMem = memTrips.get(tripId);
        if (!fallbackMem || fallbackMem.userId !== userId) return null;
        return cloneTrip(fallbackMem);
      }
    },

    /**
     * Updates trip saved state (bookmarking).
     */
    async updateTripSaved(
      tripId: string,
      userId: string,
      isSaved: boolean,
    ): Promise<TripWithPreferences | null> {
      const now = new Date().toISOString();

      assertProductionPersistenceGuards();

      // Strict ownership check
      const mem = memTrips.get(tripId);
      if (mem && mem.userId !== userId) {
        return null;
      }

      if (mem) {
        mem.isSaved = isSaved;
        mem.updatedAt = now;
        memTripTimestamps.set(tripId, Date.now());
      }

      if (!isDatabaseConfigured) {
        return mem || null;
      }

      try {
        const existing = await db.query.trips.findFirst({
          where: eq(schema.trips.id, tripId),
        });

        if (!existing || existing.userId !== userId) {
          return null;
        }

        await db
          .update(schema.trips)
          .set({
            isSaved,
            updatedAt: new Date(),
          })
          .where(eq(schema.trips.id, tripId));

        return await this.getTripById(tripId, userId);
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("PERSISTENCE_ERROR: Failed to update journey in database.");
        }
        console.warn("Database updateTripSaved error, falling back to memory store:", err);
        return mem || null;
      }
    },

    /**
     * Permanently deletes a trip and its preferences transactionally.
     */
    async deleteTrip(tripId: string, userId: string): Promise<boolean> {
      assertProductionPersistenceGuards();

      // Check in-memory store first
      const mem = memTrips.get(tripId);
      if (mem && mem.userId !== userId) {
        return false;
      }
      const existedInMem = memTrips.has(tripId);
      memTrips.delete(tripId);
      memTripVersions.delete(tripId);
      memTripTimestamps.delete(tripId);

      if (!isDatabaseConfigured) {
        return existedInMem;
      }

      try {
        const existing = await db.query.trips.findFirst({
          where: eq(schema.trips.id, tripId),
        });

        if (!existing) {
          return existedInMem;
        }

        if (existing.userId !== userId) {
          return false;
        }

        await db.transaction(async (tx) => {
          // Explicitly delete child relations in foreign-key dependency order
          await tx.delete(schema.tripVersions).where(eq(schema.tripVersions.tripId, tripId));
          await tx.delete(schema.tripPreferences).where(eq(schema.tripPreferences.tripId, tripId));
          await tx.delete(schema.trips).where(eq(schema.trips.id, tripId));
        });

        return true;
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("PERSISTENCE_ERROR: Failed to delete journey from database.");
        }
        console.warn("Database deleteTrip error, relying on memory store deletion:", err);
        return existedInMem;
      }
    },


    /**
     * Retrieves all trips belonging to the authenticated user.
     */
    async getTripsByUserId(userId: string): Promise<Trip[]> {
      assertProductionPersistenceGuards();

      if (!isDatabaseConfigured) {
        const tripsList = Array.from(memTrips.values())
          .filter((t) => t.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return tripsList;
      }

      try {
        const records = await db.query.trips.findMany({
          where: eq(schema.trips.userId, userId),
          orderBy: [desc(schema.trips.createdAt)],
        });

        return records.map((r) => ({
          id: r.id,
          userId: r.userId,
          title: r.title,
          origin: r.origin ?? null,
          originCanonical: (r.originCanonical as import("@/lib/travel").Destination) ?? null,
          destination: r.destination,
          days: r.days,
          travellers: r.travellers,
          budget: r.budget,
          status: r.status,
          isSaved: r.isSaved ?? false,
          plan: (r.plan as import("@/lib/orchestration/types").OrchestrationResult) ?? null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("PERSISTENCE_ERROR: Failed to retrieve journeys from database.");
        }
        console.warn("Database getTripsByUserId error, falling back to memory store:", err);
        return Array.from(memTrips.values())
          .filter((t) => t.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    },

    /**
     * Retrieves destination and title for metadata generation without requiring user session.
     */
    async getTripDestination(tripId: string): Promise<string | null> {
      if (!tripId) return null;

      const mem = memTrips.get(tripId);
      if (mem?.destination && isTripFresh(tripId)) {
        return mem.destination;
      }

      if (!isDatabaseConfigured) {
        return null;
      }

      try {
        const record = await db.query.trips.findFirst({
          where: eq(schema.trips.id, tripId),
          columns: {
            destination: true,
          },
        });
        if (record?.destination) {
          if (mem) mem.destination = record.destination;
          memTripTimestamps.set(tripId, Date.now());
          return record.destination;
        }
        return null;
      } catch {
        return null;
      }
    },

    /**
     * Persists a version snapshot and monotonically increments version number.
     * If this trip has no recorded versions yet and has an existing plan,
     * automatically seeds Version 1 ("original") first to preserve initial baseline.
     */
    async recordTripVersion(params: {
      tripId: string;
      userId: string;
      scope: string;
      instruction?: string | null;
      changeSummary?: Record<string, unknown> | null;
      snapshot: import("@/lib/orchestration/types").OrchestrationResult;
      totalCost: number;
      currency: string;
      currencySymbol: string;
    }): Promise<TripVersion> {
      assertProductionPersistenceGuards();
      const { tripId, userId, scope, instruction, changeSummary, snapshot, totalCost, currency, currencySymbol } = params;

      // Check existing versions
      let currentVersions = await this.listTripVersions(tripId, userId);

      // If no versions exist yet, seed Version 1 from current trip plan
      if (currentVersions.length === 0) {
        const trip = await this.getTripById(tripId, userId);
        if (trip && trip.plan) {
          const v1Id = `ver_${Date.now() - 1000}_${Math.random().toString(36).substring(2, 7)}`;
          const v1: TripVersion = {
            id: v1Id,
            tripId,
            userId,
            versionNumber: 1,
            scope: "original",
            instruction: "Initial AI journey plan",
            changeSummary: { summary: "Initial generated journey plan" },
            snapshot: trip.plan,
            totalCost: trip.plan.budget?.totalEstimatedCost ?? totalCost,
            currency: trip.plan.budget?.currency ?? currency,
            currencySymbol: trip.plan.budget?.currencySymbol ?? currencySymbol,
            createdAt: trip.createdAt,
          };
          await this.insertVersionRecord(v1);
          currentVersions = [v1];
        }
      }

      const nextVersionNumber = currentVersions.length > 0
        ? Math.max(...currentVersions.map((v) => v.versionNumber)) + 1
        : 1;

      const versionId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newVersion: TripVersion = {
        id: versionId,
        tripId,
        userId,
        versionNumber: nextVersionNumber,
        scope,
        instruction: instruction ?? null,
        changeSummary: changeSummary ?? null,
        snapshot,
        totalCost,
        currency,
        currencySymbol,
        createdAt: new Date().toISOString(),
      };

      await this.insertVersionRecord(newVersion);
      return newVersion;
    },

    /**
     * Internal helper to insert a version into both DB and memory cache.
     */
    async insertVersionRecord(version: TripVersion): Promise<void> {
      assertProductionPersistenceGuards();

      const list = memTripVersions.get(version.tripId) || [];
      // Prevent duplicates in memory
      if (!list.some((v) => v.id === version.id)) {
        list.push(version);
      }
      memTripVersions.set(version.tripId, list);

      if (!isDatabaseConfigured) return;

      try {
        await db.insert(schema.tripVersions).values({
          id: version.id,
          tripId: version.tripId,
          userId: version.userId,
          versionNumber: version.versionNumber,
          scope: version.scope,
          instruction: version.instruction ?? null,
          changeSummary: version.changeSummary ?? null,
          snapshot: version.snapshot,
          totalCost: version.totalCost,
          currency: version.currency,
          currencySymbol: version.currencySymbol,
          createdAt: new Date(version.createdAt),
        });
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("PERSISTENCE_ERROR: Failed to persist journey version in database.");
        }
        console.warn("Database insertVersionRecord error, retained in memory store:", err);
      }
    },

    /**
     * Lists all versions for a trip, ordered by versionNumber descending (newest first).
     * Strict user ownership enforced.
     */
    async listTripVersions(tripId: string, userId: string): Promise<TripVersion[]> {
      assertProductionPersistenceGuards();

      const trip = await this.getTripById(tripId, userId);
      if (!trip) return [];

      let result: TripVersion[] = [];

      if (!isDatabaseConfigured) {
        const list = memTripVersions.get(tripId) || [];
        result = list
          .filter((v) => v.userId === userId)
          .sort((a, b) => b.versionNumber - a.versionNumber);
      } else {
        try {
          const records = await db.query.tripVersions.findMany({
            where: eq(schema.tripVersions.tripId, tripId),
            orderBy: [desc(schema.tripVersions.versionNumber)],
          });

          result = records
            .filter((r) => r.userId === userId)
            .map((r) => ({
              id: r.id,
              tripId: r.tripId,
              userId: r.userId,
              versionNumber: r.versionNumber,
              scope: r.scope,
              instruction: r.instruction,
              changeSummary: (r.changeSummary as Record<string, unknown>) ?? null,
              snapshot: r.snapshot as import("@/lib/orchestration/types").OrchestrationResult,
              totalCost: r.totalCost,
              currency: r.currency,
              currencySymbol: r.currencySymbol,
              createdAt: r.createdAt.toISOString(),
            }));
        } catch (err) {
          if (process.env.NODE_ENV === "production") {
            throw new Error("PERSISTENCE_ERROR: Failed to retrieve journey versions from database.");
          }
          console.warn("Database listTripVersions error, falling back to memory store:", err);
          const list = memTripVersions.get(tripId) || [];
          result = list
            .filter((v) => v.userId === userId)
            .sort((a, b) => b.versionNumber - a.versionNumber);
        }
      }

      // Auto-seed Version 1 if trip already has completed plan but no versions yet


      if (result.length === 0 && trip.plan && trip.plan.status === "completed") {
        const v1Id = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const v1: TripVersion = {
          id: v1Id,
          tripId,
          userId,
          versionNumber: 1,
          scope: "original",
          instruction: "Initial AI journey plan",
          changeSummary: { summary: "Initial generated journey plan" },
          snapshot: trip.plan,
          totalCost: trip.plan.budget?.totalEstimatedCost ?? 0,
          currency: trip.plan.budget?.currency ?? "USD",
          currencySymbol: trip.plan.budget?.currencySymbol ?? "$",
          createdAt: trip.createdAt,
        };
        await this.insertVersionRecord(v1);
        return [v1];
      }

      return result;
    },

    /**
     * Retrieves a specific version by ID with strict ownership validation.
     */
    async getTripVersion(tripId: string, versionId: string, userId: string): Promise<TripVersion | null> {
      const versions = await this.listTripVersions(tripId, userId);
      return versions.find((v) => v.id === versionId) || null;
    },

    /**
     * Atomically restores an itinerary version snapshot without losing subsequent versions.
     * Creates a new version with scope 'restore' and updates the active trip plan.
     */
    async restoreTripVersion(
      tripId: string,
      versionId: string,
      userId: string,
    ): Promise<
      | {
          success: true;
          plan: import("@/lib/orchestration/types").OrchestrationResult;
          restoredVersion: TripVersion;
          newVersion: TripVersion;
        }
      | { success: false; error: string }
    > {
      const trip = await this.getTripById(tripId, userId);
      if (!trip) {
        return { success: false, error: "Journey not found or unauthorized." };
      }

      const targetVersion = await this.getTripVersion(tripId, versionId, userId);
      if (!targetVersion) {
        return { success: false, error: "Specified version not found." };
      }

      const snapshot = targetVersion.snapshot;
      if (!snapshot || snapshot.status !== "completed") {
        return { success: false, error: "Target version snapshot is incomplete or invalid." };
      }

      // Update the active trip plan
      const updatedTrip = await this.updateTripPlan(tripId, userId, snapshot, "upcoming");
      if (!updatedTrip) {
        return { success: false, error: "Failed to apply restored plan to journey." };
      }

      // Append new version for the restore event
      const newVersion = await this.recordTripVersion({
        tripId,
        userId,
        scope: "restore",
        instruction: `Restored to Version ${targetVersion.versionNumber}`,
        changeSummary: {
          summary: `Restored journey to Version ${targetVersion.versionNumber} (${targetVersion.scope})`,
          restoredFromVersion: targetVersion.versionNumber,
          originalInstruction: targetVersion.instruction,
        },
        snapshot,
        totalCost: targetVersion.totalCost,
        currency: targetVersion.currency,
        currencySymbol: targetVersion.currencySymbol,
      });

      return {
        success: true,
        plan: snapshot,
        restoredVersion: targetVersion,
        newVersion,
      };
    },
  };



