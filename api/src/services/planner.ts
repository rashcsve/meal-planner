import { MEAL_SLOTS, PLANNER_VERSION, scaleToServings } from "shared";
import type {
  PlannerRecipe,
  PlannerIngredientPrice,
  PlannerPantryItem,
  PlannerPreferences,
  LockedSlot,
  PlannerTargets,
  MemberDinnerTarget,
  MemberServing,
  PlanResult,
  PlanViolation,
  PlannedSlot,
  MealSlot,
} from "shared";
import { createRng } from "../lib/rng.js";

// ---------------------------------------------------------------------------
// Slot addressing: the week is a 7 x 4 grid (day 0-6 x MEAL_SLOTS). Every
// function below identifies a cell either as (day, mealSlot) or as the
// packed SlotKey string "day:mealSlot" used as a Map key.
// ---------------------------------------------------------------------------

const DAYS_PER_WEEK = 7;

/**
 * Only dinner is generated for now; breakfast/lunch/snack_or_dessert stay in
 * the shared MealSlot type for a later phase but are never filled or
 * validated (see context/build-plan.md step 27.1).
 */
const PLANNED_MEAL_SLOTS: readonly MealSlot[] = ["dinner"];

/**
 * Pantry items expiring within this many days are a hard "must be used by"
 * constraint (see resolveExpiryConstraints) - the same threshold decides
 * when buildReasons calls an ingredient "expiring soon" for display.
 *
 * @example
 * daysUntilExpiry=2 falls inside this window (must be used by day 2);
 * daysUntilExpiry=5 doesn't.
 */
const EXPIRY_MUST_USE_WINDOW_DAYS = 3;

export const MEAL_SLOT_TYPES: Record<MealSlot, string[]> = {
  breakfast: ["breakfast"],
  lunch: ["lunch"],
  dinner: ["dinner"],
  snack_or_dessert: ["snack", "dessert"],
};

export type SlotKey = `${number}:${MealSlot}`;

export const slotKey = (day: number, mealSlot: MealSlot): SlotKey => `${day}:${mealSlot}`;

export function parseSlotKey(key: SlotKey): {
  day: number;
  mealSlot: MealSlot;
} {
  const [dayText, mealSlot] = key.split(":") as [string, MealSlot];
  return { day: Number(dayText), mealSlot };
}

/**
 * undefined only when items is empty.
 *
 * @example
 * pickRandom(["a", "b", "c"], rng) -> one of "a", "b", or "c".
 */
function pickRandom<T>(items: T[], rng: () => number): T | undefined {
  return items[Math.floor(rng() * items.length)];
}

// ---------------------------------------------------------------------------
// PlannerContext: recipe/price lookups built once per plan() call, so
// localSearch - which runs hundreds of times - doesn't redo them every
// time.
// ---------------------------------------------------------------------------

export type RecipeIndex = Map<number, PlannerRecipe>;

export function indexRecipesById(recipes: PlannerRecipe[]): RecipeIndex {
  return new Map(recipes.map((recipe) => [recipe.id, recipe]));
}

export interface PlannerContext {
  recipes: PlannerRecipe[];
  recipesById: RecipeIndex;
  prices: PlannerIngredientPrice[];
  pricesByIngredient: Map<number, PlannerIngredientPrice[]>;
  promoIngredientIds: Set<number>;
  neverIngredientIds: Set<number>;
  eligibleRecipesBySlot: Map<MealSlot, PlannerRecipe[]>;
  targets: PlannerTargets;
}

/**
 * Groups every price row by ingredientId, so countDistinctStores can look
 * up "which stores sell ingredient X" without scanning the whole price
 * list. One ingredient can map to several rows - one per store.
 *
 * @param prices - every tracked ingredient price, across all stores.
 * @returns a Map from ingredientId to all of its price rows.
 *
 * @example
 * Two price rows for ingredient 12 (Albert, Lidl) -> Map { 12 => [both rows] }.
 */
function indexPricesByIngredient(
  prices: PlannerIngredientPrice[],
): Map<number, PlannerIngredientPrice[]> {
  const index = new Map<number, PlannerIngredientPrice[]>();
  for (const price of prices) {
    const entries = index.get(price.ingredientId) ?? [];
    entries.push(price);
    index.set(price.ingredientId, entries);
  }
  return index;
}

const MIN_PLAUSIBLE_SERVINGS = 0.25;
const MAX_PLAUSIBLE_SERVINGS = 4;
const SERVING_ROUNDING = 0.25;

