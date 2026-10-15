import { max } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
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

export async function getCurrentInputVersions(
  client: DbClient = db,
): Promise<CurrentInputVersions> {
  const [recipesRow] = await client.select({ value: max(recipes.updatedAt) }).from(recipes);
  const [ingredientLinesRow] = await client
    .select({ value: max(recipeIngredients.updatedAt) })
    .from(recipeIngredients);
  const [membersRow] = await client
    .select({ value: max(householdMembers.updatedAt) })
    .from(householdMembers);
  const [settingsRow] = await client
    .select({ value: max(householdSettings.updatedAt) })
    .from(householdSettings);
  const [preferencesRow] = await client
    .select({ value: max(ingredientPreferences.updatedAt) })
    .from(ingredientPreferences);

  return {
    recipesVersionAt: latestOf(recipesRow?.value ?? null, ingredientLinesRow?.value ?? null),
    targetsVersionAt: latestOf(membersRow?.value ?? null, settingsRow?.value ?? null),
    exclusionsVersionAt: preferencesRow?.value ?? null,
  };
}
