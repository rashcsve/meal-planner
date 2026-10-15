import { describe, expect, it } from "vitest";
import type { PlannerIngredientPrice, PlannerRecipe } from "shared";
import {
  plan,
  buildPlannerContext,
  eligibleRecipes,
  placeMustUseConstraints,
  resolveExpiryConstraints,
  parseSlotKey,
  isWeekday,
  buildReasons,
  slotKey,
  validateMemberDinnerCalories,
  validateWeeklyBudget,
  validateAssignedSlots,
  fillRemainingSlots,
  localSearch,
  isBetter,
  evaluatePlan,
  countDistinctStores,
  evaluateExistingWeek,
  type SlotKey,
} from "../src/services/planner.js";
import {
  BUDGET_REPAIR_RECIPE_ID,
  BUDGET_REPAIR_RECIPES,
  FIXTURE_PANTRY,
  FIXTURE_PREFERENCES,
  FIXTURE_PRICES,
  FIXTURE_RECIPES,
  FIXTURE_TARGETS,
  INGREDIENT_ID,
  NEVER_INGREDIENT_RECIPE_IDS,
  RECIPE_ID,
} from "./fixtures/plannerFixtures.js";

function runPlan(seed: number, overrides: Partial<Parameters<typeof plan>[5]> = {}) {
  return plan(
    FIXTURE_RECIPES,
    FIXTURE_PRICES,
    FIXTURE_PANTRY,
    FIXTURE_PREFERENCES,
    [],
    { ...FIXTURE_TARGETS, ...overrides },
    seed,
  );
}

describe("determinism", () => {
  it("returns an identical plan for the same seed and inputs", () => {
    const first = runPlan(42);
    const second = runPlan(42);
    expect(second).toEqual(first);
  });

  it("returns a different plan for a different seed", () => {
    const first = runPlan(1);
    const second = runPlan(2);
    expect(second).not.toEqual(first);
  });
});

describe("hard constraint: each member's dinner calories within ±10% of their target", () => {
  it("keeps every day within tolerance when every member's servings divide evenly", () => {
    // Both fixture members' targets (500, 800) divide recipe.calories=400
    // into an exact multiple of the 0.25-serving rounding step, so there's
    // no rounding artifact to push either member outside tolerance.
    const result = runPlan(7);
    const memberCalorieViolations = result.violations.filter(
      (violation) => violation.constraint === "member_dinner_calories",
    );
    expect(memberCalorieViolations).toEqual([]);
    expect(result.slots).toHaveLength(7);
  });

  it("reports a violation when quarter-serving rounding can't hit a member's target", () => {
    // Target 250 against a 400-kcal/serving recipe rounds to 0.75 servings
    // (300 kcal) - 20% over, outside ±10% - for every day, regardless of
    // which of the two eligible recipes (same calories) is picked.
    const result = runPlan(7, {
      memberTargets: [
        { memberId: 1, dinnerCalorieTarget: 250 },
        { memberId: 2, dinnerCalorieTarget: 800 },
      ],
    });
    const memberCalorieViolations = result.violations.filter(
      (violation) => violation.constraint === "member_dinner_calories",
    );
    expect(memberCalorieViolations).toHaveLength(7);
    for (const violation of memberCalorieViolations) {
      expect(violation.detail).toContain("outside ±10% of 250");
    }
  });

  it("sets severity to the miss beyond the ±10% band as a fraction of the target", () => {
    const ctx = buildPlannerContext(FIXTURE_RECIPES, FIXTURE_PRICES, FIXTURE_PREFERENCES, {
      ...FIXTURE_TARGETS,
      memberTargets: [
        { memberId: 1, dinnerCalorieTarget: 250 },
        { memberId: 2, dinnerCalorieTarget: 800 },
      ],
    });
    const assigned = new Map([[slotKey(0, "dinner"), RECIPE_ID.dinnerSalmon]]);

    const violations = validateMemberDinnerCalories(ctx, assigned);

    expect(violations).toHaveLength(1);
    expect(violations[0]!.severity).toBeCloseTo(0.1);
  });

  it("sets a positive severity when a member's dinner falls under the band", () => {
    const ctx = buildPlannerContext(FIXTURE_RECIPES, FIXTURE_PRICES, FIXTURE_PREFERENCES, {
      ...FIXTURE_TARGETS,
      memberTargets: [
        { memberId: 1, dinnerCalorieTarget: 120 },
        { memberId: 2, dinnerCalorieTarget: 800 },
      ],
    });
    const assigned = new Map([[slotKey(0, "dinner"), RECIPE_ID.dinnerSalmon]]);

    const violations = validateMemberDinnerCalories(ctx, assigned);

    expect(violations).toHaveLength(1);
    expect(violations[0]!.detail).toContain("100 kcal");
    expect(violations[0]!.severity).toBeCloseTo(8 / 120);
  });
});