/**
 * Rounds to the nearest quarter-serving - closer to how a portion would
 * actually be measured out than a continuous fraction.
 *
 * @example
 * roundToNearestServing(1.19) -> 1.25
 */
function roundToNearestServing(servings: number): number {
  return Math.round(servings / SERVING_ROUNDING) * SERVING_ROUNDING;
}

/**
 * Each member's portion of one recipe: how many (quarter-rounded) servings
 * they need to hit their own dinner calorie target from this recipe's
 * kcal-per-serving. Used both to decide whether a recipe is eligible for a
 * dinner slot (see isServingsPlausible) and to record the actual portions
 * once a recipe has been picked for a slot.
 *
 * @example
 * recipe.calories=420, memberTargets=[{memberId:1,dinnerCalorieTarget:500}]
 * -> [{memberId:1, servings:1.25}] (500/420 rounded to the nearest 0.25).
 */
export function computeMemberServings(
  recipe: PlannerRecipe,
  memberTargets: MemberDinnerTarget[],
): MemberServing[] {
  return memberTargets.map((target) => ({
    memberId: target.memberId,
    servings: roundToNearestServing(target.dinnerCalorieTarget / recipe.calories),
  }));
}

/**
 * A recipe can't fill a dinner slot if scaling it to any member's target
 * would need an unrealistic portion (a sliver or several platefuls) - see
 * context/build-plan.md step 27.1.
 */
export function isServingsPlausible(
  recipe: PlannerRecipe,
  memberTargets: MemberDinnerTarget[],
): boolean {
  return computeMemberServings(recipe, memberTargets).every(
    (member) =>
      member.servings >= MIN_PLAUSIBLE_SERVINGS && member.servings <= MAX_PLAUSIBLE_SERVINGS,
  );
}

/**
 * Why a recipe can't fill this slot, or null if it's eligible. Shared by
 * indexEligibleRecipesBySlot (bulk filtering during generation) and
 * replaceSlot's server-side validation of a single manually-picked recipe,
 * so the two can never disagree about what's eligible.
 *
 * @example
 * checkSlotEligibility(lunchOnlyRecipe, "dinner", new Set(), []) ->
 * "recipe's meal type ('lunch') doesn't match slot 'dinner'"
 */
export function checkSlotEligibility(
  recipe: PlannerRecipe,
  mealSlot: MealSlot,
  neverIngredientIds: Set<number>,
  memberTargets: MemberDinnerTarget[],
): string | null {
  const allowedTypes = MEAL_SLOT_TYPES[mealSlot];
  if (!allowedTypes.includes(recipe.mealType)) {
    return `recipe's meal type ('${recipe.mealType}') doesn't match slot '${mealSlot}'`;
  }

  const excludedIngredientId = recipe.ingredientIds.find((id) => neverIngredientIds.has(id));
  if (excludedIngredientId !== undefined) {
    return `recipe uses excluded ingredient ${excludedIngredientId}`;
  }

  if (PLANNED_MEAL_SLOTS.includes(mealSlot) && !isServingsPlausible(recipe, memberTargets)) {
    return "recipe's calories-per-serving would need an implausible portion (under 0.25 or over 4 servings) for a household member";
  }

  return null;
}

/**
 * Eligibility per slot never changes during one run, so this is computed
 * once (only 4 slots) instead of re-filtering every time localSearch asks.
 *
 * @example
 * A "lunch" recipe containing a never-ingredient is excluded from the
 * "lunch" entry, even though its mealType matches.
 */
function indexEligibleRecipesBySlot(
  recipes: PlannerRecipe[],
  neverIngredientIds: Set<number>,
  targets: PlannerTargets,
): Map<MealSlot, PlannerRecipe[]> {
  const index = new Map<MealSlot, PlannerRecipe[]>();
  for (const mealSlot of MEAL_SLOTS) {
    index.set(
      mealSlot,
      recipes.filter(
        (recipe) =>
          checkSlotEligibility(recipe, mealSlot, neverIngredientIds, targets.memberTargets) ===
          null,
      ),
    );
  }
  return index;
}

