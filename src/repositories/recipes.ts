import { db } from '../db/index.js'
import { recipes } from '../db/schema.js'

export async function findAllRecipes() {
  return db.select().from(recipes)
}