describe("hard constraint: recipes needing an implausible portion are ineligible", () => {
  it("excludes a recipe from dinner if any member would need under 0.25 or over 4 servings", () => {
    const ctx = buildPlannerContext(
      FIXTURE_RECIPES,
      FIXTURE_PRICES,
      FIXTURE_PREFERENCES,
      FIXTURE_TARGETS,
    );
    const dinnerCandidates = eligibleRecipes("dinner", ctx).map((recipe) => recipe.id);

    // dinnerTooBig (50 kcal/serving) would need 16 servings for the
    // 800-kcal member - excluded no matter how well it might otherwise score.
    expect(dinnerCandidates).not.toContain(RECIPE_ID.dinnerTooBig);
    expect(dinnerCandidates).toEqual(
      expect.arrayContaining([RECIPE_ID.dinnerSalmon, RECIPE_ID.dinnerChicken]),
    );
  });

  it("never schedules the implausible-portion recipe across many seeds", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const result = runPlan(seed);
      for (const slot of result.slots) {
        expect(slot.recipeId).not.toBe(RECIPE_ID.dinnerTooBig);
      }
    }
  });
});

describe("hard constraint: never-ingredients are excluded", () => {
  it("never schedules a recipe containing a never-ingredient", () => {
    // Run several seeds - a recipe excluded only by chance would eventually
    // show up somewhere across enough runs.
    for (const seed of [1, 2, 3, 4, 5]) {
      const result = runPlan(seed);
      for (const slot of result.slots) {
        expect(NEVER_INGREDIENT_RECIPE_IDS).not.toContain(slot.recipeId);
      }
    }
  });
});

describe("hard constraint: pantry items expiring soon are used", () => {
  it("places the recipe using the soon-to-expire ingredient within its deadline", () => {
    const result = runPlan(3);

    const placements = result.slots.filter((slot) => slot.recipeId === RECIPE_ID.dinnerSalmon);

    // Salmon expires in 2 days, so it must appear at least once, on day 0-2.
    expect(placements.length).toBeGreaterThanOrEqual(1);
    expect(placements.some((slot) => slot.day <= 2)).toBe(true);
    const withinDeadline = placements.find((slot) => slot.day <= 2)!;
    expect(withinDeadline.reasons).toContain("uses salmon expiring in 2 day(s)");
  });

  it("measures expiry deadlines from today and never forces a placement before today", () => {
    const ctx = buildPlannerContext(FIXTURE_RECIPES, FIXTURE_PRICES, FIXTURE_PREFERENCES, {
      ...FIXTURE_TARGETS,
      todayIndex: 3,
    });
    const pantry = [
      { ingredientId: INGREDIENT_ID.salmon, daysUntilExpiry: 2 },
      { ingredientId: INGREDIENT_ID.shrimp, daysUntilExpiry: -2 },
    ];

    const { constraints, violations } = resolveExpiryConstraints(pantry, ctx);

    expect(constraints).toEqual([
      expect.objectContaining({
        ingredientId: INGREDIENT_ID.salmon,
        earliestDay: 3,
        deadlineDay: 5,
      }),
    ]);
    expect(violations.map((violation) => violation.detail)).toEqual([
      `ingredient ${INGREDIENT_ID.shrimp} already expired, unused`,
    ]);

    for (const rng of [() => 0, () => 0.999]) {
      const placement = placeMustUseConstraints(constraints, ctx.recipesById, [], rng);
      const days = [...placement.assigned.keys()].map((key) => parseSlotKey(key).day);
      expect(days).toHaveLength(1);
      expect(days[0]).toBeGreaterThanOrEqual(3);
      expect(days[0]).toBeLessThanOrEqual(5);
    }
  });

  it("skips expiry entirely for a week that does not contain today", () => {
    const pantry = [
      { ingredientId: INGREDIENT_ID.salmon, daysUntilExpiry: 2 },
      { ingredientId: INGREDIENT_ID.shrimp, daysUntilExpiry: -2 },
    ];
    const ctx = buildPlannerContext(FIXTURE_RECIPES, FIXTURE_PRICES, FIXTURE_PREFERENCES, {
      ...FIXTURE_TARGETS,
      todayIndex: null,
    });
    expect(resolveExpiryConstraints(pantry, ctx)).toEqual({
      constraints: [],
      violations: [],
    });
  });

  it("does not force-place a never-ingredient recipe to use up an expiring exclusion", () => {
    const pantryWithExpiringShrimp = [
      ...FIXTURE_PANTRY,
      { ingredientId: INGREDIENT_ID.shrimp, daysUntilExpiry: 0 },
    ];

    for (const seed of [1, 2, 3, 4, 5]) {
      const result = plan(
        FIXTURE_RECIPES,
        FIXTURE_PRICES,
        pantryWithExpiringShrimp,
        FIXTURE_PREFERENCES,
        [],
        FIXTURE_TARGETS,
        seed,
      );

      for (const slot of result.slots) {
        expect(NEVER_INGREDIENT_RECIPE_IDS).not.toContain(slot.recipeId);
      }

      const shrimpViolations = result.violations.filter(
        (violation) =>
          violation.constraint === "pantry_expiry" &&
          violation.detail.includes(`ingredient ${INGREDIENT_ID.shrimp}`),
      );
      expect(shrimpViolations).toHaveLength(1);
      expect(shrimpViolations[0]!.detail).toBe(
        `no eligible recipe uses ingredient ${INGREDIENT_ID.shrimp}, expiring in 0 day(s)`,
      );
    }
  });
  it("does not force-place an implausible-portion recipe to use up an expiring ingredient", () => {
    const pantryWithExpiringTofu = [
      ...FIXTURE_PANTRY,
      { ingredientId: INGREDIENT_ID.tofu, daysUntilExpiry: 0 },
    ];

    for (const seed of [1, 2, 3, 4, 5]) {
      const result = plan(
        FIXTURE_RECIPES,
        FIXTURE_PRICES,
        pantryWithExpiringTofu,
        FIXTURE_PREFERENCES,
        [],
        FIXTURE_TARGETS,
        seed,
      );

      for (const slot of result.slots) {
        expect(slot.recipeId).not.toBe(RECIPE_ID.dinnerTooBig);
      }

      const tofuViolations = result.violations.filter(
        (violation) =>
          violation.constraint === "pantry_expiry" &&
          violation.detail.includes(`ingredient ${INGREDIENT_ID.tofu}`),
      );
      expect(tofuViolations.map((violation) => violation.detail)).toEqual([
        `no eligible recipe uses ingredient ${INGREDIENT_ID.tofu}, expiring in 0 day(s)`,
      ]);
    }
  });
});

