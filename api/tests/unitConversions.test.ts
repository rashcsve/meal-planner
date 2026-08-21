import { describe, expect, it, afterEach } from 'vitest'
import { isNotNull } from 'drizzle-orm'
import { db } from '../src/db/index.js'
import { ingredients, unitConversions } from '../src/db/schema.js'
import { findConversionRule } from '../src/repositories/unitConversions.js'

afterEach(async () => {
  await db.delete(unitConversions).where(isNotNull(unitConversions.ingredientId))
  await db.delete(ingredients)
})

async function seedIngredient(overrides: Partial<{ name: string; baseUnit: string }> = {}) {
  const [ingredient] = await db
    .insert(ingredients)
    .values({ name: 'Olive oil', baseUnit: 'g', ...overrides })
    .returning()
  return ingredient!
}

describe('findConversionRule', () => {
  it('returns the universal rule directly when it already bridges to the base unit', async () => {
    await expect(findConversionRule('kg', 'g', 1)).resolves.toEqual({ factor: 1000, toBaseUnit: 'g' })
  })

  it('returns undefined for an unrecognized unit', async () => {
    await expect(findConversionRule('cup', 'ml', 1)).resolves.toBeUndefined()
  })

  it('returns the unbridged universal rule when no override exists to bridge it', async () => {
    // ml never bridges to g on its own — no override seeded for this ingredient
    await expect(findConversionRule('ml', 'g', 1)).resolves.toEqual({ factor: 1, toBaseUnit: 'ml' })
  })

  it('composes a literal-unit override with the universal factor directly', async () => {
    const oliveOil = await seedIngredient()
    await db.insert(unitConversions).values({
      fromUnit: 'ml',
      factor: 0.92,
      toBaseUnit: 'g',
      ingredientId: oliveOil.id,
    })

    await expect(findConversionRule('ml', 'g', oliveOil.id)).resolves.toEqual({ factor: 0.92, toBaseUnit: 'g' })
  })

  it('keys the override by the canonical unit, so any synonym that normalizes to it composes correctly', async () => {
    const oliveOil = await seedIngredient()
    await db.insert(unitConversions).values({
      fromUnit: 'ml',
      factor: 0.92,
      toBaseUnit: 'g',
      ingredientId: oliveOil.id,
    })

    // 2 lžíce -> 30ml (universal) -> 27.6g (0.92 g/ml density override)
    await expect(findConversionRule('lžíce', 'g', oliveOil.id)).resolves.toEqual({
      factor: 15 * 0.92,
      toBaseUnit: 'g',
    })
  })

  it('does not apply another ingredient\'s override', async () => {
    const oliveOil = await seedIngredient()
    await db.insert(unitConversions).values({
      fromUnit: 'ml',
      factor: 0.92,
      toBaseUnit: 'g',
      ingredientId: oliveOil.id,
    })

    await expect(findConversionRule('ml', 'g', oliveOil.id + 1)).resolves.toEqual({ factor: 1, toBaseUnit: 'ml' })
  })

  it('never looks up an override for pieces', async () => {
    await expect(findConversionRule('pcs', 'pcs', 1)).resolves.toEqual({ factor: 1, toBaseUnit: 'pcs' })
  })
})
