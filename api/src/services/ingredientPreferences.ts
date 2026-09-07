import type { IngredientPreferenceRule } from 'shared'
import { findAllIngredientPreferences } from '../repositories/ingredientPreferences.js'

export interface ResolvedIngredientPreference {
  ingredientId: number
  rule: IngredientPreferenceRule
}

export async function listIngredientPreferencesForMember(
  memberId: number,
): Promise<ResolvedIngredientPreference[]> {
  const all = await findAllIngredientPreferences()
  const byIngredient = new Map<number, IngredientPreferenceRule>()

  for (const pref of all) {
    if (pref.memberId === null) byIngredient.set(pref.ingredientId, pref.rule as IngredientPreferenceRule)
  }
  for (const pref of all) {
    if (pref.memberId === memberId) byIngredient.set(pref.ingredientId, pref.rule as IngredientPreferenceRule)
  }

  return [...byIngredient.entries()].map(([ingredientId, rule]) => ({ ingredientId, rule }))
}