describe("locks", () => {
  it("does not report a false pantry_expiry violation when a locked slot already uses the expiring ingredient", () => {
    const pantryWithSalmonExpiringToday = [
      { ingredientId: INGREDIENT_ID.salmon, daysUntilExpiry: 0 },
    ];

    const result = plan(
      FIXTURE_RECIPES,
      FIXTURE_PRICES,
      pantryWithSalmonExpiringToday,
      FIXTURE_PREFERENCES,
      [{ day: 0, mealSlot: "dinner", recipeId: RECIPE_ID.dinnerSalmon }],
      FIXTURE_TARGETS,
      3,
    );

    const salmonViolations = result.violations.filter(
      (violation) =>
        violation.constraint === "pantry_expiry" &&
        violation.detail.includes(`ingredient ${INGREDIENT_ID.salmon}`),
    );
    expect(salmonViolations).toEqual([]);

    const day0Dinner = result.slots.find((slot) => slot.day === 0 && slot.mealSlot === "dinner");
    expect(day0Dinner?.recipeId).toBe(RECIPE_ID.dinnerSalmon);
  });

  it("skips a second must-use constraint for an ingredient already placed earlier this pass", () => {
    const ctx = buildPlannerContext(
      FIXTURE_RECIPES,
      FIXTURE_PRICES,
      FIXTURE_PREFERENCES,
      FIXTURE_TARGETS,
    );
    // Two pantry lots of salmon (no per-lot identity yet - see planner.ts),
    // expiring on different days, both only usable via dinnerSalmon.
    const constraints = [
      {
        ingredientId: INGREDIENT_ID.salmon,
        earliestDay: 0,
        deadlineDay: 0,
        candidateRecipeIds: [RECIPE_ID.dinnerSalmon],
      },
      {
        ingredientId: INGREDIENT_ID.salmon,
        earliestDay: 0,
        deadlineDay: 1,
        candidateRecipeIds: [RECIPE_ID.dinnerSalmon],
      },
    ];

    const { assigned, violations } = placeMustUseConstraints(
      constraints,
      ctx.recipesById,
      [],
      () => 0,
    );

    const salmonPlacements = [...assigned.values()].filter((id) => id === RECIPE_ID.dinnerSalmon);
    expect(salmonPlacements).toHaveLength(1);
    expect(violations).toEqual([]);
  });

  it("still reports a violation when a lock uses the ingredient after the constraint's deadline", () => {
    const ctx = buildPlannerContext(
      FIXTURE_RECIPES,
      FIXTURE_PRICES,
      FIXTURE_PREFERENCES,
      FIXTURE_TARGETS,
    );
    // Salmon expires today (deadlineDay 0) with no other candidate recipe, but the
    // only lock using salmon is on day 6 - too late to save this batch.
    const constraints = [
      {
        ingredientId: INGREDIENT_ID.salmon,
        earliestDay: 0,
        deadlineDay: 0,
        candidateRecipeIds: [],
      },
    ];
    const locked = [{ day: 6, mealSlot: "dinner" as const, recipeId: RECIPE_ID.dinnerSalmon }];

    const { violations } = placeMustUseConstraints(constraints, ctx.recipesById, locked, () => 0);

    expect(violations).toEqual([
      {
        slot: null,
        constraint: "pantry_expiry",
        detail: `no free slot by day 0 for ingredient ${INGREDIENT_ID.salmon}`,
      },
    ]);
  });

  it("reports a locked_slot_conflict when a lock's recipe uses a now-excluded ingredient", () => {
    // FIXTURE_PREFERENCES already excludes shrimp; locking dinnerShrimp
    // simulates a lock made before that exclusion existed.
    const result = plan(
      FIXTURE_RECIPES,
      FIXTURE_PRICES,
      FIXTURE_PANTRY,
      FIXTURE_PREFERENCES,
      [{ day: 0, mealSlot: "dinner", recipeId: RECIPE_ID.dinnerShrimp }],
      FIXTURE_TARGETS,
      3,
    );

    const conflictViolations = result.violations.filter(
      (violation) => violation.constraint === "locked_slot_conflict",
    );
    expect(conflictViolations).toEqual([
      {
        slot: { day: 0, mealSlot: "dinner" },
        constraint: "locked_slot_conflict",
        detail: `recipe uses excluded ingredient ${INGREDIENT_ID.shrimp}`,
      },
    ]);

    // The lock still wins the slot - reporting the conflict doesn't drop it.
    const day0Dinner = result.slots.find((slot) => slot.day === 0 && slot.mealSlot === "dinner");
    expect(day0Dinner?.recipeId).toBe(RECIPE_ID.dinnerShrimp);
  });

  it("reports a locked_slot_conflict when a lock's recipe no longer exists in the planning set", () => {
    // Simulates a recipe archived (or made otherwise ineligible - unknown
    // cost, incomplete nutrition) after it was locked: it's absent from
    // FIXTURE_RECIPES entirely, the same shape buildPlannerRecipes produces
    // for an archived recipe.
    const goneRecipeId = 999;
    const result = plan(
      FIXTURE_RECIPES,
      FIXTURE_PRICES,
      FIXTURE_PANTRY,
      FIXTURE_PREFERENCES,
      [{ day: 0, mealSlot: "dinner", recipeId: goneRecipeId }],
      FIXTURE_TARGETS,
      3,
    );

    expect(result.violations).toEqual(
      expect.arrayContaining([
        {
          slot: { day: 0, mealSlot: "dinner" },
          constraint: "locked_slot_conflict",
          detail: `locked recipe ${goneRecipeId} is no longer available for planning`,
        },
      ]),
    );

    const day0Dinner = result.slots.find((slot) => slot.day === 0 && slot.mealSlot === "dinner");
    expect(day0Dinner?.recipeId).toBe(goneRecipeId);
  });

  it("reports a locked_slot_conflict when a lock's recipe's meal type no longer matches its slot", () => {
    // Simulates the recipe's meal type being edited to "lunch" after
    // dinnerChicken was locked into a dinner slot.
    const recipesWithEditedMealType = FIXTURE_RECIPES.map((recipe) =>
      recipe.id === RECIPE_ID.dinnerChicken ? { ...recipe, mealType: "lunch" } : recipe,
    );
    const result = plan(
      recipesWithEditedMealType,
      FIXTURE_PRICES,
      FIXTURE_PANTRY,
      FIXTURE_PREFERENCES,
      [{ day: 0, mealSlot: "dinner", recipeId: RECIPE_ID.dinnerChicken }],
      FIXTURE_TARGETS,
      3,
    );

    expect(result.violations).toEqual(
      expect.arrayContaining([
        {
          slot: { day: 0, mealSlot: "dinner" },
          constraint: "locked_slot_conflict",
          detail: "recipe's meal type ('lunch') doesn't match slot 'dinner'",
        },
      ]),
    );

    const day0Dinner = result.slots.find((slot) => slot.day === 0 && slot.mealSlot === "dinner");
    expect(day0Dinner?.recipeId).toBe(RECIPE_ID.dinnerChicken);
  });

  it("reports a locked_slot_conflict when a lock's recipe needs an implausible portion for a member's current target", () => {
    // dinnerTooBig (50 kcal/serving) needs 16 servings for the 800-kcal
    // member - implausible, but an exact multiple, so actualCalories lands
    // precisely on target and never trips member_dinner_calories; this is
    // the one case checkSlotEligibility catches that the whole-plan calorie
    // validator doesn't.
    const result = plan(
      FIXTURE_RECIPES,
      FIXTURE_PRICES,
      FIXTURE_PANTRY,
      FIXTURE_PREFERENCES,
      [{ day: 0, mealSlot: "dinner", recipeId: RECIPE_ID.dinnerTooBig }],
      FIXTURE_TARGETS,
      3,
    );

    expect(result.violations).toEqual(
      expect.arrayContaining([
        {
          slot: { day: 0, mealSlot: "dinner" },
          constraint: "locked_slot_conflict",
          detail:
            "recipe's calories-per-serving would need an implausible portion (under 0.25 or over 4 servings) for a household member",
        },
      ]),
    );
    expect(
      result.violations.filter((violation) => violation.constraint === "member_dinner_calories"),
    ).toEqual([]);

    const day0Dinner = result.slots.find((slot) => slot.day === 0 && slot.mealSlot === "dinner");
    expect(day0Dinner?.recipeId).toBe(RECIPE_ID.dinnerTooBig);
  });

  it("reports ineligible_slot when an unlocked slot holds an ineligible recipe", () => {
    const ctx = buildPlannerContext(
      FIXTURE_RECIPES,
      FIXTURE_PRICES,
      FIXTURE_PREFERENCES,
      FIXTURE_TARGETS,
    );
    const assigned = new Map([[slotKey(2, "dinner"), RECIPE_ID.dinnerShrimp as number]]);

    expect(validateAssignedSlots(assigned, [], ctx)).toEqual([
      {
        slot: { day: 2, mealSlot: "dinner" },
        constraint: "ineligible_slot",
        detail: `recipe uses excluded ingredient ${INGREDIENT_ID.shrimp}`,
      },
    ]);
  });
});

