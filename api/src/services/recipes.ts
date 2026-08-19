import { findAllRecipes, insertRecipe } from '../repositories/recipes.js'

export async function listRecipes() {
  return findAllRecipes()
}

export async function createRecipe(data: { title: string; minutes: number }) {
  return insertRecipe(data)
}
