import { pgTable, text, integer, timestamp, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Enums
 */
export const tripStatusEnum = pgEnum("trip_status", [
  "planning",
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
  "failed",
]);

export const budgetTierEnum = pgEnum("budget_tier", [
  "budget",
  "moderate",
  "premium",
  "luxury",
]);

export const transportPreferenceEnum = pgEnum("transport_preference", [
  "auto",
  "flight",
  "train",
  "bus",
  "car",
]);

/**
 * Users Table
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Trips Table
 */
export const trips = pgTable("trips", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  origin: text("origin"),
  originCanonical: jsonb("origin_canonical"),
  destination: text("destination").notNull(),
  days: integer("days").notNull(),
  travellers: integer("travellers").notNull(),
  budget: budgetTierEnum("budget").notNull(),
  status: tripStatusEnum("status").default("planning").notNull(),
  isSaved: boolean("is_saved").default(false).notNull(),
  plan: jsonb("plan"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});


/**
 * Trip Preferences Table
 */
export const tripPreferences = pgTable("trip_preferences", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .unique()
    .references(() => trips.id, { onDelete: "cascade" }),
  transportPreference: transportPreferenceEnum("transport_preference").default("auto").notNull(),
  interests: text("interests").array().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Trip Versions Table (Phase 20)
 */
export const tripVersions = pgTable("trip_versions", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  scope: text("scope").notNull(),
  instruction: text("instruction"),
  changeSummary: jsonb("change_summary"),
  snapshot: jsonb("snapshot").notNull(),
  totalCost: integer("total_cost").notNull(),
  currency: text("currency").notNull().default("USD"),
  currencySymbol: text("currency_symbol").notNull().default("$"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Drizzle Relations
 */
export const usersRelations = relations(users, ({ many }) => ({
  trips: many(trips),
  tripVersions: many(tripVersions),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id],
  }),
  preferences: one(tripPreferences, {
    fields: [trips.id],
    references: [tripPreferences.tripId],
  }),
  versions: many(tripVersions),
}));

export const tripPreferencesRelations = relations(tripPreferences, ({ one }) => ({
  trip: one(trips, {
    fields: [tripPreferences.tripId],
    references: [trips.id],
  }),
}));

export const tripVersionsRelations = relations(tripVersions, ({ one }) => ({
  trip: one(trips, {
    fields: [tripVersions.tripId],
    references: [trips.id],
  }),
  user: one(users, {
    fields: [tripVersions.userId],
    references: [users.id],
  }),
}));