describe("hard constraint: weekly budget", () => {
  it("stays within budget and reports no weekly_budget violation when the budget is achievable", () => {
    const result = runPlan(5);
    const weeklyBudgetViolations = result.violations.filter(
      (violation) => violation.constraint === "weekly_budget",
    );
    expect(weeklyBudgetViolations).toEqual([]);
  });

  it("reports a weekly_budget violation instead of silently going over", () => {
    const result = runPlan(5, { weeklyBudgetCzk: 100 });
    const weeklyBudgetViolations = result.violations.filter(
      (violation) => violation.constraint === "weekly_budget",
    );
    expect(weeklyBudgetViolations).toHaveLength(1);
    expect(weeklyBudgetViolations[0]!.detail).toContain("over budget of 100");
  });

  it("sets severity to the overspend as a fraction of the budget", () => {
    const ctx = buildPlannerContext(FIXTURE_RECIPES, FIXTURE_PRICES, FIXTURE_PREFERENCES, {
      ...FIXTURE_TARGETS,
      weeklyBudgetCzk: 250,
    });
    const assigned = new Map([[slotKey(0, "dinner"), RECIPE_ID.dinnerSalmon]]);

    const [violation] = validateWeeklyBudget(ctx, assigned);

    expect(violation!.severity).toBeCloseTo(0.3);
  });
});

