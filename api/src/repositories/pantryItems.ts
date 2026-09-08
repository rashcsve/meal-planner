import { eq } from "drizzle-orm";
import type { CreatePantryItemInput } from "shared";
import { db } from "../db/index.js";
import { ingredients, pantryItems } from "../db/schema.js";
import { IngredientNotFoundError } from "../lib/errors.js";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "../lib/db.js";

export async function findAllPantryItems() {
  return db
    .select({
      id: pantryItems.id,
      ingredientId: pantryItems.ingredientId,
      ingredientName: ingredients.name,
      amountBase: pantryItems.amountBase,
      displayAmount: pantryItems.displayAmount,
      displayUnit: pantryItems.displayUnit,
      expiresOn: pantryItems.expiresOn,
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(pantryItems.ingredientId, ingredients.id));
}

export async function insertPantryItem(data: CreatePantryItemInput) {
  try {
    const [item] = await db.insert(pantryItems).values(data).returning();
    return item!;
  } catch (err) {
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      throw new IngredientNotFoundError(data.ingredientId);
    }
    throw err;
  }
}

export async function deletePantryItem(id: number) {
  const [item] = await db
    .delete(pantryItems)
    .where(eq(pantryItems.id, id))
    .returning();
  return item;
}
