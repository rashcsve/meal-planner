import { z } from "zod";

export const createRecipeSchema = z.object({
  title: z.string().min(1),
  minutes: z.number().int().positive(),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
