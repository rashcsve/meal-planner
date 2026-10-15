import { z } from "zod";
import { MEAL_SLOTS } from "./planner.js";

export const recipeSnapshotSchema = z.object({
  title: z.string(),
  time: z.number().int(),
  cost: z.number().nullable(),
  meal: z.string().nullable(),
  cuisine: z.string().nullable(),
  proteinSource: z.string().nullable(),
  diet: z.string().nullable(),
  servings: z.number().int().nullable(),
  kcalPerServing: z.number().nullable(),
  ingredients: z.array(
    z.object({
      id: z.number().int(),
      ingredientId: z.number().int(),
      name: z.string(),
      displayAmount: z.number().nullable(),
      displayUnit: z.string().nullable(),
      amountBase: z.number().nullable(),
      baseUnit: z.string(),
      isOptional: z.boolean(),
    }),
  ),
});

export type RecipeSnapshot = z.infer<typeof recipeSnapshotSchema>;

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

export const generatePreviewSchema = generatePlanSchema.omit({ expectedRevision: true });

export type GeneratePreviewInput = z.infer<typeof generatePreviewSchema>;

const inputVersionSchema = z.iso
  .datetime({ error: "Input version must be an ISO timestamp" })
  .transform((value) => new Date(value))
  .nullable();

export const acceptPlanSchema = z.object({
  weekStartDate: z.iso.date({ error: "Week start date must be YYYY-MM-DD" }),
  seed: z.number({ error: "Seed must be a number" }).int("Seed must be a whole number"),
  baseRevision: expectedRevisionSchema.nullable(),
  inputVersions: z.object({
    recipesVersionAt: inputVersionSchema,
    targetsVersionAt: inputVersionSchema,
    exclusionsVersionAt: inputVersionSchema,
  }),
  slots: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        mealSlot: z.enum(MEAL_SLOTS),
        recipeId: z.number().int().positive().nullable(),
      }),
    )
    .min(1, "A plan needs at least one slot"),
});

export type AcceptPlanInput = z.infer<typeof acceptPlanSchema>;

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
