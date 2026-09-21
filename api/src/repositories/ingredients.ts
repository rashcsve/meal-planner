import type { CreateIngredientInput } from "shared";
import { db } from "../db/index.js";
import { ingredients } from "../db/schema.js";
import { DuplicateIngredientNameError } from "../lib/errors.js";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../lib/db.js";

export async function findAllIngredients() {
  return db.select().from(ingredients);
}

export async function insertIngredient(data: CreateIngredientInput) {
  try {
    const [ingredient] = await db.insert(ingredients).values(data).returning();
    return ingredient!;
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      throw new DuplicateIngredientNameError(data.name);
    }
    throw err;
  }
}