export function buildPlannerContext(
  recipes: PlannerRecipe[],
  prices: PlannerIngredientPrice[],
  preferences: PlannerPreferences,
  targets: PlannerTargets,
): PlannerContext {
  const neverIngredientIds = new Set(preferences.neverIngredientIds);

  return {
    recipes,
    recipesById: indexRecipesById(recipes),
    prices,
    pricesByIngredient: indexPricesByIngredient(prices),
    promoIngredientIds: new Set(
      prices.filter((price) => price.isPromo).map((price) => price.ingredientId),
    ),
    neverIngredientIds,
    eligibleRecipesBySlot: indexEligibleRecipesBySlot(recipes, neverIngredientIds, targets),
    targets,
  };
}

export function eligibleRecipes(mealSlot: MealSlot, ctx: PlannerContext): PlannerRecipe[] {
  return ctx.eligibleRecipesBySlot.get(mealSlot) ?? [];
}

// ---------------------------------------------------------------------------
// 1. Expiry resolution - which pantry items must be used, and by when.
// ---------------------------------------------------------------------------

export interface MustUseConstraint {
  ingredientId: number;
  deadlineDay: number;
  candidateRecipeIds: number[];
}

export function resolveExpiryConstraints(
  pantry: PlannerPantryItem[],
  recipes: PlannerRecipe[],
): { constraints: MustUseConstraint[]; violations: PlanViolation[] } {
  const constraints: MustUseConstraint[] = [];
  const violations: PlanViolation[] = [];

  for (const item of pantry) {
    if (item.daysUntilExpiry === null || item.daysUntilExpiry > EXPIRY_MUST_USE_WINDOW_DAYS)
      continue;

    const candidateRecipeIds = recipes
      .filter((recipe) => recipe.ingredientIds.includes(item.ingredientId))
      .map((recipe) => recipe.id);

    if (item.daysUntilExpiry < 0) {
      violations.push({
        slot: null,
        constraint: "pantry_expiry",
        detail: `ingredient ${item.ingredientId} already expired, unused`,
      });
    } else if (candidateRecipeIds.length === 0) {
      violations.push({
        slot: null,
        constraint: "pantry_expiry",
        detail: `no recipe uses ingredient ${item.ingredientId}, expiring in ${item.daysUntilExpiry} day(s)`,
      });
    } else {
      constraints.push({
        ingredientId: item.ingredientId,
        deadlineDay: Math.min(item.daysUntilExpiry, DAYS_PER_WEEK - 1),
        candidateRecipeIds,
      });
    }
  }

  return { constraints, violations };
}

// ---------------------------------------------------------------------------
// 2. Placement - locked slots and expiry-forced recipes claim their slots
//    before anything else can.
// ---------------------------------------------------------------------------

/**
 * Every valid (slot, recipe) match for one constraint, up to its deadline.
 * A slot with 3 matching recipes adds 3 entries, not 1 - so the random
 * pick below treats a slot with more options as proportionally more
 * likely, not every slot as equally likely. Returns an empty array if no
 * day/slot/recipe combination works - the caller treats that as a
 * violation, not an error.
 *
 * @param constraint - the ingredient, deadline day, and candidate recipes.
 * @param assigned - the grid so far; already-filled slots are skipped.
 * @param recipesById - lookup used to check each candidate's mealType.
 * @returns every valid { key, recipeId } placement for this constraint.
 *
 * @example
 * deadlineDay=1, candidateRecipeIds=[5,6] -> could return
 * [{key:"0:lunch",recipeId:5}, {key:"1:dinner",recipeId:6}, ...].
 */
function findPlacementOptions(
  constraint: MustUseConstraint,
  assigned: Map<SlotKey, number>,
  recipesById: RecipeIndex,
): { key: SlotKey; recipeId: number }[] {
  const options: { key: SlotKey; recipeId: number }[] = [];

  for (let day = 0; day <= constraint.deadlineDay; day++) {
    for (const mealSlot of PLANNED_MEAL_SLOTS) {
      const key = slotKey(day, mealSlot);
      if (assigned.has(key)) continue;

      const allowedTypes = MEAL_SLOT_TYPES[mealSlot];
      for (const id of constraint.candidateRecipeIds) {
        if (allowedTypes.includes(recipesById.get(id)?.mealType ?? "")) {
          options.push({ key, recipeId: id });
        }
      }
    }
  }

  return options;
}