describe("infeasible input", () => {
  it("returns a violation report instead of throwing or silently returning a bad plan", () => {
    // Target of 1 kcal makes every fixture recipe's servings round to 0 for
    // that member - below the plausible minimum - so nothing is eligible.
    const impossibleTargets = {
      ...FIXTURE_TARGETS,
      memberTargets: [
        { memberId: 1, dinnerCalorieTarget: 1 },
        { memberId: 2, dinnerCalorieTarget: 800 },
      ],
    };

    expect(() =>
      plan(FIXTURE_RECIPES, FIXTURE_PRICES, [], FIXTURE_PREFERENCES, [], impossibleTargets, 1),
    ).not.toThrow();

    const result = plan(
      FIXTURE_RECIPES,
      FIXTURE_PRICES,
      [],
      FIXTURE_PREFERENCES,
      [],
      impossibleTargets,
      1,
    );

    const noEligibleViolations = result.violations.filter(
      (violation) => violation.constraint === "no_eligible_recipe",
    );
    expect(noEligibleViolations).toHaveLength(7);

    // Still a complete plan, not an empty/half-filled one masquerading as success.
    expect(result.slots).toHaveLength(7);
    expect(result.slots.every((slot) => slot.recipeId === null)).toBe(true);
  });
});

describe("empty price catalog and preferences are valid states, not errors", () => {
  it("plans successfully with no tracked prices (no promos this week)", () => {
    const result = plan(
      FIXTURE_RECIPES,
      [],
      FIXTURE_PANTRY,
      FIXTURE_PREFERENCES,
      [],
      FIXTURE_TARGETS,
      1,
    );

    expect(result.slots).toHaveLength(7);
    expect(result.slots.every((slot) => slot.recipeId !== null)).toBe(true);
    expect(result.violations.some((v) => v.constraint === "no_eligible_recipe")).toBe(false);
  });

  it("plans successfully with no household exclusions", () => {
    const shrimpOnly = FIXTURE_RECIPES.filter((recipe) => recipe.id === RECIPE_ID.dinnerShrimp);

    // With the household's exclusion, the only recipe is ineligible...
    const excluded = plan(
      shrimpOnly,
      FIXTURE_PRICES,
      [],
      FIXTURE_PREFERENCES,
      [],
      FIXTURE_TARGETS,
      1,
    );
    expect(excluded.slots.every((slot) => slot.recipeId === null)).toBe(true);

    // ...with no exclusions, the same recipe fills the week.
    const result = plan(
      shrimpOnly,
      FIXTURE_PRICES,
      [],
      { neverIngredientIds: [] },
      [],
      FIXTURE_TARGETS,
      1,
    );
    expect(result.slots).toHaveLength(7);
    expect(result.slots.every((slot) => slot.recipeId === RECIPE_ID.dinnerShrimp)).toBe(true);
    expect(result.violations.some((v) => v.constraint === "no_eligible_recipe")).toBe(false);
  });
});

describe("isWeekday", () => {
  it("derives weekday from weekStartDate", () => {
    expect(isWeekday(0, FIXTURE_TARGETS)).toBe(true);
    expect(isWeekday(5, FIXTURE_TARGETS)).toBe(false);
    expect(isWeekday(6, FIXTURE_TARGETS)).toBe(false);
  });

  it("follows a week that starts on Wednesday", () => {
    const targets = { ...FIXTURE_TARGETS, weekStartDate: "2026-09-23" };
    expect([0, 1, 2, 3, 4, 5, 6].map((day) => isWeekday(day, targets))).toEqual([
      true,
      true,
      true,
      false,
      false,
      true,
      true,
    ]);
  });
});

describe("reasons", () => {
  it("does not describe an already-expired pantry item as expiring", () => {
    const reasons = buildReasons(RECIPE_ID.dinnerSalmon, FIXTURE_RECIPES, FIXTURE_PRICES, [
      { ingredientId: INGREDIENT_ID.salmon, daysUntilExpiry: -2 },
    ]);
    expect(reasons.some((reason) => reason.includes("expiring"))).toBe(false);
  });

  it("gives every filled slot at least one reason", () => {
    const result = runPlan(9);
    for (const slot of result.slots) {
      expect(slot.recipeId).not.toBeNull();
      expect(slot.reasons.length).toBeGreaterThan(0);
    }
  });
});

