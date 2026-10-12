import { max } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  recipes,
  recipeIngredients,
  householdMembers,
  householdSettings,
  ingredientPreferences,
} from "../db/schema.js";

export interface CurrentInputVersions {
  recipesVersionAt: Date | null;
  targetsVersionAt: Date | null;
  exclusionsVersionAt: Date | null;
}

function latestOf(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export async function getCurrentInputVersions(): Promise<CurrentInputVersions> {
  const [[recipesRow], [ingredientLinesRow], [membersRow], [settingsRow], [preferencesRow]] =
    await Promise.all([
      db.select({ value: max(recipes.updatedAt) }).from(recipes),
      db.select({ value: max(recipeIngredients.updatedAt) }).from(recipeIngredients),
      db.select({ value: max(householdMembers.updatedAt) }).from(householdMembers),
      db.select({ value: max(householdSettings.updatedAt) }).from(householdSettings),
      db.select({ value: max(ingredientPreferences.updatedAt) }).from(ingredientPreferences),
    ]);

  return {
    recipesVersionAt: latestOf(recipesRow?.value ?? null, ingredientLinesRow?.value ?? null),
    targetsVersionAt: latestOf(membersRow?.value ?? null, settingsRow?.value ?? null),
    exclusionsVersionAt: preferencesRow?.value ?? null,
  };
}
