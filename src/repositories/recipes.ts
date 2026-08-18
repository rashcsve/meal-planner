import { db } from '../db/index.js'
import { recipes } from '../db/schema.js'

export async function findAllRecipes() {
  return db.select().from(recipes)
}

export async function insertRecipe(data: { title: string; minutes: number }) {
  const [recipe] = await db.insert(recipes).values(data).returning()
  return recipe
}