describe("search: incremental budget repair", () => {
  it("accepts swaps that cut the overspend while the violation count stays at 1", () => {
    const ctx = buildPlannerContext(BUDGET_REPAIR_RECIPES, FIXTURE_PRICES, FIXTURE_PREFERENCES, {
      ...FIXTURE_TARGETS,
      weeklyBudgetCzk: 250,
    });
    const assigned = new Map(
      [0, 1, 2, 3, 4, 5, 6].map((day) => [
        slotKey(day, "dinner"),
        BUDGET_REPAIR_RECIPE_ID.fastExpensive as number,
      ]),
    );

    localSearch(assigned, ctx, new Set());

    expect([...assigned.values()]).toEqual(Array(7).fill(BUDGET_REPAIR_RECIPE_ID.slowCheap));
    expect(validateWeeklyBudget(ctx, assigned)).toEqual([]);
  });

  it("plan() reports violations from the week after search, not the initial fill", () => {
    const targets = { ...FIXTURE_TARGETS, weeklyBudgetCzk: 250 };
    const ctx = buildPlannerContext(
      BUDGET_REPAIR_RECIPES,
      FIXTURE_PRICES,
      FIXTURE_PREFERENCES,
      targets,
    );
    const initialFill = new Map<SlotKey, number>();
    fillRemainingSlots(ctx, initialFill);
    expect(validateWeeklyBudget(ctx, initialFill)).not.toEqual([]);

    const result = plan(
      BUDGET_REPAIR_RECIPES,
      FIXTURE_PRICES,
      [],
      FIXTURE_PREFERENCES,
      [],
      targets,
      1,
    );

    expect(
      result.violations.filter((violation) => violation.constraint === "weekly_budget"),
    ).toEqual([]);
  });
});

