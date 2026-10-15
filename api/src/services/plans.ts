import type { LockedSlot, MealSlot, MemberServing } from "shared";
import {
  plan,
  buildPlannerContext,
  eligibleRecipes,
  checkSlotEligibility,
  computeMemberServings,
  collectReasons,
  evaluateExistingWeek,
  scoreSlot,
  slotKey,
  type SlotKey,
  type PlannerContext,
} from "./planner.js";
import { getPlanInputs, type PlanInputs } from "./plan-inputs.js";
import { db } from "../db/index.js";
import { findRecipeById } from "../repositories/recipes.js";
import {
  findPlanWeekByDate,
  insertPlanWeek,
  casIncrementRevision,
} from "../repositories/planWeeks.js";
import { getCurrentInputVersions } from "../repositories/planInputVersions.js";
import { evaluateStaleness, type PlanEvaluationStatus } from "./plan-staleness.js";
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
  HouseholdSettingsNotConfiguredError,
  NoHouseholdMembersError,
  HouseholdMemberMissingDinnerTargetError,
} from "../lib/errors.js";

const INCOMPLETE_HOUSEHOLD_ERRORS = [
  HouseholdSettingsNotConfiguredError,
  NoHouseholdMembersError,
  HouseholdMemberMissingDinnerTargetError,
];

async function reevaluateSlots(
  weekStartDate: string,
  slots: {
    day: number;
    mealSlot: string;
    recipeId: number | null;
    locked: boolean;
    memberServings: MemberServing[];
  }[],
) {
  const inputVersions = await getCurrentInputVersions();
  let inputs;
  try {
    inputs = await getPlanInputs(weekStartDate);
  } catch (error) {
    if (INCOMPLETE_HOUSEHOLD_ERRORS.some((errorType) => error instanceof errorType)) {
      return { violations: null };
    }
    throw error;
  }

  const ctx = buildPlannerContext(
    inputs.recipes,
    inputs.prices,
    inputs.preferences,
    inputs.targets,
  );
  const violations = evaluateSlots(slots, inputs.pantry, ctx);
  return { violations, ...inputVersions };
}

function evaluateSlots(
  slots: {
    day: number;
    mealSlot: string;
    recipeId: number | null;
    locked: boolean;
    memberServings: MemberServing[];
  }[],
  pantry: PlanInputs["pantry"],
  ctx: PlannerContext,
) {
  const assigned = new Map<SlotKey, number>();
  const locked: LockedSlot[] = [];
  const savedServings = new Map<SlotKey, MemberServing[]>();
  for (const slot of slots) {
    if (slot.recipeId === null) continue;
    const mealSlot = slot.mealSlot as MealSlot;
    assigned.set(slotKey(slot.day, mealSlot), slot.recipeId);
    savedServings.set(slotKey(slot.day, mealSlot), slot.memberServings);
    if (slot.locked) locked.push({ day: slot.day, mealSlot, recipeId: slot.recipeId });
  }

  return evaluateExistingWeek(assigned, locked, pantry, ctx, savedServings);
}

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
  const inputVersions = await getCurrentInputVersions();
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
        {
          seed: result.seed,
          plannerVersion: result.plannerVersion,
          violations: result.violations,
          ...inputVersions,
        },
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
          violations: result.violations,
          ...inputVersions,
        },
        tx,
      );
    }

    const slots = await upsertPlanSlots(week.id, result.slots, tx);
    const evaluation: PlanEvaluationStatus = { status: "current", staleInputs: [] };
    return { ...week, slots, violations: result.violations, evaluation, search: result.search };
  });
}

async function findWeekOrThrow(weekStartDate: string) {
  const week = await findPlanWeekByDate(weekStartDate);
  if (!week) throw new PlanWeekNotFoundError(weekStartDate);
  return week;
}

export async function getWeek(weekStartDate: string) {
  const week = await findWeekOrThrow(weekStartDate);
  const [slots, current] = await Promise.all([
    findSlotsByWeekId(week.id),
    getCurrentInputVersions(),
  ]);
  const evaluation = evaluateStaleness(week.violations !== null, week, current);
  return { ...week, slots, evaluation };
}

export async function setSlotLocked(
  weekStartDate: string,
  day: number,
  mealSlot: MealSlot,
  locked: boolean,
  expectedRevision: number,
) {
  const week = await findWeekOrThrow(weekStartDate);
  const slots = await findSlotsByWeekId(week.id);
  const evaluation = await reevaluateSlots(
    weekStartDate,
    slots.map((slot) =>
      slot.day === day && slot.mealSlot === mealSlot ? { ...slot, locked } : slot,
    ),
  );

  return db.transaction(async (tx) => {
    const updatedWeek = await casIncrementRevision(week.id, expectedRevision, evaluation, tx);
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

  const inputVersions = await getCurrentInputVersions();
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
  const violations = evaluateSlots(
    slots.map((slot) =>
      slot.day === day && slot.mealSlot === mealSlot
        ? { ...slot, recipeId, memberServings }
        : slot,
    ),
    inputs.pantry,
    ctx,
  );

  return db.transaction(async (tx) => {
    const updatedWeek = await casIncrementRevision(
      week.id,
      expectedRevision,
      { violations, ...inputVersions },
      tx,
    );
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