/**
 * Drops locked slots straight into the grid, then places each expiry
 * constraint into a random valid slot, tightest deadline first. A
 * constraint with no valid slot becomes a violation, not a thrown error.
 *
 * @param constraints - must-use-by-day-X rules from resolveExpiryConstraints.
 * @param recipesById - lookup used to check candidate recipes' mealType.
 * @param locked - slots the user pinned; always win, no eligibility check.
 * @param rng - seeded random source, so the choice is reproducible.
 * @returns the partially-filled grid plus any placement violations.
 *
 * @example
 * locked=[{day:0,mealSlot:"lunch",recipeId:1}] plus one expiry
 * constraint for ingredient 9 (deadlineDay 2) -> assigned has
 * "0:lunch" -> 1 (from locked) and one more entry somewhere in
 * days 0-2 for the expiring ingredient.
 */
export function placeMustUseConstraints(
  constraints: MustUseConstraint[],
  recipesById: RecipeIndex,
  locked: LockedSlot[],
  rng: () => number,
): { assigned: Map<SlotKey, number>; violations: PlanViolation[] } {
  const assigned = new Map<SlotKey, number>();
  for (const lockedSlot of locked) {
    assigned.set(slotKey(lockedSlot.day, lockedSlot.mealSlot), lockedSlot.recipeId);
  }

  const violations: PlanViolation[] = [];
  // Tightest deadline first: a constraint with 1 day left has fewer valid
  // slots than one with 3, so it should claim its slot before options narrow.
  const sortedByDeadline = [...constraints].sort((a, b) => a.deadlineDay - b.deadlineDay);

  for (const constraint of sortedByDeadline) {
    const options = findPlacementOptions(constraint, assigned, recipesById);

    if (options.length === 0) {
      violations.push({
        slot: null,
        constraint: "pantry_expiry",
        detail: `no free slot by day ${constraint.deadlineDay} for ingredient ${constraint.ingredientId}`,
      });
      continue;
    }

    const choice = pickRandom(options, rng);
    if (!choice) continue;
    assigned.set(choice.key, choice.recipeId);
  }

  return { assigned, violations };
}

// ---------------------------------------------------------------------------
// 3. Fill the empty slots. Calorie fit no longer picks the recipe - any
//    recipe's calories can be absorbed by scaling each member's portion
//    (see computeMemberServings) - so the best-scoring eligible candidate
//    wins instead (same soft preferences localSearch applies later: promo,
//    protein variety, speed, store count).
// ---------------------------------------------------------------------------

/**
 * @example
 * Day 2's dinner is still empty; among the eligible recipes, the one with
 * the highest scoreSlot (say, an on-promo, no-recent-repeat, quick weekday
 * dinner) is picked.
 */
