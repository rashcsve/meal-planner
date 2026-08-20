import { z } from "zod";

export const MEAL_TYPES = [
  "lunch",
  "dinner",
  "breakfast",
  "dessert",
  "drink",
  "snack",
  "soup",
  "salad",
] as const;

export const PROTEIN_SOURCES = [
  "chicken",
  "beef",
  "pork",
  "fish",
  "seafood",
  "tofu",
  "legumes",
  "eggs",
  "protein powder",
  "cottage cheese",
  "greek yogurt",
] as const;

export const DIET_TYPES = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "pescatarian",
  "keto",
] as const;

export const createRecipeSchema = z.object({
  title: z
    .string({ error: "Title is required" })
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  description: z
    .string({ error: "Description can't be blank" })
    .min(1, "Description can't be blank")
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
  time: z
    .number({ error: "Enter the time in minutes" })
    .int("Time must be a whole number")
    .positive("Time must be greater than 0"),
  cost: z
    .number({ error: "Cost must be a number" })
    .positive("Cost must be greater than 0")
    .optional(),
  meal: z.enum(MEAL_TYPES, { error: "Select a valid meal type" }).optional(),
  cuisine: z
    .string({ error: "Cuisine can't be blank" })
    .min(1, "Cuisine can't be blank")
    .max(100, "Cuisine must be 100 characters or fewer")
    .optional(),
  proteinSource: z
    .enum(PROTEIN_SOURCES, { error: "Select a valid protein source" })
    .optional(),
  diet: z.enum(DIET_TYPES, { error: "Select a valid diet" }).optional(),
  source: z
    .string({ error: "Source can't be blank" })
    .min(1, "Source can't be blank")
    .max(200, "Source must be 200 characters or fewer")
    .optional(),
  weightG: z
    .number({ error: "Weight must be a number" })
    .positive("Weight must be greater than 0")
    .optional(),
  servings: z
    .number({ error: "Servings must be a number" })
    .int("Servings must be a whole number")
    .positive("Servings must be greater than 0")
    .optional(),
  kcalPer100g: z
    .number({ error: "Kcal must be a number" })
    .positive("Kcal must be greater than 0")
    .optional(),
  proteinPer100g: z
    .number({ error: "Protein must be a number" })
    .nonnegative("Protein can't be negative")
    .optional(),
  carbsPer100g: z
    .number({ error: "Carbs must be a number" })
    .nonnegative("Carbs can't be negative")
    .optional(),
  fatPer100g: z
    .number({ error: "Fat must be a number" })
    .nonnegative("Fat can't be negative")
    .optional(),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
