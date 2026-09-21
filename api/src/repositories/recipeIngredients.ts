import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { ingredients, recipeIngredients } from "../db/schema.js";

export async function findIngredientLinesForRecipe(recipeId: number) {
  return db
    .select({
      id: recipeIngredients.id,
      ingredientName: ingredients.name,
      displayAmount: recipeIngredients.displayAmount,
      displayUnit: recipeIngredients.displayUnit,
      amountBase: recipeIngredients.amountBase,
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
