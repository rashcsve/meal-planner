import { z } from "zod";

export const generatePlanSchema = z.object({
  weekStartDate: z.iso.date({ error: "Week start date must be YYYY-MM-DD" }),
  seed: z.number({ error: "Seed must be a number" }).int("Seed must be a whole number"),
});

export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;

export const replaceSlotSchema = z.object({
  recipeId: z
    .number({ error: "Recipe is required" })
    .int("Recipe id must be a whole number")
    .positive("Recipe id must be greater than 0"),
});

export type ReplaceSlotInput = z.infer<typeof replaceSlotSchema>;
