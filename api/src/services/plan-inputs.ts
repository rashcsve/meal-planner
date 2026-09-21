import type {
  PlannerRecipe,
  PlannerIngredientPrice,
  PlannerPantryItem,
  PlannerPreferences,
  PlannerTargets,
} from "shared";
import { findAllRecipes } from "../repositories/recipes.js";
import { findIngredientIdsForAllRecipes } from "../repositories/recipeIngredients.js";
import { findCurrentIngredientPrices } from "../repositories/ingredientPrices.js";
import { findAllPantryItems } from "../repositories/pantryItems.js";
import { findAllHouseholdMembers } from "../repositories/householdMembers.js";
import { findAllIngredientPreferences } from "../repositories/ingredientPreferences.js";
import { listIngredientPreferencesForMember } from "./ingredientPreferences.js";
import { getHouseholdSettings } from "./householdSettings.js";
import { getKcalSummariesByRecipe, computeKcalPerServing } from "./nutrition.js";
import {
  HouseholdSettingsNotConfiguredError,
  NoHouseholdMembersError,
  HouseholdMemberMissingDinnerTargetError,
} from "../lib/errors.js";

type HouseholdMember = Awaited<ReturnType<typeof findAllHouseholdMembers>>[number];

export interface PlanInputs {
  recipes: PlannerRecipe[];
  prices: PlannerIngredientPrice[];
  pantry: PlannerPantryItem[];
  preferences: PlannerPreferences;
  targets: PlannerTargets;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY);
}

async function buildPlannerRecipes(): Promise<PlannerRecipe[]> {
  const [recipes, ingredientIdRows, kcalSummaries] = await Promise.all([
    findAllRecipes(),
    findIngredientIdsForAllRecipes(),
    getKcalSummariesByRecipe(),
  ]);

  const ingredientIdsByRecipe = new Map<number, number[]>();
  for (const { recipeId, ingredientId } of ingredientIdRows) {
    const ids = ingredientIdsByRecipe.get(recipeId) ?? [];
    ids.push(ingredientId);
    ingredientIdsByRecipe.set(recipeId, ids);
  }

  const plannerRecipes: PlannerRecipe[] = [];
  for (const recipe of recipes) {
    const summary = kcalSummaries.get(recipe.id);
    const kcalPerServing =
      summary && summary.status === "complete"
        ? computeKcalPerServing(summary.kcalTotal, recipe.servings)
        : null;

    // A recipe missing its meal type, cost, servings, or per-serving calories
    // can't be scored against a meal slot or a budget
    if (
      recipe.meal === null ||
      recipe.cost === null ||
      recipe.servings === null ||
      kcalPerServing === null
    ) {
      continue;
    }

    plannerRecipes.push({
      id: recipe.id,
      mealType: recipe.meal,
      ...(recipe.proteinSource ? { proteinSource: recipe.proteinSource } : {}),
      timeMinutes: recipe.time,
      costCzk: recipe.cost,
      calories: kcalPerServing,
      baseServings: recipe.servings,
      ingredientIds: ingredientIdsByRecipe.get(recipe.id) ?? [],
    });
  }

  return plannerRecipes;
}

async function buildPlannerPrices(weekStartDate: string): Promise<PlannerIngredientPrice[]> {
  const rows = await findCurrentIngredientPrices(weekStartDate);

  return rows.map((row) => ({
    ingredientId: row.ingredientId,
    ingredientName: row.ingredientName,
    store: row.store,
    pricePerUnit: row.price / row.amount,
    isPromo: row.isPromo,
  }));
}

async function buildPlannerPantry(weekStartDate: string): Promise<PlannerPantryItem[]> {
  const items = await findAllPantryItems();

  return items.map((item) => ({
    ingredientId: item.ingredientId,
    daysUntilExpiry: item.expiresOn ? daysBetween(weekStartDate, item.expiresOn) : null,
  }));
}

async function buildPlannerPreferences(members: HouseholdMember[]): Promise<PlannerPreferences> {
  const neverIngredientIds = new Set<number>();

  const allPreferences = await findAllIngredientPreferences();
  const perMemberPreferences = await Promise.all(
    members.map((member) => listIngredientPreferencesForMember(member.id, allPreferences)),
  );

  for (const preferences of perMemberPreferences) {
    for (const preference of preferences) {
      if (preference.rule === "never") neverIngredientIds.add(preference.ingredientId);
    }
  }

  return { neverIngredientIds: [...neverIngredientIds] };
}

async function buildPlannerTargets(members: HouseholdMember[]): Promise<PlannerTargets> {
  const settings = await getHouseholdSettings();
  if (!settings) throw new HouseholdSettingsNotConfiguredError();

  const memberTargets = members.map((member) => {
    if (member.dinnerCalorieTarget === null) {
      throw new HouseholdMemberMissingDinnerTargetError(member.name);
    }
    return { memberId: member.id, dinnerCalorieTarget: member.dinnerCalorieTarget };
  });

  return {
    memberTargets,
    weeklyBudgetCzk: settings.weeklyBudgetCzk,
    startDayOfWeek: settings.startDayOfWeek,
  };
}

export async function getPlanInputs(weekStartDate: string): Promise<PlanInputs> {
  const members = await findAllHouseholdMembers();
  if (members.length === 0) throw new NoHouseholdMembersError();

  const [recipes, prices, pantry, preferences, targets] = await Promise.all([
    buildPlannerRecipes(),
    buildPlannerPrices(weekStartDate),
    buildPlannerPantry(weekStartDate),
    buildPlannerPreferences(members),
    buildPlannerTargets(members),
  ]);

  return { recipes, prices, pantry, preferences, targets };
}
