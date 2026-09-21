import { and, eq } from "drizzle-orm";
import type { RecipeIngredientLineInput } from "shared";
import { db } from "../db/index.js";
import { ingredients, recipeIngredients } from "../db/schema.js";
import { IngredientNotFoundError, RecipeNotFoundError } from "../lib/errors.js";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode, pgErrorConstraint } from "../lib/db.js";

const RECIPE_ID_FK_CONSTRAINT = "recipe_ingredients_recipe_id_recipes_id_fk";

export async function findIngredientLinesForRecipe(recipeId: number) {
  return db
    .select({
      id: recipeIngredients.id,
      ingredientId: recipeIngredients.ingredientId,
      ingredientName: ingredients.name,
      displayAmount: recipeIngredients.displayAmount,
      displayUnit: recipeIngredients.displayUnit,
      amountBase: recipeIngredients.amountBase,
      isOptional: recipeIngredients.isOptional,
      kcalPer100g: ingredients.kcalPer100g,
      baseUnit: ingredients.baseUnit,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, recipeId));
}

export async function findIngredientIdsForAllRecipes() {
  return db
    .select({
      recipeId: recipeIngredients.recipeId,
      ingredientId: recipeIngredients.ingredientId,
    })
    .from(recipeIngredients);
}

export async function findIngredientLinesForAllRecipes() {
  return db
    .select({
      recipeId: recipeIngredients.recipeId,
      amountBase: recipeIngredients.amountBase,
      kcalPer100g: ingredients.kcalPer100g,
      baseUnit: ingredients.baseUnit,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id));
}

export async function findRecipeIngredientLineById(recipeId: number, lineId: number) {
  const [line] = await db
    .select()
    .from(recipeIngredients)
    .where(and(eq(recipeIngredients.id, lineId), eq(recipeIngredients.recipeId, recipeId)));
  return line;
}

export async function insertRecipeIngredientLine(
  recipeId: number,
  data: RecipeIngredientLineInput,
) {
  try {
    const [line] = await db
      .insert(recipeIngredients)
      .values({ ...data, recipeId })
      .returning();
    return line!;
  } catch (err) {
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      if (pgErrorConstraint(err) === RECIPE_ID_FK_CONSTRAINT) {
        throw new RecipeNotFoundError(recipeId);
      }
      throw new IngredientNotFoundError(data.ingredientId);
    }
    throw err;
  }
}

export async function updateRecipeIngredientLine(
  recipeId: number,
  lineId: number,
  data: RecipeIngredientLineInput,
) {
  try {
    const [line] = await db
      .update(recipeIngredients)
      .set({
        ingredientId: data.ingredientId,
        amountBase: data.amountBase ?? null,
        displayAmount: data.displayAmount ?? null,
        displayUnit: data.displayUnit ?? null,
        isOptional: data.isOptional ?? false,
        updatedAt: new Date(),
      })
      .where(and(eq(recipeIngredients.id, lineId), eq(recipeIngredients.recipeId, recipeId)))
      .returning();
    return line;
  } catch (err) {
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      throw new IngredientNotFoundError(data.ingredientId);
    }
    throw err;
  }
}

export async function deleteRecipeIngredientLine(recipeId: number, lineId: number) {
  const [line] = await db
    .delete(recipeIngredients)
    .where(and(eq(recipeIngredients.id, lineId), eq(recipeIngredients.recipeId, recipeId)))
    .returning();
  return line;
}
