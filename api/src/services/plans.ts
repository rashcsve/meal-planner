import { PLANNER_VERSION } from "shared";
import type {
  AcceptPlanInput,
  LockedSlot,
  MealSlot,
  MemberServing,
  PlanViolation,
  RecipeSnapshot,
} from "shared";
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
  weekCostCzk,
  DAYS_PER_WEEK,
  PLANNED_MEAL_SLOTS,
  type SlotKey,
  type PlannerContext,
} from "./planner.js";
import { getPlanInputs, type PlanInputs } from "./plan-inputs.js";
import { db } from "../db/index.js";
import { buildRecipeSnapshot } from "./recipes.js";
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
  updateSlotReasons,
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

type EvaluatedSlot = {
  day: number;
  mealSlot: string;
  recipeId: number | null;
  locked: boolean;
  memberServings: MemberServing[];
};

function evaluateSlots(slots: EvaluatedSlot[], pantry: PlanInputs["pantry"], ctx: PlannerContext) {
  const { assigned, locked, savedServings } = toSlotMaps(slots);
  return evaluateExistingWeek(assigned, locked, pantry, ctx, savedServings);
}

function toSlotMaps(slots: EvaluatedSlot[]) {
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
  return { assigned, locked, savedServings };
}

function slotsWeekCost(slots: EvaluatedSlot[], ctx: PlannerContext): number {
  const { assigned, savedServings } = toSlotMaps(slots);
  return Math.round(weekCostCzk(ctx, assigned, savedServings));
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

async function withSnapshots(
  slots: Omit<PlanSlotInput, "recipeSnapshot">[],
  savedSlots: {
    day: number;
    mealSlot: string;
    recipeId: number | null;
    recipeSnapshot: RecipeSnapshot | null;
  }[],
): Promise<PlanSlotInput[]> {
  const kept = slots.map((slot) => {
    const saved = savedSlots.find((s) => s.day === slot.day && s.mealSlot === slot.mealSlot);
    return slot.locked && saved?.recipeId === slot.recipeId ? saved.recipeSnapshot : null;
  });
  const toBuild = new Set(
    slots
      .filter((slot, i) => slot.recipeId !== null && kept[i] === null)
      .map((slot) => slot.recipeId!),
  );
  const built = new Map(
    await Promise.all([...toBuild].map(async (id) => [id, await buildRecipeSnapshot(id)] as const)),
  );
  return slots.map((slot, i) => ({
    ...slot,
    recipeSnapshot: slot.recipeId === null ? null : (kept[i] ?? built.get(slot.recipeId) ?? null),
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
): Omit<PlanSlotInput, "recipeSnapshot">[] {
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
  const slotsToSave = await withSnapshots(slots, savedSlots);

  return db.transaction(async (tx) => {
    const current = await getCurrentInputVersions(tx);
    const staleInputs = changedInputs(inputVersions, current);
    if (staleInputs.length > 0) throw new StalePreviewError(weekStartDate, staleInputs);

    const weekData = { seed, plannerVersion: PLANNER_VERSION, violations, ...current };
    const week = existingWeek
      ? await casIncrementRevision(existingWeek.id, baseRevision!, weekData, tx)
      : await insertPlanWeek({ weekStartDate, ...weekData }, tx);
    if (!week) throw new StaleRevisionError(weekStartDate, baseRevision!);

    const savedRows = await upsertPlanSlots(week.id, slotsToSave, tx);
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
  const lockedRows = existingWeek ? await findLockedSlotsByWeekId(existingWeek.id) : [];
  const slotsToSave = await withSnapshots(result.slots, lockedRows);

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

    const slots = await upsertPlanSlots(week.id, slotsToSave, tx);
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

export async function getSlotCandidates(
  weekStartDate: string,
  day: number,
  mealSlot: MealSlot,
  page: { limit: number; offset: number },
) {
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
  const currentRecipe =
    targetSlot.recipeId === null ? undefined : ctx.recipesById.get(targetSlot.recipeId);
  const currentWeekCost = currentRecipe ? slotsWeekCost(slots, ctx) : null;
  const currentKcal = new Map(
    currentRecipe
      ? targetSlot.memberServings.map((m) => [
          m.memberId,
          Math.round(m.servings * currentRecipe.calories),
        ])
      : [],
  );

  const ranked = eligibleRecipes(mealSlot, ctx)
    .map((recipe) => {
      const memberServings = computeMemberServings(recipe, inputs.targets.memberTargets);
      const candidateSlots = slots.map((slot) =>
        slot.day === day && slot.mealSlot === mealSlot
          ? { ...slot, recipeId: recipe.id, memberServings }
          : slot,
      );
      const violations = evaluateSlots(candidateSlots, inputs.pantry, ctx);
      const weekCost = slotsWeekCost(candidateSlots, ctx);
      const consequences = {
        weekCostCzk: weekCost,
        weekCostDeltaCzk: currentWeekCost === null ? null : weekCost - currentWeekCost,
        members: memberServings.map((member) => {
          const dinnerKcal = Math.round(member.servings * recipe.calories);
          const current = currentKcal.get(member.memberId);
          return {
            memberId: member.memberId,
            dinnerKcal,
            dinnerKcalDelta: current === undefined ? null : dinnerKcal - current,
          };
        }),
      };
      const calorieGap = memberServings.reduce((sum, member) => {
        const target = inputs.targets.memberTargets.find((t) => t.memberId === member.memberId);
        return (
          sum + Math.abs(member.servings * recipe.calories - (target?.dinnerCalorieTarget ?? 0))
        );
      }, 0);
      return {
        recipeId: recipe.id,
        memberServings,
        score: scoreSlot(day, mealSlot, recipe.id, assigned, ctx),
        violations,
        consequences,
        calorieGap,
      };
    })
    .sort(compareCandidates)
    .map(({ calorieGap: _calorieGap, ...candidate }) => candidate);

  return {
    total: ranked.length,
    candidates: ranked.slice(page.offset, page.offset + page.limit),
    suggestions: ranked.filter((c) => c.recipeId !== targetSlot.recipeId).slice(0, 3),
  };
}

const SEVERITY_EPSILON = 1e-9;

function severitySum(violations: PlanViolation[]): number {
  return violations.reduce((sum, violation) => sum + (violation.severity ?? 0), 0);
}

function compareCandidates(
  a: { recipeId: number; score: number; violations: PlanViolation[]; calorieGap: number },
  b: { recipeId: number; score: number; violations: PlanViolation[]; calorieGap: number },
): number {
  if (a.violations.length !== b.violations.length) {
    return a.violations.length - b.violations.length;
  }
  const severityDiff = severitySum(a.violations) - severitySum(b.violations);
  if (Math.abs(severityDiff) > SEVERITY_EPSILON) return severityDiff;
  if (a.score !== b.score) return b.score - a.score;
  if (a.calorieGap !== b.calorieGap) return a.calorieGap - b.calorieGap;
  return a.recipeId - b.recipeId;
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
  const recipeSnapshot = await buildRecipeSnapshot(recipeId);
  if (!recipeSnapshot) throw new RecipeNotFoundError(recipeId);

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
  const neighbourReasons = slots
    .filter(
      (slot) =>
        slot.recipeId !== null &&
        ctx.recipesById.has(slot.recipeId) &&
        !(slot.day === day && slot.mealSlot === mealSlot),
    )
    .map((slot) => ({
      slot,
      reasons: collectReasons(
        slot.day,
        slot.mealSlot as MealSlot,
        slot.recipeId!,
        inputs.recipes,
        inputs.prices,
        inputs.pantry,
        assigned,
      ),
    }))
    .filter(({ slot, reasons }) => JSON.stringify(reasons) !== JSON.stringify(slot.reasons));
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
      recipeSnapshot,
      tx,
    );
    if (!slot) throw new PlanSlotNotFoundError(day, mealSlot);
    for (const neighbour of neighbourReasons) {
      await updateSlotReasons(
        week.id,
        neighbour.slot.day,
        neighbour.slot.mealSlot as MealSlot,
        neighbour.reasons,
        tx,
      );
    }
    return { ...slot, revision: updatedWeek.revision };
  });
}
