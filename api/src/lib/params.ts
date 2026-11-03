import { z } from "zod";
import { MEAL_SLOTS } from "shared";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const recipeIngredientLineParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  lineId: z.coerce.number().int().positive(),
});

export const weekParamSchema = z.object({
  weekStartDate: z.iso.date(),
});

export const slotParamSchema = z.object({
  weekStartDate: z.iso.date(),
  day: z.coerce.number().int().min(0).max(6),
  mealSlot: z.enum(MEAL_SLOTS),
});

export const candidatesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