describe("search: systematic per-dinner pass", () => {
  const SATURDAY = 5;
  const SUNDAY = 6;

  function dinner(id: number, proteinSource: string, costCzk: number): PlannerRecipe {
    return {
      id,
      mealType: "dinner",
      proteinSource,
      timeMinutes: 30,
      costCzk,
      calories: 400,
      baseServings: 4,
      ingredientIds: [],
    };
  }

  function contextFor(recipes: PlannerRecipe[], weeklyBudgetCzk: number) {
    return buildPlannerContext(recipes, [], FIXTURE_PREFERENCES, {
      ...FIXTURE_TARGETS,
      weeklyBudgetCzk,
    });
  }

  it("applies the best replacement, not just any improving one", () => {
    const ctx = contextFor(
      [dinner(1, "chicken", 400), dinner(2, "beef", 200), dinner(3, "pork", 100)],
      100,
    );
    const assigned = new Map([[slotKey(SATURDAY, "dinner"), 1]]);

    localSearch(assigned, ctx, new Set());

    expect(assigned.get(slotKey(SATURDAY, "dinner"))).toBe(3);
  });

  it("ends where best-improvement does, not where first-improvement would", () => {
    const ctx = contextFor(
      [
        { ...dinner(1, "beef", 100), timeMinutes: 30 },
        { ...dinner(2, "chicken", 100), timeMinutes: 0 },
        { ...dinner(3, "beef", 100), timeMinutes: 60 },
      ],
      1000,
    );
    const assigned = new Map([
      [slotKey(0, "dinner"), 1],
      [slotKey(1, "dinner"), 3],
    ]);

    const stats = localSearch(assigned, ctx, new Set());

    expect([...assigned.values()]).toEqual([1, 2]);
    expect(stats.passes).toBe(2);
  });

  it("breaks an exact tie by input recipe order", () => {
    const expensive = dinner(1, "chicken", 400);
    const beef = dinner(2, "beef", 100);
    const pork = dinner(3, "pork", 100);
    const forward = new Map([[slotKey(SATURDAY, "dinner"), 1]]);
    const reversed = new Map([[slotKey(SATURDAY, "dinner"), 1]]);

    localSearch(forward, contextFor([expensive, beef, pork], 100), new Set());
    localSearch(reversed, contextFor([expensive, pork, beef], 100), new Set());

    expect(forward.get(slotKey(SATURDAY, "dinner"))).toBe(2);
    expect(reversed.get(slotKey(SATURDAY, "dinner"))).toBe(3);
  });

  it("never changes a protected slot but still improves the others", () => {
    const ctx = contextFor([dinner(1, "chicken", 400), dinner(2, "beef", 100)], 100);
    const assigned = new Map([
      [slotKey(SATURDAY, "dinner"), 1],
      [slotKey(SUNDAY, "dinner"), 1],
    ]);

    localSearch(assigned, ctx, new Set([slotKey(SATURDAY, "dinner")]));

    expect(assigned.get(slotKey(SATURDAY, "dinner"))).toBe(1);
    expect(assigned.get(slotKey(SUNDAY, "dinner"))).toBe(2);
  });

  it("stops and keeps the current recipe when no alternative is strictly better", () => {
    const ctx = contextFor([dinner(1, "chicken", 100), dinner(2, "beef", 100)], 1000);
    const assigned = new Map([[slotKey(SATURDAY, "dinner"), 1]]);

    localSearch(assigned, ctx, new Set());

    expect(assigned.get(slotKey(SATURDAY, "dinner"))).toBe(1);
  });

  it("counts every pass, including the final one, and every candidate evaluation", () => {
    const ctx = contextFor(
      [dinner(1, "chicken", 400), dinner(2, "beef", 200), dinner(3, "pork", 100)],
      100,
    );
    const assigned = new Map([[slotKey(SATURDAY, "dinner"), 1]]);
    const stats = localSearch(assigned, ctx, new Set());

    expect(stats).toEqual({
      passes: 2,
      evaluations: 4,
      stopReason: "no_single_swap_improvement",
    });
  });

  it("stops at the work limit mid-pass, keeping that pass's best swap so far", () => {
    const ctx = contextFor(
      [dinner(1, "chicken", 400), dinner(2, "beef", 200), dinner(3, "pork", 100)],
      100,
    );
    const assigned = new Map([
      [slotKey(SATURDAY, "dinner"), 1],
      [slotKey(SUNDAY, "dinner"), 1],
    ]);
    const before = evaluatePlan(assigned, ctx);
    const stats = localSearch(assigned, ctx, new Set(), 3);

    expect(stats).toEqual({ passes: 1, evaluations: 3, stopReason: "evaluation_limit" });
    expect(assigned.get(slotKey(SATURDAY, "dinner"))).toBe(3);
    expect(assigned.get(slotKey(SUNDAY, "dinner"))).toBe(1);
    expect(isBetter(evaluatePlan(assigned, ctx), before)).toBe(true);
  });

  it("reports the work limit, not convergence, when a cut-off pass found nothing yet", () => {
    const ctx = contextFor(
      [dinner(1, "chicken", 400), dinner(2, "beef", 200), dinner(3, "pork", 100)],
      100,
    );
    const assigned = new Map([[slotKey(SATURDAY, "dinner"), 3]]);
    const stats = localSearch(assigned, ctx, new Set(), 1);

    expect(stats).toEqual({ passes: 1, evaluations: 1, stopReason: "evaluation_limit" });
    expect(assigned.get(slotKey(SATURDAY, "dinner"))).toBe(3);
  });

  it("reports the work limit when a pass ends exactly on it and still improved", () => {
    const ctx = contextFor(
      [dinner(1, "chicken", 400), dinner(2, "beef", 200), dinner(3, "pork", 100)],
      100,
    );
    const assigned = new Map([
      [slotKey(SATURDAY, "dinner"), 1],
      [slotKey(SUNDAY, "dinner"), 1],
    ]);
    const stats = localSearch(assigned, ctx, new Set(), 4);

    expect(stats).toEqual({ passes: 1, evaluations: 4, stopReason: "evaluation_limit" });
    expect(assigned.get(slotKey(SATURDAY, "dinner"))).toBe(3);
  });

  it("reports convergence when a pass ends exactly on the limit with no improvement", () => {
    const ctx = contextFor(
      [dinner(1, "chicken", 400), dinner(2, "beef", 200), dinner(3, "pork", 100)],
      100,
    );
    const assigned = new Map([[slotKey(SATURDAY, "dinner"), 3]]);
    const stats = localSearch(assigned, ctx, new Set(), 2);

    expect(stats).toEqual({
      passes: 1,
      evaluations: 2,
      stopReason: "no_single_swap_improvement",
    });
    expect(assigned.get(slotKey(SATURDAY, "dinner"))).toBe(3);
  });

  it("leaves an empty slot empty; filling is fillRemainingSlots' job", () => {
    const ctx = contextFor([dinner(1, "chicken", 400), dinner(2, "beef", 100)], 1000);
    const assigned = new Map([[slotKey(SATURDAY, "dinner"), 1]]);

    localSearch(assigned, ctx, new Set());

    expect(assigned.has(slotKey(SUNDAY, "dinner"))).toBe(false);
    expect(eligibleRecipes("dinner", ctx)).toHaveLength(2);
  });

  it("reports convergence, not an optimum, when only a two-dinner change saves a store", () => {
    const price = (ingredientId: number, store: string): PlannerIngredientPrice => ({
      ingredientId,
      ingredientName: `ingredient ${ingredientId}`,
      store,
      pricePerUnit: 10,
      isPromo: false,
    });
    const withIngredients = (recipe: PlannerRecipe, ingredientIds: number[]) => ({
      ...recipe,
      ingredientIds,
    });
    const recipes = [
      withIngredients(dinner(1, "chicken", 100), [101, 102]),
      withIngredients(dinner(2, "beef", 100), [101, 102]),
      withIngredients(dinner(3, "pork", 100), [103]),
      withIngredients(dinner(4, "fish", 100), [104]),
    ];
    const ctx = buildPlannerContext(
      recipes,
      [price(101, "A"), price(102, "B"), price(103, "C"), price(104, "C")],
      FIXTURE_PREFERENCES,
      { ...FIXTURE_TARGETS, weeklyBudgetCzk: 1000 },
    );
    const assigned = new Map([
      [slotKey(SATURDAY, "dinner"), 1],
      [slotKey(SUNDAY, "dinner"), 2],
    ]);
    const coordinated = new Map([
      [slotKey(SATURDAY, "dinner"), 3],
      [slotKey(SUNDAY, "dinner"), 4],
    ]);
    const stats = localSearch(assigned, ctx, new Set());

    expect(stats).toEqual({
      passes: 1,
      evaluations: 6,
      stopReason: "no_single_swap_improvement",
    });
    expect([...assigned.values()]).toEqual([1, 2]);
    expect(countDistinctStores(assigned, ctx)).toBe(2);
    expect(countDistinctStores(coordinated, ctx)).toBe(1);
    expect(isBetter(evaluatePlan(coordinated, ctx), evaluatePlan(assigned, ctx))).toBe(true);
  });
});

