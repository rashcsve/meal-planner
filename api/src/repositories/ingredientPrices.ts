import { and, eq, gte, isNull, lte, or } from 'drizzle-orm'
import { db } from '../db/index.js'
import { ingredientPrices, ingredients } from '../db/schema.js'

export async function findCurrentIngredientPrices(asOf: string) {
  return db
    .select({
      id: ingredientPrices.id,
      ingredientId: ingredientPrices.ingredientId,
      ingredientName: ingredients.name,
      store: ingredientPrices.store,
      amount: ingredientPrices.amount,
      unit: ingredientPrices.unit,
      price: ingredientPrices.price,
      validFrom: ingredientPrices.validFrom,
      validTo: ingredientPrices.validTo,
      isPromo: ingredientPrices.isPromo,
    })
    .from(ingredientPrices)
    .innerJoin(ingredients, eq(ingredientPrices.ingredientId, ingredients.id))
    .where(
      and(
        lte(ingredientPrices.validFrom, asOf),
        or(isNull(ingredientPrices.validTo), gte(ingredientPrices.validTo, asOf)),
      ),
    )
}
