import type { CreateRecipeInput, RecipeSnapshot } from "shared";
import {
  archiveRecipe as archiveRecipeRow,
  findAllRecipes,
  findRecipeById,
  insertRecipe,
  updateRecipeServings,
} from "../repositories/recipes.js";
import { findIngredientLinesForRecipe } from "../repositories/recipeIngredients.js";
import { RecipeNotFoundError } from "../lib/errors.js";
import {
  EMPTY_KCAL_SUMMARY,
  computeKcalPerServing,
  getKcalSummariesByRecipe,
  summarizeKcal,
} from "./nutrition.js";

export async function listRecipes() {
  const [recipes, summaries] = await Promise.all([findAllRecipes(), getKcalSummariesByRecipe()]);
  return recipes.map((recipe) => {
    const summary = summaries.get(recipe.id) ?? EMPTY_KCAL_SUMMARY;
    return {
      ...recipe,
      ...summary,
      kcalPerServing:
        summary.status === "unknown"
          ? null
          : computeKcalPerServing(summary.kcalTotal, recipe.servings),
    };
  });
}

async function loadRecipeWithLines(id: number) {
  const recipe = await findRecipeById(id);
  if (!recipe) return null;

  const lines = await findIngredientLinesForRecipe(id);
  const summary = summarizeKcal(lines);
  const kcalPerServing =
    summary.status === "unknown" ? null : computeKcalPerServing(summary.kcalTotal, recipe.servings);
  return { recipe, lines, summary, kcalPerServing };
}

export async function getRecipe(id: number) {
  const loaded = await loadRecipeWithLines(id);
  if (!loaded) return null;

  const { recipe, lines, summary, kcalPerServing } = loaded;
  const ingredients = lines.map((line) => ({
    id: line.id,
    ingredientId: line.ingredientId,
    ingredientName: line.ingredientName,
    displayAmount: line.displayAmount,
    displayUnit: line.displayUnit,
    amountBase: line.amountBase,
    isOptional: line.isOptional,
  }));
  return { ...recipe, ...summary, kcalPerServing, ingredients };
}

export async function buildRecipeSnapshot(id: number): Promise<RecipeSnapshot | null> {
  const loaded = await loadRecipeWithLines(id);
  if (!loaded) return null;

  const { recipe, lines, kcalPerServing } = loaded;
  return {
    title: recipe.title,
    time: recipe.time,
    cost: recipe.cost,
    meal: recipe.meal,
    cuisine: recipe.cuisine,
    proteinSource: recipe.proteinSource,
    diet: recipe.diet,
    servings: recipe.servings,
    kcalPerServing,
    ingredients: lines.map((line) => ({
      id: line.id,
      ingredientId: line.ingredientId,
      name: line.ingredientName,
      displayAmount: line.displayAmount,
      displayUnit: line.displayUnit,
      amountBase: line.amountBase,
      baseUnit: line.baseUnit,
      isOptional: line.isOptional,
    })),
  };
}

export async function createRecipe(data: CreateRecipeInput) {
  const recipe = await insertRecipe(data);
  return { ...recipe, ...EMPTY_KCAL_SUMMARY, kcalPerServing: null, ingredients: [] };
}

export async function editRecipeServings(id: number, servings: number) {
  const recipe = await updateRecipeServings(id, servings);
  if (!recipe) throw new RecipeNotFoundError(id);
  return recipe;
}

export async function archiveRecipe(id: number) {
  const recipe = await archiveRecipeRow(id);
  if (!recipe) throw new RecipeNotFoundError(id);
  return recipe;
}
