import type { CreateRecipeInput } from 'shared'
import { findAllRecipes, findRecipeById, insertRecipe } from '../repositories/recipes.js'
import { withKcalFigures } from './nutrition.js'

export async function listRecipes() {
  const recipes = await findAllRecipes()
  return recipes.map(withKcalFigures)
}

export async function getRecipe(id: number) {
  const recipe = await findRecipeById(id)
  return recipe ? withKcalFigures(recipe) : null
}

export async function createRecipe(data: CreateRecipeInput) {
  const recipe = await insertRecipe(data)
  return withKcalFigures(recipe)
}