export function fillRemainingSlots(
  ctx: PlannerContext,
  assigned: Map<SlotKey, number>,
): PlanViolation[] {
  const violations: PlanViolation[] = [];

  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    for (const mealSlot of PLANNED_MEAL_SLOTS) {
      const key = slotKey(day, mealSlot);
      if (assigned.has(key)) continue;

      const candidates = eligibleRecipes(mealSlot, ctx);
      if (candidates.length === 0) {
        violations.push({
          slot: { day, mealSlot },
          constraint: "no_eligible_recipe",
          detail: `no recipe available for ${mealSlot} on day ${day}`,
        });
        continue;
      }

      const choice = candidates.reduce((best, candidate) =>
        scoreSlot(day, mealSlot, candidate.id, assigned, ctx) >
        scoreSlot(day, mealSlot, best.id, assigned, ctx)
          ? candidate
          : best,
      );

      assigned.set(key, choice.id);
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// 4. Check the whole finished plan: each member's dinner calories, and the
//    weekly budget.
// ---------------------------------------------------------------------------

const CALORIE_TOLERANCE = 0.1;

/**
 * Quarter-serving rounding can still land outside tolerance for a recipe
 * whose calories-per-serving is far from a member's target (e.g. a
 * low-calorie recipe where one quarter-serving already overshoots) - that's
 * a real violation, not a rounding artifact to hide.
 *
 * @example
 * memberTarget=500, recipe.calories=420 -> 1.25 servings -> 525 kcal,
 * within ±10% of 500 -> no violation.
 */
export function validateMemberDinnerCalories(
  ctx: PlannerContext,
  assigned: Map<SlotKey, number>,
): PlanViolation[] {
  const violations: PlanViolation[] = [];

  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    const recipeId = assigned.get(slotKey(day, "dinner"));
    if (recipeId === undefined) continue;
    const recipe = ctx.recipesById.get(recipeId);
    if (!recipe) continue;

    for (const memberServing of computeMemberServings(recipe, ctx.targets.memberTargets)) {
      const memberTarget = ctx.targets.memberTargets.find(
        (target) => target.memberId === memberServing.memberId,
      )!;
      const actualCalories = memberServing.servings * recipe.calories;
      const lowerBound = memberTarget.dinnerCalorieTarget * (1 - CALORIE_TOLERANCE);
      const upperBound = memberTarget.dinnerCalorieTarget * (1 + CALORIE_TOLERANCE);

      if (actualCalories < lowerBound || actualCalories > upperBound) {
        violations.push({
          slot: { day, mealSlot: "dinner" },
          constraint: "member_dinner_calories",
          detail: `day ${day} dinner gives member ${memberServing.memberId} ${actualCalories} kcal (${memberServing.servings} servings), outside ±10% of ${memberTarget.dinnerCalorieTarget}`,
        });
      }
    }
  }

  return violations;
}

/**
 * Scales each recipe's costCzk by the total servings needed for that slot
 * (summed across members) versus the recipe's own base yield. Doesn't
 * account for ingredients shared across recipes and bought only once - a
 * simplification, not a bug.
 *
 * @example
 * A 4-serving, 400 Kč recipe scaled to 2.25 total servings this slot ->
 * 400 * (2.25/4) = 225 Kč counted toward the week's budget.
 */
export function validateWeeklyBudget(
  ctx: PlannerContext,
  assigned: Map<SlotKey, number>,
): PlanViolation[] {
  const total = [...assigned.values()].reduce((sum, recipeId) => {
    const recipe = ctx.recipesById.get(recipeId);
    if (!recipe) return sum;
    const totalServings = computeMemberServings(recipe, ctx.targets.memberTargets).reduce(
      (servingsSum, member) => servingsSum + member.servings,
      0,
    );
    return sum + scaleToServings(recipe.costCzk, recipe.baseServings, totalServings);
  }, 0);

  if (total <= ctx.targets.weeklyBudgetCzk) return [];

  return [
    {
      slot: null,
      constraint: "weekly_budget",
      detail: `week totals ${total} Kč, over budget of ${ctx.targets.weeklyBudgetCzk} Kč`,
    },
  ];
}

// ---------------------------------------------------------------------------
// 5. Human-readable reasons per slot - the detail rail's "why this recipe".
//    Kept on plain recipes[]/prices[] signatures (not PlannerContext) so
//    they stay easy to unit-test against small fixtures on their own.
// ---------------------------------------------------------------------------

/**
 * @example
 * A recipe using an on-promo, soon-to-expire yoghurt returns
 * ["promo: yoghurt on sale at Albert", "uses yoghurt expiring in 1 day(s)"].
 */
export function buildReasons(
  recipeId: number,
  recipes: PlannerRecipe[],
  prices: PlannerIngredientPrice[],
  pantry: PlannerPantryItem[],
): string[] {
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) return [];

  const pricesByIngredient = new Map<number, PlannerIngredientPrice[]>();
  for (const price of prices) {
    const entries = pricesByIngredient.get(price.ingredientId) ?? [];
    entries.push(price);
    pricesByIngredient.set(price.ingredientId, entries);
  }

  const reasons: string[] = [];
  for (const ingredientId of recipe.ingredientIds) {
    const priceEntries = pricesByIngredient.get(ingredientId) ?? [];
    const name = priceEntries[0]?.ingredientName ?? `ingredient ${ingredientId}`;

    const promo = priceEntries.find((price) => price.isPromo);
    if (promo) reasons.push(`promo: ${name} on sale at ${promo.store}`);

    const expiring = pantry.find(
      (item) =>
        item.ingredientId === ingredientId &&
        item.daysUntilExpiry !== null &&
        item.daysUntilExpiry <= EXPIRY_MUST_USE_WINDOW_DAYS,
    );
    if (expiring) reasons.push(`uses ${name} expiring in ${expiring.daysUntilExpiry} day(s)`);
  }

  return reasons;
}

const VARIETY_WINDOW_DAYS = 3;

/**
 * Only lunch/dinner have a "main protein" worth tracking - breakfast and
 * snacks are exempt.
 */
const PROTEIN_TRACKED_SLOTS: readonly MealSlot[] = ["lunch", "dinner"];

/**
 * Shared by buildProteinVarietyReason (the display string) and scoreSlot
 * (the number that drives local search) so the two can never drift apart.
 *
 * @example
 * Day 2 dinner is chicken, day 0 lunch was already chicken -> returns 0.
 */
