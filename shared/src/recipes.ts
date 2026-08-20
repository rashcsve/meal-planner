import { z } from "zod";

export const createRecipeSchema = z.object({
  title: z.string().min(1),
  time: z.number().int().positive(),
  kcal: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  meal: z.enum(["lunch", "dinner", "breakfast", "dessert", "drink", "snack", "soup", "salad"]).optional(),
  cuisine: z.string().min(1).optional(),
  protein: z.string().min(1).optional(),
  diet: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
