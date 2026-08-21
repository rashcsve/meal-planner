import type { CreateRecipeInput } from 'shared'
import { findAllRecipes, findRecipeById, insertRecipe } from '../repositories/recipes.js'

export async function listRecipes() {
  return findAllRecipes()
}

export async function getRecipe(id: number) {
  const recipe = await findRecipeById(id)
  return recipe ?? null
}

export async function createRecipe(data: CreateRecipeInput) {
  return insertRecipe(data)
}