function findProteinRepeatDay(
  day: number,
  mealSlot: MealSlot,
  recipeId: number,
  assigned: Map<SlotKey, number>,
  recipesById: RecipeIndex,
): number | null {
  if (!PROTEIN_TRACKED_SLOTS.includes(mealSlot)) return null;

  const protein = recipesById.get(recipeId)?.proteinSource;
  if (!protein) return null;

  let repeatDay: number | null = null;
  for (let otherDay = Math.max(0, day - VARIETY_WINDOW_DAYS); otherDay < day; otherDay++) {
    for (const otherSlot of PROTEIN_TRACKED_SLOTS) {
      const otherRecipeId = assigned.get(slotKey(otherDay, otherSlot));
      if (
        otherRecipeId !== undefined &&
        recipesById.get(otherRecipeId)?.proteinSource === protein
      ) {
        repeatDay = otherDay;
      }
    }
  }
  return repeatDay;
}

export function buildProteinVarietyReason(
  day: number,
  mealSlot: MealSlot,
  recipeId: number,
  recipes: PlannerRecipe[],
  assigned: Map<SlotKey, number>,
): string | null {
  if (!PROTEIN_TRACKED_SLOTS.includes(mealSlot)) return null;

  const recipesById = indexRecipesById(recipes);
  const protein = recipesById.get(recipeId)?.proteinSource;
  if (!protein) return null;

  const repeatDay = findProteinRepeatDay(day, mealSlot, recipeId, assigned, recipesById);

  return repeatDay === null
    ? `no ${protein} in ${VARIETY_WINDOW_DAYS + 1} days`
    : `${protein} repeats within ${VARIETY_WINDOW_DAYS + 1} days (also day ${repeatDay})`;
}

// ---------------------------------------------------------------------------
// 6. Soft-preference scoring: one weighted number per slot, summed into a
//    single plan score for local search to maximize.
//
//    Scales: promo 0-3ish, protein -1/0/+1, speed ~[-1, 1]. Store count is
//    whole-plan, not per-slot - subtracted once, not part of scoreSlot.
// ---------------------------------------------------------------------------

export function isWeekday(day: number, targets: PlannerTargets): boolean {
  const dayOfWeek = (targets.startDayOfWeek + day) % 7;
  return dayOfWeek !== 0 && dayOfWeek !== 6;
}

/**
 * All meals, weekdays only. Normalized to ~[-1, 1] via a 60-min reference.
 *
 * @example
 * A 15-minute recipe on a weekday -> (60-15)/60 = 0.75.
 */
export function weekdaySpeedScore(
  day: number,
  recipe: PlannerRecipe,
  targets: PlannerTargets,
): number {
  if (!isWeekday(day, targets)) return 0;
  const REFERENCE_MINUTES = 60;
  return (REFERENCE_MINUTES - recipe.timeMinutes) / REFERENCE_MINUTES;
}

function promoCount(recipe: PlannerRecipe, promoIngredientIds: Set<number>): number {
  return recipe.ingredientIds.filter((id) => promoIngredientIds.has(id)).length;
}

export const WEIGHTS = {
  promo: 1,
  proteinVariety: 1,
  weekdaySpeed: 1,
  storeCount: 2,
};

/**
 * @example
 * A promo ingredient (+1), no recent protein repeat (+1), and a
 * 15-min weekday dinner (+0.75) -> 2.75 with the default WEIGHTS.
 */
export function scoreSlot(
  day: number,
  mealSlot: MealSlot,
  recipeId: number,
  assigned: Map<SlotKey, number>,
  ctx: PlannerContext,
): number {
  const recipe = ctx.recipesById.get(recipeId);
  if (!recipe) return 0;

  const repeatDay = findProteinRepeatDay(day, mealSlot, recipeId, assigned, ctx.recipesById);
  const proteinScore = PROTEIN_TRACKED_SLOTS.includes(mealSlot)
    ? (repeatDay === null ? 1 : -1) * WEIGHTS.proteinVariety
    : 0;

  return (
    promoCount(recipe, ctx.promoIngredientIds) * WEIGHTS.promo +
    proteinScore +
    weekdaySpeedScore(day, recipe, ctx.targets) * WEIGHTS.weekdaySpeed
  );
}

/**
 * Picks the best store repeatedly until everything's covered. Not
 * guaranteed to find the fewest stores possible.
 *
 * @example
 * Every needed ingredient is sold at "Albert" -> returns 1, even if
 * some of them are also sold elsewhere.
 */
