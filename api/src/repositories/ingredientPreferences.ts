import { db } from '../db/index.js'
import { ingredientPreferences } from '../db/schema.js'

export async function findAllIngredientPreferences() {
  return db.select().from(ingredientPreferences)
}
