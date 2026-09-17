import { z } from "zod";

// Revision starts at 1 and only ever increments; 0 is never a valid value.
const expectedRevisionSchema = z
  .number({ error: "Expected revision must be a number" })
  .int("Expected revision must be a whole number")
  .positive("Expected revision must be at least 1");

export const generatePlanSchema = z.object({
  weekStartDate: z.iso.date({ error: "Week start date must be YYYY-MM-DD" }),
  seed: z.number({ error: "Seed must be a number" }).int("Seed must be a whole number"),
  // Omitted only for a week's very first generation, before it has a revision.
  expectedRevision: expectedRevisionSchema.optional(),
});

export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;

export const replaceSlotSchema = z.object({
  recipeId: z
    .number({ error: "Recipe is required" })
    .int("Recipe id must be a whole number")
    .positive("Recipe id must be greater than 0"),
  expectedRevision: expectedRevisionSchema,
});

export type ReplaceSlotInput = z.infer<typeof replaceSlotSchema>;

export const setSlotLockedSchema = z.object({
  expectedRevision: expectedRevisionSchema,
});

export type SetSlotLockedInput = z.infer<typeof setSlotLockedSchema>;