export function countDistinctStores(assigned: Map<SlotKey, number>, ctx: PlannerContext): number {
  const neededIngredients = new Set<number>();
  for (const recipeId of assigned.values()) {
    for (const ingredientId of ctx.recipesById.get(recipeId)?.ingredientIds ?? []) {
      neededIngredients.add(ingredientId);
    }
  }

  const storeToIngredients = new Map<string, Set<number>>();
  for (const ingredientId of neededIngredients) {
    for (const price of ctx.pricesByIngredient.get(ingredientId) ?? []) {
      const ingredients = storeToIngredients.get(price.store) ?? new Set<number>();
      ingredients.add(ingredientId);
      storeToIngredients.set(price.store, ingredients);
    }
  }

  const uncovered = new Set(neededIngredients);
  let storeCount = 0;

  while (uncovered.size > 0) {
    let bestIngredients: Set<number> | null = null;
    let bestCoverage = 0;
    for (const ingredients of storeToIngredients.values()) {
      let coverage = 0;
      for (const id of ingredients) if (uncovered.has(id)) coverage++;
      if (coverage > bestCoverage) {
        bestCoverage = coverage;
        bestIngredients = ingredients;
      }
    }
    if (!bestIngredients) break;
    for (const id of bestIngredients) uncovered.delete(id);
    storeCount++;
  }

  return storeCount;
}

/**
 * The single number localSearch compares before/after a swap. Sums
 * scoreSlot for every filled cell, then subtracts the store-count penalty
 * once for the whole plan - not per slot, since store count isn't a
 * per-slot property (see the Section 6 header comment).
 *
 * @param assigned - the full 28-slot grid to score.
 * @param ctx - recipe/price lookups and targets, built once per plan() run.
 * @returns the plan's total soft-preference score.
 *
 * @example
 * 28 scoreSlot values summed, minus (countDistinctStores *
 * WEIGHTS.storeCount) once for the whole plan.
 */
export function scorePlan(assigned: Map<SlotKey, number>, ctx: PlannerContext): number {
  let total = 0;
  for (const [key, recipeId] of assigned) {
    const { day, mealSlot } = parseSlotKey(key);
    total += scoreSlot(day, mealSlot, recipeId, assigned, ctx);
  }
  return total - countDistinctStores(assigned, ctx) * WEIGHTS.storeCount;
}

// ---------------------------------------------------------------------------
// 7. What: randomly swap one slot's recipe, keep the swap only if it
//    helps, undo it otherwise. Why: earlier steps only pick by calories -
//    this is the only place promos, protein variety, speed, and store
//    count ever get considered.
// ---------------------------------------------------------------------------

/**
 * The two numbers isBetter compares.
 *
 * @example
 * { violationCount: 0, score: 4.5 } beats { violationCount: 1, score: 20 }.
 */
interface PlanQuality {
  violationCount: number;
  score: number;
}

function evaluatePlan(assigned: Map<SlotKey, number>, ctx: PlannerContext): PlanQuality {
  const violationCount =
    validateMemberDinnerCalories(ctx, assigned).length + validateWeeklyBudget(ctx, assigned).length;
  return { violationCount, score: scorePlan(assigned, ctx) };
}

/**
 * Compare violationCount first, score second. Fewer broken rules always
 * wins, even with a lower score - score only decides when both plans
 * break the same number of rules.
 *
 * @example
 * isBetter({violationCount:0,score:5}, {violationCount:1,score:20}) -> true
 */
function isBetter(candidate: PlanQuality, current: PlanQuality): boolean {
  if (candidate.violationCount !== current.violationCount) {
    return candidate.violationCount < current.violationCount;
  }
  return candidate.score > current.score;
}

/**
 * protectedKeys = locked + expiring-ingredient slots. Off-limits:
 * swapping one could break a rule an earlier step already solved.
 *
 * @example
 * Tries swapping day 3 lunch from recipe 4 to recipe 7; keeps the
 * swap only if it doesn't add violations and the score isn't worse.
 */
