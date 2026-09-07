import { describe, expect, it } from 'vitest'
import { plan } from '../src/services/planner.js'
import { EmptyPreferencesError, EmptyPriceCatalogError } from '../src/lib/errors.js'
import {
  FIXTURE_PANTRY,
  FIXTURE_PREFERENCES,
  FIXTURE_PRICES,
  FIXTURE_RECIPES,
  FIXTURE_TARGETS,
  NEVER_INGREDIENT_RECIPE_IDS,
  RECIPE_ID,
} from './fixtures/plannerFixtures.js'

function runPlan(seed: number, overrides: Partial<Parameters<typeof plan>[5]> = {}) {
  return plan(
    FIXTURE_RECIPES,
    FIXTURE_PRICES,
    FIXTURE_PANTRY,
    FIXTURE_PREFERENCES,
    [],
    { ...FIXTURE_TARGETS, ...overrides },
    seed,
  )
}

function caloriesByDay(result: ReturnType<typeof runPlan>) {
  const totals = new Map<number, number>()
  for (const slot of result.slots) {
    const recipe = FIXTURE_RECIPES.find((r) => r.id === slot.recipeId)
    totals.set(slot.day, (totals.get(slot.day) ?? 0) + (recipe?.calories ?? 0))
  }
  return totals
}

describe('determinism', () => {
  it('returns an identical plan for the same seed and inputs', () => {
    const first = runPlan(42)
    const second = runPlan(42)
    expect(second).toEqual(first)
  })

  it('returns a different plan for a different seed', () => {
    const first = runPlan(1)
    const second = runPlan(2)
    expect(second).not.toEqual(first)
  })
})

describe('hard constraint: daily calories within ±10%', () => {
  it('keeps every day within ±10% of the calorie target', () => {
    const result = runPlan(7)
    const lowerBound = FIXTURE_TARGETS.dailyCalories * 0.9
    const upperBound = FIXTURE_TARGETS.dailyCalories * 1.1

    const totals = caloriesByDay(result)
    expect(totals.size).toBe(7)
    for (const total of totals.values()) {
      expect(total).toBeGreaterThanOrEqual(lowerBound)
      expect(total).toBeLessThanOrEqual(upperBound)
    }
  })
})

describe('hard constraint: never-ingredients are excluded', () => {
  it('never schedules a recipe containing a never-ingredient', () => {
    // Run several seeds - a recipe excluded only by chance would eventually
    // show up somewhere across enough runs.
    for (const seed of [1, 2, 3, 4, 5]) {
      const result = runPlan(seed)
      for (const slot of result.slots) {
        expect(NEVER_INGREDIENT_RECIPE_IDS).not.toContain(slot.recipeId)
      }
    }
  })
})

describe('hard constraint: pantry items expiring soon are used', () => {
  it('places the recipe using the soon-to-expire ingredient within its deadline', () => {
    const result = runPlan(3)
    const breakfasts = result.slots.filter((slot) => slot.mealSlot === 'breakfast')

    const placements = breakfasts.filter(
      (slot) => slot.recipeId === RECIPE_ID.breakfastOatsWithYogurt,
    )

    // Yogurt expires in 2 days, so it must appear exactly once, on day 0-2.
    expect(placements).toHaveLength(1)
    expect(placements[0]!.day).toBeLessThanOrEqual(2)
    expect(placements[0]!.reasons).toContain('uses greek yogurt expiring in 2 day(s)')
  })
})

describe('hard constraint: weekly budget', () => {
  it('stays within budget and reports no weekly_budget violation when the budget is achievable', () => {
    const result = runPlan(5)
    const weeklyBudgetViolations = result.violations.filter(
      (violation) => violation.constraint === 'weekly_budget',
    )
    expect(weeklyBudgetViolations).toEqual([])

    const totalCost = result.slots.reduce((sum, slot) => {
      const recipe = FIXTURE_RECIPES.find((r) => r.id === slot.recipeId)
      return sum + (recipe?.costCzk ?? 0)
    }, 0)
    expect(totalCost).toBeLessThanOrEqual(FIXTURE_TARGETS.weeklyBudgetCzk)
  })

  it('reports a weekly_budget violation instead of silently going over', () => {
    const result = runPlan(5, { weeklyBudgetCzk: 100 })
    const weeklyBudgetViolations = result.violations.filter(
      (violation) => violation.constraint === 'weekly_budget',
    )
    expect(weeklyBudgetViolations).toHaveLength(1)
    expect(weeklyBudgetViolations[0]!.detail).toContain('over budget of 100')
  })
})

describe('infeasible input', () => {
  it('returns a violation report instead of throwing or silently returning a bad plan', () => {
    // No combination of fixture recipes can reach 50 kcal/day.
    expect(() => runPlan(1, { dailyCalories: 50 })).not.toThrow()

    const result = runPlan(1, { dailyCalories: 50 })

    // Every day's total should be reported as a daily_calories violation.
    const dailyCalorieViolations = result.violations.filter(
      (violation) => violation.constraint === 'daily_calories',
    )
    expect(dailyCalorieViolations).toHaveLength(7)

    // Still a complete plan, not an empty/half-filled one masquerading as success.
    expect(result.slots).toHaveLength(28)
    expect(result.slots.every((slot) => slot.recipeId !== null)).toBe(true)
  })
})

describe('rejects unevaluable hard constraints instead of running with defaults', () => {
  it('throws EmptyPriceCatalogError when prices is empty', () => {
    expect(() =>
      plan(FIXTURE_RECIPES, [], FIXTURE_PANTRY, FIXTURE_PREFERENCES, [], FIXTURE_TARGETS, 1),
    ).toThrow(EmptyPriceCatalogError)
  })

  it('throws EmptyPreferencesError when neverIngredientIds is empty', () => {
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
    ).toThrow(EmptyPreferencesError)
  })
})

describe('reasons', () => {
  it('gives every filled slot at least one reason', () => {
    const result = runPlan(9)
    for (const slot of result.slots) {
      expect(slot.recipeId).not.toBeNull()
      expect(slot.reasons.length).toBeGreaterThan(0)
    }
  })
})
