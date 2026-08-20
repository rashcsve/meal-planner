import type { CreateRecipeInput } from 'shared'
import { findAllRecipes, insertRecipe } from '../repositories/recipes.js'

export async function listRecipes() {
  return findAllRecipes()
}

export async function createRecipe(data: CreateRecipeInput) {
  return insertRecipe(data)
}
