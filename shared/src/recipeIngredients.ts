import { z } from "zod";

export const recipeIngredientLineSchema = z
  .object({
    ingredientId: z
      .number({ error: "Ingredient is required" })
      .int("Ingredient id must be a whole number")
      .positive("Ingredient id must be greater than 0"),
    amountBase: z
      .number({ error: "Amount must be a number" })
      .positive("Amount must be greater than 0")
      .optional(),
    displayAmount: z
      .number({ error: "Display amount must be a number" })
      .positive("Display amount must be greater than 0")
      .optional(),
    displayUnit: z
      .string({ error: "Display unit can't be blank" })
      .min(1, "Display unit can't be blank")
      .max(50, "Display unit must be 50 characters or fewer")
      .optional(),
    isOptional: z.boolean({ error: "isOptional must be true or false" }).optional(),
  })
  .refine((data) => (data.displayAmount === undefined) === (data.displayUnit === undefined), {
    message: "Display amount and display unit must be given together",
    path: ["displayUnit"],
  });

export type RecipeIngredientLineInput = z.infer<typeof recipeIngredientLineSchema>;
