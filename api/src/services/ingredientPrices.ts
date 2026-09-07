import { findCurrentIngredientPrices } from '../repositories/ingredientPrices.js'

type IngredientPriceRow = Awaited<ReturnType<typeof findCurrentIngredientPrices>>[number]

function isBetterPrice(candidate: IngredientPriceRow, current: IngredientPriceRow) {
  if (candidate.isPromo !== current.isPromo) return candidate.isPromo
  return candidate.validFrom > current.validFrom
}

export async function listCurrentIngredientPrices(asOf: string) {
  const rows = await findCurrentIngredientPrices(asOf)
  const byIngredientAndStore = new Map<string, IngredientPriceRow>()

  for (const row of rows) {
    const key = `${row.ingredientId}:${row.store}`
    const existing = byIngredientAndStore.get(key)
    if (!existing || isBetterPrice(row, existing)) {
      byIngredientAndStore.set(key, row)
    }
  }

  return [...byIngredientAndStore.values()]
}
