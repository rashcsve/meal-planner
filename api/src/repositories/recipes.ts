import { eq } from 'drizzle-orm'
import type { CreateRecipeInput } from 'shared'
import { db } from '../db/index.js'
import { recipes } from '../db/schema.js'
import { DuplicateTitleError } from '../lib/errors.js'

const UNIQUE_VIOLATION = '23505'

export async function findAllRecipes() {
  return db.select().from(recipes)
}

export async function findRecipeById(id: number) {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id))
  return recipe
}

export async function insertRecipe(data: CreateRecipeInput) {
  try {
    const [recipe] = await db.insert(recipes).values(data).returning()
    return recipe!
  } catch (err) {
    const cause = err instanceof Error ? err.cause : undefined
    if (cause && typeof cause === 'object' && 'code' in cause && cause.code === UNIQUE_VIOLATION) {
      throw new DuplicateTitleError(data.title)
    }
    throw err
  }
}
