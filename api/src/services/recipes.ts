import type { CreateRecipeInput } from 'shared'
import { findAllRecipes, findRecipeById, insertRecipe } from '../repositories/recipes.js'
import { EMPTY_KCAL_SUMMARY, getKcalSummariesByRecipe, getKcalSummary } from './nutrition.js'

export async function listRecipes() {
  const [recipes, summaries] = await Promise.all([findAllRecipes(), getKcalSummariesByRecipe()])
  return recipes.map((recipe) => ({
    ...recipe,
    ...(summaries.get(recipe.id) ?? EMPTY_KCAL_SUMMARY),
  }))
}

export async function getRecipe(id: number) {
  const recipe = await findRecipeById(id)
  if (!recipe) return null
  const summary = await getKcalSummary(id)
  return { ...recipe, ...summary }
}

export async function createRecipe(data: CreateRecipeInput) {
  const recipe = await insertRecipe(data)
  return { ...recipe, ...EMPTY_KCAL_SUMMARY }
}
