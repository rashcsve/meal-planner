import { PLANNER_VERSION } from "shared";
import type { AcceptPlanInput, LockedSlot, MealSlot, MemberServing } from "shared";
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
  DAYS_PER_WEEK,
  PLANNED_MEAL_SLOTS,
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
import {
  getCurrentInputVersions,
  type CurrentInputVersions,
} from "../repositories/planInputVersions.js";
import {
  evaluateStaleness,
  WATERMARKS,
  type PlanEvaluationStatus,
  type StaleInput,
} from "./plan-staleness.js";
import {
  findSlotsByWeekId,
  findLockedSlotsByWeekId,
  updateSlotLocked,
  updateSlotRecipe,
  upsertPlanSlots,
  type PlanSlotInput,
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
  AcceptedSlotsMismatchError,
  StalePreviewError,
  WeekAlreadyGeneratedError,
  SlotEmptyError,
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

async function runPlanner(
  weekStartDate: string,
  seed: number,
  existingWeek: Awaited<ReturnType<typeof findPlanWeekByDate>>,
) {
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
  return { inputVersions, inputs, result };
}

export async function previewPlan(weekStartDate: string, seed: number) {
  const existingWeek = await findPlanWeekByDate(weekStartDate);
  const { inputVersions, inputs, result } = await runPlanner(weekStartDate, seed, existingWeek);
  const lockedRows = existingWeek ? await findLockedSlotsByWeekId(existingWeek.id) : [];
  const slots = result.slots.map((slot) => {
    const saved = lockedRows.find(
      (row) => row.day === slot.day && row.mealSlot === slot.mealSlot && row.recipeId !== null,
    );
    return saved ? { ...slot, memberServings: saved.memberServings } : slot;
  });
  const ctx = buildPlannerContext(
    inputs.recipes,
    inputs.prices,
    inputs.preferences,
    inputs.targets,
  );
  return {
    weekStartDate,
    seed: result.seed,
    plannerVersion: result.plannerVersion,
    baseRevision: existingWeek?.revision ?? null,
    inputVersions,
    slots,
    violations: evaluateSlots(slots, inputs.pantry, ctx),
    search: result.search,
  };
}

function buildAcceptedSlots(
  sent: { day: number; mealSlot: MealSlot; recipeId: number | null }[],
  savedSlots: Awaited<ReturnType<typeof findSlotsByWeekId>>,
  inputs: PlanInputs,
  ctx: PlannerContext,
): PlanSlotInput[] {
  const expectedKeys = new Set<SlotKey>();
  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    for (const mealSlot of PLANNED_MEAL_SLOTS) expectedKeys.add(slotKey(day, mealSlot));
  }
  const sentKeys = new Set(sent.map((slot) => slotKey(slot.day, slot.mealSlot)));
  if (sent.length !== expectedKeys.size || [...expectedKeys].some((key) => !sentKeys.has(key))) {
    throw new AcceptedSlotsMismatchError(
      `expected one slot for each of ${[...expectedKeys].join(", ")}`,
    );
  }

  const assigned = new Map<SlotKey, number>();
  for (const slot of sent) {
    if (slot.recipeId !== null) assigned.set(slotKey(slot.day, slot.mealSlot), slot.recipeId);
  }

  return sent.map(({ day, mealSlot, recipeId }) => {
    const saved = savedSlots.find((row) => row.day === day && row.mealSlot === mealSlot);
    if (saved?.locked && saved.recipeId !== null) {
      if (saved.recipeId !== recipeId) {
        throw new AcceptedSlotsMismatchError(`day ${day}, ${mealSlot} is locked to another recipe`);
      }
      return {
        day,
        mealSlot,
        recipeId,
        locked: true,
        reasons:
          recipeId === null
            ? []
            : collectReasons(
                day,
                mealSlot,
                recipeId,
                inputs.recipes,
                inputs.prices,
                inputs.pantry,
                assigned,
              ),
        memberServings: saved.memberServings,
      };
    }
    if (recipeId === null) {
      return { day, mealSlot, recipeId, locked: false, reasons: [], memberServings: [] };
    }

    const recipe = ctx.recipesById.get(recipeId);
    if (!recipe) {
      throw new RecipeNotEligibleError(
        recipeId,
        day,
        mealSlot,
        "recipe is missing or lacks data needed to plan with",
      );
    }
    const ineligible = checkSlotEligibility(
      recipe,
      mealSlot,
      ctx.neverIngredientIds,
      inputs.targets.memberTargets,
    );
    if (ineligible) throw new RecipeNotEligibleError(recipeId, day, mealSlot, ineligible);

    return {
      day,
      mealSlot,
      recipeId,
      locked: false,
      reasons: collectReasons(
        day,
        mealSlot,
        recipeId,
        inputs.recipes,
        inputs.prices,
        inputs.pantry,
        assigned,
      ),
      memberServings: computeMemberServings(recipe, inputs.targets.memberTargets),
    };
  });
}

