import { z } from "zod";

export const createPantryItemSchema = z.object({
  ingredientId: z
    .number({ error: "Ingredient is required" })
    .int("Ingredient id must be a whole number")
    .positive("Ingredient id must be greater than 0"),
  amountBase: z
    .number({ error: "Amount is required" })
    .positive("Amount must be greater than 0"),
  displayAmount: z
    .number({ error: "Display amount must be a number" })
    .positive("Display amount must be greater than 0")
    .optional(),
  displayUnit: z
    .string({ error: "Display unit can't be blank" })
    .min(1, "Display unit can't be blank")
    .max(50, "Display unit must be 50 characters or fewer")
    .optional(),
  expiresOn: z.iso.date({ error: "Expiry date must be YYYY-MM-DD" }).optional(),
});

export type CreatePantryItemInput = z.infer<typeof createPantryItemSchema>;
