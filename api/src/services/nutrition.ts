import { findIngredientLinesForAllRecipes } from "../repositories/recipeIngredients.js";

export interface KcalSummary {
  kcalTotal: number;
}

export const EMPTY_KCAL_SUMMARY: KcalSummary = {
  kcalTotal: 0,
};

interface IngredientLine {
  amountBase: number | null;
  kcalPer100g: number | null;
}

export function summarizeKcal(lines: IngredientLine[]): KcalSummary {
  let kcalTotal = 0;

  for (const line of lines) {
    if (line.amountBase == null || line.kcalPer100g == null) {
      continue;
    }
    kcalTotal += (line.amountBase / 100) * line.kcalPer100g;
  }

  return { kcalTotal };
}

export function computeKcalPerServing(
  kcalTotal: number,
  servings: number | null,
): number | null {
  if (!servings) return null;
  return kcalTotal / servings;
}

export async function getKcalSummariesByRecipe(): Promise<
  Map<number, KcalSummary>
> {
  const lines = await findIngredientLinesForAllRecipes();

  const linesByRecipe = new Map<number, IngredientLine[]>();
  for (const { recipeId, ...line } of lines) {
    const group = linesByRecipe.get(recipeId);
    if (group) {
      group.push(line);
    } else {
      linesByRecipe.set(recipeId, [line]);
    }
  }

  const summaries = new Map<number, KcalSummary>();
  for (const [recipeId, recipeLines] of linesByRecipe) {
    summaries.set(recipeId, summarizeKcal(recipeLines));
  }
  return summaries;
}
