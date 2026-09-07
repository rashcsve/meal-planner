import { and, gte, isNull, lte, or } from 'drizzle-orm'
import { db } from '../db/index.js'
import { ingredientPrices } from '../db/schema.js'

export async function findCurrentIngredientPrices(asOf: string) {
  return db
    .select()
    .from(ingredientPrices)
    .where(
      and(
        lte(ingredientPrices.validFrom, asOf),
        or(isNull(ingredientPrices.validTo), gte(ingredientPrices.validTo, asOf)),
      ),
    )
}
