import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { ingredients, recipeIngredients } from "../db/schema.js";

export async function findIngredientLinesForRecipe(recipeId: number) {
  return db
    .select({
      amountBase: recipeIngredients.amountBase,
      kcalPer100g: ingredients.kcalPer100g,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, recipeId));
}

export async function findIngredientLinesForAllRecipes() {
  return db
    .select({
      recipeId: recipeIngredients.recipeId,
      amountBase: recipeIngredients.amountBase,
      kcalPer100g: ingredients.kcalPer100g,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id));
}
