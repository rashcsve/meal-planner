import type { LockedSlot, MealSlot } from "shared";
import {
  plan,
  buildPlannerContext,
  eligibleRecipes,
  checkSlotEligibility,
  computeMemberServings,
  collectReasons,
  scoreSlot,
  slotKey,
  type SlotKey,
} from "./planner.js";
import { getPlanInputs } from "./plan-inputs.js";
import { db } from "../db/index.js";
import { findRecipeById } from "../repositories/recipes.js";
import {
  findPlanWeekByDate,
  insertPlanWeek,
  casIncrementRevision,
} from "../repositories/planWeeks.js";
import {
  findSlotsByWeekId,
  findLockedSlotsByWeekId,
  updateSlotLocked,
  updateSlotRecipe,
  upsertPlanSlots,
} from "../repositories/planSlots.js";
import {
  PlanWeekNotFoundError,
  PlanSlotNotFoundError,
  RecipeNotFoundError,
  SlotLockedError,
  RecipeNotEligibleError,
  StaleRevisionError,
  ExpectedRevisionRequiredError,
} from "../lib/errors.js";

async function getLockedSlots(planWeekId: number): Promise<LockedSlot[]> {
  const rows = await findLockedSlotsByWeekId(planWeekId);
  return rows
    .filter((row) => row.recipeId !== null)
    .map((row) => ({
      day: row.day,
      mealSlot: row.mealSlot as MealSlot,
      recipeId: row.recipeId!,
    }));
}

export async function generatePlan(weekStartDate: string, seed: number, expectedRevision?: number) {
  const existingWeek = await findPlanWeekByDate(weekStartDate);
  if (existingWeek && expectedRevision === undefined) {
    throw new ExpectedRevisionRequiredError(weekStartDate);
  }

  const locked = existingWeek ? await getLockedSlots(existingWeek.id) : [];
  const inputs = await getPlanInputs(weekStartDate);

  const result = plan(
    inputs.recipes,
    inputs.prices,
    inputs.pantry,
    inputs.preferences,
    locked,
    inputs.targets,
    seed,
  );

  return db.transaction(async (tx) => {
    let week;
    if (existingWeek) {
      week = await casIncrementRevision(
        existingWeek.id,
        expectedRevision!,
        { seed: result.seed, plannerVersion: result.plannerVersion },
        tx,
      );
      if (!week) {
        throw new StaleRevisionError(weekStartDate, expectedRevision!);
      }
    } else {
      week = await insertPlanWeek(
        {
          weekStartDate,
          seed: result.seed,
          plannerVersion: result.plannerVersion,
        },
        tx,
      );
    }

    const slots = await upsertPlanSlots(week.id, result.slots, tx);
    return { ...week, slots, violations: result.violations };
  });
}

async function findWeekOrThrow(weekStartDate: string) {
  const week = await findPlanWeekByDate(weekStartDate);
  if (!week) throw new PlanWeekNotFoundError(weekStartDate);
  return week;
}

export async function getWeek(weekStartDate: string) {
  const week = await findWeekOrThrow(weekStartDate);
  const slots = await findSlotsByWeekId(week.id);
  return { ...week, slots };
}

export async function setSlotLocked(
  weekStartDate: string,
  day: number,
  mealSlot: MealSlot,
  locked: boolean,
  expectedRevision: number,
) {
  const week = await findWeekOrThrow(weekStartDate);
  return db.transaction(async (tx) => {
    const updatedWeek = await casIncrementRevision(week.id, expectedRevision, {}, tx);
    if (!updatedWeek) throw new StaleRevisionError(weekStartDate, expectedRevision);

    const slot = await updateSlotLocked(week.id, day, mealSlot, locked, tx);
    if (!slot) throw new PlanSlotNotFoundError(day, mealSlot);
    return { ...slot, revision: updatedWeek.revision };
  });
}

/**
 * The rest of the week's assigned slots, excluding the one being replaced -
 * used both to score/explain replacement candidates and, once one is
 * chosen, to recompute its reasons (protein variety looks at nearby days).
 */