export function localSearch(
  assigned: Map<SlotKey, number>,
  ctx: PlannerContext,
  protectedKeys: Set<SlotKey>,
  rng: () => number,
  iterations: number,
): Map<SlotKey, number> {
  const freeKeys = [...assigned.keys()].filter((key) => !protectedKeys.has(key));
  let quality = evaluatePlan(assigned, ctx);

  for (let i = 0; i < iterations; i++) {
    if (freeKeys.length === 0) break;

    // Pick a random slot and a random different recipe for it.
    const key = pickRandom(freeKeys, rng);
    if (!key) continue;
    const { mealSlot } = parseSlotKey(key);
    const candidates = eligibleRecipes(mealSlot, ctx);
    const candidate = pickRandom(candidates, rng);
    if (!candidate) continue;

    // Nothing to try if it picked the same recipe already there.
    const previousRecipeId = assigned.get(key);
    if (previousRecipeId === undefined || previousRecipeId === candidate.id) continue;

    // Make the swap, check the plan, keep it or put the old one back.
    assigned.set(key, candidate.id);
    const newQuality = evaluatePlan(assigned, ctx);

    if (isBetter(newQuality, quality)) {
      quality = newQuality;
    } else {
      assigned.set(key, previousRecipeId);
    }
  }

  return assigned;
}

// ---------------------------------------------------------------------------
// 8. plan() - runs the pipeline above in order and assembles the result.
// ---------------------------------------------------------------------------

export function collectReasons(
  day: number,
  mealSlot: MealSlot,
  recipeId: number,
  recipes: PlannerRecipe[],
  prices: PlannerIngredientPrice[],
  pantry: PlannerPantryItem[],
  assigned: Map<SlotKey, number>,
): string[] {
  const varietyReason = buildProteinVarietyReason(day, mealSlot, recipeId, recipes, assigned);
  return [
    ...buildReasons(recipeId, recipes, prices, pantry),
    ...(varietyReason ? [varietyReason] : []),
  ];
}

const DEFAULT_LOCAL_SEARCH_ITERATIONS = 500;

/**
 * @param recipes - the household's full recipe library.
 * @param prices - ingredient prices across every tracked store.
 * @param pantry - current stock, used to force soon-to-expire ingredients.
 * @param preferences - never-ingredients for the household.
 * @param locked - slots the user has pinned and the algorithm won't touch.
 * @param targets - daily calorie and weekly budget targets.
 * @param seed - makes the randomized parts (placement ties, local search)
 *
 * @returns the 28 slots, any violations, and the seed/version used.
 *
 * @example
 * plan(..., seed: 42) always returns the identical 28-slot result for
 * the same inputs - that's what makes a bad plan reproducible.
 */
export function plan(
  recipes: PlannerRecipe[],
  prices: PlannerIngredientPrice[],
  pantry: PlannerPantryItem[],
  preferences: PlannerPreferences,
  locked: LockedSlot[],
  targets: PlannerTargets,
  seed: number,
): PlanResult {
  const rng = createRng(seed);
  const ctx = buildPlannerContext(recipes, prices, preferences, targets);
  const violations: PlanViolation[] = [];

  // Pantry items expiring soon must land on a specific day-or-earlier.
  const expiry = resolveExpiryConstraints(pantry, recipes);
  violations.push(...expiry.violations);

  // Locked slots and expiry-forced placements claim their slots first.
  const placement = placeMustUseConstraints(expiry.constraints, ctx.recipesById, locked, rng);
  violations.push(...placement.violations);
  const assigned = placement.assigned;
  const protectedKeys = new Set(assigned.keys());

  // Fill everything else, steering toward the best-scoring eligible recipe.
  violations.push(...fillRemainingSlots(ctx, assigned));

  // Try to improve the plan without breaking a rule or touching a
  // protected slot.
  localSearch(assigned, ctx, protectedKeys, rng, DEFAULT_LOCAL_SEARCH_ITERATIONS);

  // Final check against the finished plan.
  violations.push(...validateMemberDinnerCalories(ctx, assigned));
  violations.push(...validateWeeklyBudget(ctx, assigned));

  const lockedKeys = new Set(
    locked.map((lockedSlot) => slotKey(lockedSlot.day, lockedSlot.mealSlot)),
  );
  const slots: PlannedSlot[] = [];
  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    for (const mealSlot of PLANNED_MEAL_SLOTS) {
      const key = slotKey(day, mealSlot);
      const recipeId = assigned.get(key) ?? null;
      const recipe = recipeId === null ? null : ctx.recipesById.get(recipeId);
      slots.push({
        day,
        mealSlot,
        recipeId,
        locked: lockedKeys.has(key),
        reasons:
          recipeId === null
            ? []
            : collectReasons(day, mealSlot, recipeId, recipes, prices, pantry, assigned),
        memberServings: recipe ? computeMemberServings(recipe, targets.memberTargets) : [],
      });
    }
  }

  return { slots, violations, seed, plannerVersion: PLANNER_VERSION };
}