describe("isBetter: violation count, then severity, then score", () => {
  it("fewer violations wins even with higher severity and lower score", () => {
    expect(
      isBetter(
        { violationCount: 1, severitySum: 0.9, score: 0 },
        { violationCount: 2, severitySum: 0.1, score: 10 },
      ),
    ).toBe(true);
  });

  it("with equal counts, lower severity wins even with a lower score", () => {
    expect(
      isBetter(
        { violationCount: 1, severitySum: 0.1, score: 0 },
        { violationCount: 1, severitySum: 0.3, score: 10 },
      ),
    ).toBe(true);
  });

  it("with equal count and severity, higher score wins", () => {
    expect(
      isBetter(
        { violationCount: 1, severitySum: 0.2, score: 5 },
        { violationCount: 1, severitySum: 0.2, score: 4 },
      ),
    ).toBe(true);
  });

  it("treats severity sums differing only by float noise as tied, so score decides", () => {
    expect(
      isBetter(
        { violationCount: 1, severitySum: 0.1 + 0.2, score: 5 },
        { violationCount: 1, severitySum: 0.3, score: 4 },
      ),
    ).toBe(true);
  });

  it("an exact tie is not better, so the current assignment is kept", () => {
    const quality = { violationCount: 1, severitySum: 0.2, score: 5 };
    expect(isBetter({ ...quality }, quality)).toBe(false);
  });

  it("evaluatePlan sums the severity of every violation", () => {
    const ctx = buildPlannerContext(FIXTURE_RECIPES, FIXTURE_PRICES, FIXTURE_PREFERENCES, {
      ...FIXTURE_TARGETS,
      memberTargets: [
        { memberId: 1, dinnerCalorieTarget: 340 },
        { memberId: 2, dinnerCalorieTarget: 800 },
      ],
      weeklyBudgetCzk: 250,
    });
    const assigned = new Map([[slotKey(0, "dinner"), RECIPE_ID.dinnerSalmon as number]]);

    const quality = evaluatePlan(assigned, ctx);
    expect(quality.violationCount).toBe(2);
    expect(quality.severitySum).toBeCloseTo(0.1 + 6 / 340);
  });
});

describe("evaluateExistingWeek", () => {
  function contextFor(overrides: Partial<Parameters<typeof plan>[5]> = {}) {
    return buildPlannerContext(FIXTURE_RECIPES, FIXTURE_PRICES, FIXTURE_PREFERENCES, {
      ...FIXTURE_TARGETS,
      ...overrides,
    });
  }

  it("matches generation's violations for an unchanged generated week", () => {
    const result = runPlan(5, { weeklyBudgetCzk: 100 });
    const assigned = new Map<SlotKey, number>();
    for (const slot of result.slots) {
      if (slot.recipeId !== null) assigned.set(slotKey(slot.day, slot.mealSlot), slot.recipeId);
    }

    const violations = evaluateExistingWeek(
      assigned,
      [],
      FIXTURE_PANTRY,
      contextFor({ weeklyBudgetCzk: 100 }),
    );

    expect(violations).toEqual(result.violations);
    expect(violations.map((violation) => violation.constraint)).toContain("weekly_budget");
  });

  it("reports an expiring ingredient no longer used by its deadline", () => {
    const assigned = new Map([[slotKey(0, "dinner"), RECIPE_ID.dinnerChicken as number]]);

    const violations = evaluateExistingWeek(assigned, [], FIXTURE_PANTRY, contextFor());

    expect(violations).toContainEqual({
      slot: null,
      constraint: "pantry_expiry",
      detail: `ingredient ${INGREDIENT_ID.salmon} not used by day 2`,
    });
  });

  it("counts a slot on the deadline day as covering the ingredient", () => {
    const assigned = new Map([[slotKey(2, "dinner"), RECIPE_ID.dinnerSalmon as number]]);

    const violations = evaluateExistingWeek(assigned, [], FIXTURE_PANTRY, contextFor());

    expect(violations.filter((violation) => violation.constraint === "pantry_expiry")).toEqual([]);
  });

  it("reports an empty slot that an eligible recipe could now fill", () => {
    const assigned = new Map([[slotKey(2, "dinner"), RECIPE_ID.dinnerSalmon as number]]);

    const violations = evaluateExistingWeek(assigned, [], FIXTURE_PANTRY, contextFor());

    expect(violations).toContainEqual({
      slot: { day: 0, mealSlot: "dinner" },
      constraint: "empty_slot",
      detail: "dinner on day 0 is empty; a recipe is now available",
    });
  });
});
