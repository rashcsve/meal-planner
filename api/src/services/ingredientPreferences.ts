import type { IngredientPreferenceRule } from 'shared'
import { findAllIngredientPreferences } from '../repositories/ingredientPreferences.js'

export interface ResolvedIngredientPreference {
  ingredientId: number
  rule: IngredientPreferenceRule
}

type IngredientPreferenceRow = Awaited<ReturnType<typeof findAllIngredientPreferences>>

/** Pass `all` when resolving for several members in one call, so the table
 * is only fetched once instead of once per member. */
export async function listIngredientPreferencesForMember(
  memberId: number,
  all?: IngredientPreferenceRow,
): Promise<ResolvedIngredientPreference[]> {
  const preferences = all ?? (await findAllIngredientPreferences())
  const byIngredient = new Map<number, IngredientPreferenceRule>()

  for (const pref of preferences) {
    if (pref.memberId === null) byIngredient.set(pref.ingredientId, pref.rule as IngredientPreferenceRule)
  }
  for (const pref of preferences) {
    if (pref.memberId === memberId) byIngredient.set(pref.ingredientId, pref.rule as IngredientPreferenceRule)
  }

  return [...byIngredient.entries()].map(([ingredientId, rule]) => ({ ingredientId, rule }))
}
