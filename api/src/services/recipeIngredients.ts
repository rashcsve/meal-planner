import type { RecipeIngredientLineInput } from "shared";
import { db } from "../db/index.js";
import {
  deleteRecipeIngredientLine,
  insertRecipeIngredientLine,
  updateRecipeIngredientLine,
} from "../repositories/recipeIngredients.js";
import { touchRecipe } from "../repositories/recipes.js";
import { RecipeIngredientLineNotFoundError } from "../lib/errors.js";

export async function addIngredientLine(recipeId: number, data: RecipeIngredientLineInput) {
  return insertRecipeIngredientLine(recipeId, data);
}

export async function editIngredientLine(
  recipeId: number,
  lineId: number,
  data: RecipeIngredientLineInput,
) {
  const line = await updateRecipeIngredientLine(recipeId, lineId, data);
  if (!line) throw new RecipeIngredientLineNotFoundError(recipeId, lineId);

  return line;
}

export async function removeIngredientLine(recipeId: number, lineId: number) {
  return db.transaction(async (tx) => {
    const line = await deleteRecipeIngredientLine(recipeId, lineId, tx);
    if (!line) throw new RecipeIngredientLineNotFoundError(recipeId, lineId);

    await touchRecipe(recipeId, tx);
    return line;
  });
}
