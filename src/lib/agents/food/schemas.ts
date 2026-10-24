/**
 * @file src/lib/agents/food/schemas.ts
 */

import { z } from "zod";

export const restaurantSelectionItemSchema = z.preprocess((val: any) => {
  if (val && typeof val === "object") {
    return {
      restaurantId: val.restaurantId || val.id,
      mealType: val.mealType,
      reason: val.reason || val.name || "Curated dining option.",
      priority: val.priority ?? val.day,
    };
  }
  return val;
}, z.object({
  restaurantId: z.string().min(1),
  mealType: z.enum(["breakfast", "lunch", "dinner", "cafe", "snack"]).optional(),
  reason: z.string().min(1),
  priority: z.number().optional(),
}));

export const foodOutputSchema = z.preprocess((val: any) => {
  if (val && typeof val === "object") {
    const rawList = Array.isArray(val)
      ? val
      : (val.selectedRestaurantIds || val.selectedRestaurants || val.restaurants || val.restaurantIds);
    let selectedRestaurantIds: string[] = [];
    if (Array.isArray(rawList)) {
      selectedRestaurantIds = rawList.map((item: any) => (typeof item === "string" ? item : item.restaurantId || item.id)).filter(Boolean);
    }
    return {
      selectedRestaurantIds,
      selectedRestaurants: Array.isArray(val)
        ? val
        : (Array.isArray(val.selectedRestaurants) ? val.selectedRestaurants : undefined),
      reasoning: (typeof val === "object" && !Array.isArray(val) && val.reasoning) || "Curated dining options reflecting authentic local cuisine.",
    };
  }
  return val;
}, z.object({
  selectedRestaurantIds: z.array(z.string()).min(1),
  selectedRestaurants: z.array(restaurantSelectionItemSchema).optional(),
  reasoning: z.string().min(1),
}));

export type RestaurantSelectionItem = z.infer<typeof restaurantSelectionItemSchema>;
export type FoodAgentOutput = z.infer<typeof foodOutputSchema>;
