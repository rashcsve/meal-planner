import { z } from "zod";
import { BASE_UNITS } from "./recipes.js";

export const createIngredientSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or fewer"),
  baseUnit: z.enum(BASE_UNITS, { error: "Select a valid base unit" }),
  kcalPer100g: z
    .number({ error: "Calories must be a number" })
    .nonnegative("Calories must be zero or more")
    .optional(),
  proteinPer100g: z
    .number({ error: "Protein must be a number" })
    .nonnegative("Protein must be zero or more")
    .optional(),
  carbsPer100g: z
    .number({ error: "Carbs must be a number" })
    .nonnegative("Carbs must be zero or more")
    .optional(),
  fatPer100g: z
    .number({ error: "Fat must be a number" })
    .nonnegative("Fat must be zero or more")
    .optional(),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
