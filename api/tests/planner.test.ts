import { describe, expect, it } from "vitest";
import { plan, buildPlannerContext, eligibleRecipes } from "../src/services/planner.js";
import {
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
    expect(() =>
      plan(FIXTURE_RECIPES, [], FIXTURE_PANTRY, FIXTURE_PREFERENCES, [], FIXTURE_TARGETS, 1),
    ).not.toThrow();
  });

  it("plans successfully with no household exclusions", () => {
    expect(() =>
      plan(
        FIXTURE_RECIPES,
        FIXTURE_PRICES,
        FIXTURE_PANTRY,
        { neverIngredientIds: [] },
        [],
        FIXTURE_TARGETS,
        1,
      ),
    ).not.toThrow();
  });
});

describe("reasons", () => {
  it("gives every filled slot at least one reason", () => {
    const result = runPlan(9);
    for (const slot of result.slots) {
      expect(slot.recipeId).not.toBeNull();
      expect(slot.reasons.length).toBeGreaterThan(0);
    }
  });
});
