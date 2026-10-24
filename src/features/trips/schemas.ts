import { z } from "zod";

export const transportPreferenceEnum = z.enum(["auto", "flight", "train", "bus", "car"], {
  errorMap: () => ({ message: "Please select a valid transportation preference" }),
});

export const createTripSchema = z.object({
  origin: z
    .string()
    .trim()
    .min(2, "Origin must be at least 2 characters")
    .max(100, "Origin is too long")
    .optional()
    .or(z.literal("")),
  destination: z
    .string()
    .trim()
    .min(2, "Destination must be at least 2 characters")
    .max(100, "Destination is too long"),

  days: z.coerce
    .number()
    .int("Days must be an integer")
    .min(1, "Journey must be at least 1 day")
    .max(60, "Journey cannot exceed 60 days"),
  travellers: z.coerce
    .number()
    .int("Travellers must be an integer")
    .min(1, "At least 1 traveler is required")
    .max(20, "Maximum 20 travelers per journey"),
  budget: z.enum(["budget", "moderate", "premium", "luxury"], {
    errorMap: () => ({ message: "Please select a valid budget tier" }),
  }),
  transportPreference: transportPreferenceEnum.default("auto"),
  interests: z
    .array(z.string().trim())
    .min(1, "Please select at least one travel interest"),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional(),
}).strict();

export type CreateTripSchemaInput = z.input<typeof createTripSchema>;