function changedInputs(
  sent: AcceptPlanInput["inputVersions"],
  current: CurrentInputVersions,
): StaleInput[] {
  return WATERMARKS.filter(
    ([, key]) => (sent[key]?.getTime() ?? null) !== (current[key]?.getTime() ?? null),
  ).map(([input]) => input);
}

export async function acceptPlan(input: AcceptPlanInput) {
  const { weekStartDate, seed, baseRevision, inputVersions } = input;
  const existingWeek = await findPlanWeekByDate(weekStartDate);
  if (existingWeek && baseRevision === null) throw new WeekAlreadyGeneratedError(weekStartDate);
  if (!existingWeek && baseRevision !== null) throw new PlanWeekNotFoundError(weekStartDate);
  if (existingWeek && existingWeek.revision !== baseRevision) {
    throw new StaleRevisionError(weekStartDate, baseRevision!);
  }

  const savedSlots = existingWeek ? await findSlotsByWeekId(existingWeek.id) : [];
  const inputs = await getPlanInputs(weekStartDate);
  const ctx = buildPlannerContext(
    inputs.recipes,
    inputs.prices,
    inputs.preferences,
    inputs.targets,
  );
  const slots = buildAcceptedSlots(input.slots, savedSlots, inputs, ctx);
  const violations = evaluateSlots(slots, inputs.pantry, ctx);

  return db.transaction(async (tx) => {
    const current = await getCurrentInputVersions(tx);
    const staleInputs = changedInputs(inputVersions, current);
    if (staleInputs.length > 0) throw new StalePreviewError(weekStartDate, staleInputs);

    const weekData = { seed, plannerVersion: PLANNER_VERSION, violations, ...current };
    const week = existingWeek
      ? await casIncrementRevision(existingWeek.id, baseRevision!, weekData, tx)
      : await insertPlanWeek({ weekStartDate, ...weekData }, tx);
    if (!week) throw new StaleRevisionError(weekStartDate, baseRevision!);

    const savedRows = await upsertPlanSlots(week.id, slots, tx);
    const evaluation: PlanEvaluationStatus = { status: "current", staleInputs: [] };
    return { ...week, slots: savedRows, violations, evaluation };
  });
}

export async function generatePlan(weekStartDate: string, seed: number, expectedRevision?: number) {
  const existingWeek = await findPlanWeekByDate(weekStartDate);
  if (existingWeek && expectedRevision === undefined) {
    throw new ExpectedRevisionRequiredError(weekStartDate);
  }

  const { inputVersions, result } = await runPlanner(weekStartDate, seed, existingWeek);

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
  const target = slots.find((slot) => slot.day === day && slot.mealSlot === mealSlot);
  if (locked && target && target.recipeId === null) throw new SlotEmptyError(day, mealSlot);
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
      slot.day === day && slot.mealSlot === mealSlot ? { ...slot, recipeId, memberServings } : slot,
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
