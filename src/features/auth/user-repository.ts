/**
 * @file src/features/auth/user-repository.ts
 *
 * Authoritative user repository.
 * Persists user identities and bcrypt password hashes in PostgreSQL (when configured)
 * or resilient in-memory store in local environments.
 * Safe projections never return password hashes to client callers.
 */

import { eq } from "drizzle-orm";
import { db, schema, isDatabaseConfigured } from "@/lib/db";
import { User } from "./types";

export interface UserRecord extends User {
  passwordHash?: string | null;
  cachedAt?: number;
}

declare global {
  var __memUsersRecord: Map<string, UserRecord> | undefined;
  var __memUsers: Map<string, User> | undefined;
}

const memUsers = (global.__memUsersRecord ??= new Map<string, UserRecord>());
const CACHE_TTL_MS = 60_000; // 60 seconds bounded cache

function isRecordFresh(record: UserRecord): boolean {
  if (!isDatabaseConfigured) return true;
  if (!record.cachedAt) return true;
  return Date.now() - record.cachedAt < CACHE_TTL_MS;
}

function getMemRecord(userId: string): UserRecord | null {
  const direct = memUsers.get(userId);
  if (direct) return direct;

  const legacy = global.__memUsers?.get(userId);
  if (legacy) {
    const rec: UserRecord = {
      id: legacy.id,
      name: legacy.name,
      email: legacy.email,
      avatarUrl: legacy.avatarUrl,
      createdAt: legacy.createdAt,
      cachedAt: Date.now(),
    };
    memUsers.set(userId, rec);
    return rec;
  }
  return null;
}

function toSafeUser(record: UserRecord): User {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    avatarUrl: record.avatarUrl || undefined,
    createdAt: record.createdAt,
  };
}

function assertProductionAuthGuards(): void {
  if (process.env.NODE_ENV === "production") {
    if (process.env.ALLOW_DEMO_AUTH === "true") {
      throw new Error(
        "SECURITY_CONFIGURATION_ERROR: ALLOW_DEMO_AUTH is strictly forbidden in production environment.",
      );
    }
    if (!isDatabaseConfigured) {
      throw new Error(
        "PERSISTENCE_CONFIGURATION_ERROR: DATABASE_URL must be configured in production environment for user persistence.",
      );
    }
  }
}

export const UsersRepository = {
  /**
   * Retrieves safe user by ID (excludes password hash).
   */
  async getUserById(userId: string): Promise<User | null> {
    const record = await this.getUserRecordById(userId);
    return record ? toSafeUser(record) : null;
  },

  /**
   * Internal lookup by ID including passwordHash for authentication checks.
   */
  async getUserRecordById(userId: string): Promise<UserRecord | null> {
    assertProductionAuthGuards();

    const mem = getMemRecord(userId);
    if (mem && isRecordFresh(mem)) {
      return mem;
    }

    if (!isDatabaseConfigured) {
      return mem || null;
    }

    try {
      const record = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });

      if (!record) {
        memUsers.delete(userId);
        if (global.__memUsers) global.__memUsers.delete(userId);
        return null;
      }

      const userRecord: UserRecord = {
        id: record.id,
        name: record.name,
        email: record.email,
        passwordHash: record.passwordHash,
        avatarUrl: record.avatarUrl || undefined,
        createdAt: record.createdAt.toISOString(),
        cachedAt: Date.now(),
      };

      memUsers.set(userId, userRecord);
      return userRecord;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("PERSISTENCE_ERROR: Failed to retrieve user from database.");
      }
      console.warn("Database getUserRecordById error, falling back to memory store:", err);
      return getMemRecord(userId);
    }
  },

  /**
   * Internal lookup by email including passwordHash.
   */
  async getUserRecordByEmail(email: string): Promise<UserRecord | null> {
    assertProductionAuthGuards();

    const normalized = email.trim().toLowerCase();

    for (const user of memUsers.values()) {
      if (user.email.toLowerCase() === normalized && isRecordFresh(user)) {
        return user;
      }
    }

    if (!isDatabaseConfigured) {
      for (const user of memUsers.values()) {
        if (user.email.toLowerCase() === normalized) {
          return user;
        }
      }
      return null;
    }

    try {
      const record = await db.query.users.findFirst({
        where: eq(schema.users.email, normalized),
      });

      if (!record) {
        for (const [id, u] of memUsers.entries()) {
          if (u.email.toLowerCase() === normalized) {
            memUsers.delete(id);
          }
        }
        return null;
      }

      const userRecord: UserRecord = {
        id: record.id,
        name: record.name,
        email: record.email,
        passwordHash: record.passwordHash,
        avatarUrl: record.avatarUrl || undefined,
        createdAt: record.createdAt.toISOString(),
        cachedAt: Date.now(),
      };

      memUsers.set(record.id, userRecord);
      return userRecord;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("PERSISTENCE_ERROR: Failed to retrieve user by email from database.");
      }
      console.warn("Database getUserRecordByEmail error, falling back to memory store:", err);
      for (const user of memUsers.values()) {
        if (user.email.toLowerCase() === normalized) {
          return user;
        }
      }
      return null;
    }
  },

  /**
   * Creates a new user record with a verified bcrypt password hash.
   */
  async createUser(input: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    avatarUrl?: string;
  }): Promise<User> {
    assertProductionAuthGuards();

    const now = new Date().toISOString();
    const normalizedEmail = input.email.trim().toLowerCase();

    const record: UserRecord = {
      id: input.id,
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      avatarUrl: input.avatarUrl,
      createdAt: now,
      cachedAt: Date.now(),
    };

    memUsers.set(input.id, record);

    if (isDatabaseConfigured) {
      try {
        await db.insert(schema.users).values({
          id: input.id,
          name: record.name,
          email: normalizedEmail,
          passwordHash: input.passwordHash,
          avatarUrl: input.avatarUrl || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("PERSISTENCE_ERROR: Failed to persist user in database.");
        }
        console.warn("Database createUser error, retained in memory store:", err);
      }
    }

    return toSafeUser(record);
  },

  /**
   * Updates user's name.
   */
  async updateUserName(userId: string, name: string): Promise<User | null> {
    assertProductionAuthGuards();

    const trimmed = name.trim();

    // Update in-memory store
    const mem = getMemRecord(userId);
    if (mem) {
      mem.name = trimmed;
      mem.cachedAt = Date.now();
    }
    if (global.__memUsers?.has(userId)) {
      const legacy = global.__memUsers.get(userId)!;
      legacy.name = trimmed;
    }

    if (!isDatabaseConfigured) {
      if (!mem) return null;
      return toSafeUser(mem);
    }

    try {
      await db
        .update(schema.users)
        .set({
          name: trimmed,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));

      return await this.getUserById(userId);
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("PERSISTENCE_ERROR: Failed to update user name in database.");
      }
      console.warn("Database updateUserName error, falling back to memory store:", err);
      if (mem) return toSafeUser(mem);
      return null;
    }
  },

  /**
   * Deletes a user record and immediately clears memory cache.
   */
  async deleteUser(userId: string): Promise<boolean> {
    assertProductionAuthGuards();
    memUsers.delete(userId);
    if (global.__memUsers) {
      global.__memUsers.delete(userId);
    }
    if (!isDatabaseConfigured) {
      return true;
    }
    try {
      await db.delete(schema.users).where(eq(schema.users.id, userId));
      return true;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("PERSISTENCE_ERROR: Failed to delete user from database.");
      }
      console.warn("Database deleteUser error:", err);
      return true;
    }
  },
};
