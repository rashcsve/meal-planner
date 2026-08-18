import { findAllRecipes } from '../repositories/recipes.js'

export async function listRecipes() {
  return findAllRecipes()
}
