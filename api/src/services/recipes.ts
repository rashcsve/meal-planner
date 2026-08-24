import type { CreateRecipeInput } from 'shared'
import { findAllRecipes, findRecipeById, insertRecipe } from '../repositories/recipes.js'
import { findIngredientLinesForRecipe } from '../repositories/recipeIngredients.js'
import {
  EMPTY_KCAL_SUMMARY,
  computeKcalPerServing,
  getKcalSummariesByRecipe,
  summarizeKcal,
} from './nutrition.js'

export async function listRecipes() {
  const [recipes, summaries] = await Promise.all([findAllRecipes(), getKcalSummariesByRecipe()])
  return recipes.map((recipe) => {
    const summary = summaries.get(recipe.id) ?? EMPTY_KCAL_SUMMARY
    return {
      ...recipe,
      ...summary,
      kcalPerServing: computeKcalPerServing(summary.kcalTotal, recipe.servings),
    }
  })
}

export async function getRecipe(id: number) {
  const recipe = await findRecipeById(id)
  if (!recipe) return null

  const lines = await findIngredientLinesForRecipe(id)
  const ingredients = lines.map((line) => ({
    id: line.id,
    ingredientName: line.ingredientName,
    displayAmount: line.displayAmount,
    displayUnit: line.displayUnit,
    amountBase: line.amountBase,
  }))
  const summary = summarizeKcal(lines)

  return {
    ...recipe,
    ...summary,
    kcalPerServing: computeKcalPerServing(summary.kcalTotal, recipe.servings),
    ingredients,
  }
}

export async function createRecipe(data: CreateRecipeInput) {
  const recipe = await insertRecipe(data)
  return { ...recipe, ...EMPTY_KCAL_SUMMARY, kcalPerServing: null, ingredients: [] }
}