function buildOtherSlotsAssigned(
  slots: { day: number; mealSlot: string; recipeId: number | null }[],
  day: number,
  mealSlot: MealSlot,
): Map<SlotKey, number> {
  const assigned = new Map<SlotKey, number>();
  for (const slot of slots) {
    if (slot.recipeId === null) continue;
    if (slot.day === day && slot.mealSlot === mealSlot) continue;
    assigned.set(slotKey(slot.day, slot.mealSlot as MealSlot), slot.recipeId);
  }
  return assigned;
}

export async function getSlotCandidates(weekStartDate: string, day: number, mealSlot: MealSlot) {
  const week = await findWeekOrThrow(weekStartDate);
  const slots = await findSlotsByWeekId(week.id);
  const targetSlot = slots.find((slot) => slot.day === day && slot.mealSlot === mealSlot);
  if (!targetSlot) throw new PlanSlotNotFoundError(day, mealSlot);

  const inputs = await getPlanInputs(weekStartDate);
  const ctx = buildPlannerContext(
    inputs.recipes,
    inputs.prices,
    inputs.preferences,
    inputs.targets,
  );
  const assigned = buildOtherSlotsAssigned(slots, day, mealSlot);

  const candidates = eligibleRecipes(mealSlot, ctx)
    .map((recipe) => ({
      recipeId: recipe.id,
      memberServings: computeMemberServings(recipe, inputs.targets.memberTargets),
      score: scoreSlot(day, mealSlot, recipe.id, assigned, ctx),
    }))
    .sort((a, b) => b.score - a.score);

  return { candidates };
}

export async function replaceSlot(
  weekStartDate: string,
  day: number,
  mealSlot: MealSlot,
  recipeId: number,
  expectedRevision: number,
) {
  const week = await findWeekOrThrow(weekStartDate);

  // Checked first, against the recipes table directly, so a genuinely
  // nonexistent recipeId still 404s the same way it always has - even for a
  // week whose household configuration (members/settings/prices) isn't
  // complete enough to run getPlanInputs below.
  const recipe = await findRecipeById(recipeId);
  if (!recipe) throw new RecipeNotFoundError(recipeId);

  const slots = await findSlotsByWeekId(week.id);
  const targetSlot = slots.find((slot) => slot.day === day && slot.mealSlot === mealSlot);
  if (!targetSlot) throw new PlanSlotNotFoundError(day, mealSlot);
  if (targetSlot.locked) throw new SlotLockedError(day, mealSlot);

  const inputs = await getPlanInputs(weekStartDate);
  const ctx = buildPlannerContext(
    inputs.recipes,
    inputs.prices,
    inputs.preferences,
    inputs.targets,
  );
  const plannerRecipe = ctx.recipesById.get(recipeId);
  if (!plannerRecipe) {
    throw new RecipeNotEligibleError(
      recipeId,
      day,
      mealSlot,
      "recipe is missing data needed to plan with (meal type, cost, servings, or calories)",
    );
  }

  const eligibilityViolation = checkSlotEligibility(
    plannerRecipe,
    mealSlot,
    ctx.neverIngredientIds,
    inputs.targets.memberTargets,
  );
  if (eligibilityViolation) {
    throw new RecipeNotEligibleError(recipeId, day, mealSlot, eligibilityViolation);
  }

  const assigned = buildOtherSlotsAssigned(slots, day, mealSlot);
  assigned.set(slotKey(day, mealSlot), recipeId);
  const reasons = collectReasons(
    day,
    mealSlot,
    recipeId,
    inputs.recipes,
    inputs.prices,
    inputs.pantry,
    assigned,
  );
  const memberServings = computeMemberServings(plannerRecipe, inputs.targets.memberTargets);

  return db.transaction(async (tx) => {
    const updatedWeek = await casIncrementRevision(week.id, expectedRevision, {}, tx);
    if (!updatedWeek) throw new StaleRevisionError(weekStartDate, expectedRevision);

    const slot = await updateSlotRecipe(
      week.id,
      day,
      mealSlot,
      recipeId,
      reasons,
      memberServings,
      tx,
    );
    if (!slot) throw new PlanSlotNotFoundError(day, mealSlot);
    return { ...slot, revision: updatedWeek.revision };
  });
}
