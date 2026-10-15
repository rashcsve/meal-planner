import { scaleToServings, type PlannerIngredientPrice, type PlannerRecipe } from "shared";
import { createRng } from "../src/lib/rng.js";
import {
  buildPlannerContext,
  computeMemberServings,
  countDistinctStores,
  eligibleRecipes,
  evaluatePlan,
  fillRemainingSlots,
  isBetter,
  localSearch,
  slotKey,
  type PlannerContext,
  type SlotKey,
} from "../src/services/planner.js";
import { BUDGET_REPAIR_RECIPES, FIXTURE_TARGETS } from "../tests/fixtures/plannerFixtures.js";

type SearchStats = { passes: number; evaluations: number };

interface HarnessCase {
  name: string;
  recipes: PlannerRecipe[];
  prices: PlannerIngredientPrice[];
  weeklyBudgetCzk: number;
  initial?: Map<number, number>;
  protectedDays?: number[];
}

const STORES = ["Lidl", "Albert", "Penny"];
const PROTEINS = ["chicken", "beef", "pork", "fish", "tofu", "egg"];

function dinner(id: number, proteinSource: string, ingredientIds: number[], costCzk = 100) {
  return { id, mealType: "dinner", proteinSource, timeMinutes: 30, costCzk, calories: 400, baseServings: 4, ingredientIds };
}

function price(ingredientId: number, store: string, isPromo = false): PlannerIngredientPrice {
  return { ingredientId, ingredientName: `ingredient ${ingredientId}`, store, pricePerUnit: 50, isPromo };
}

function syntheticLibrary(size: number, seed: number): HarnessCase {
  const rng = createRng(seed);
  const pick = (from: number, to: number) => from + Math.floor(rng() * (to - from + 1));
  const recipes = Array.from({ length: size }, (_, i) => ({
    ...dinner(i + 1, PROTEINS[pick(0, 5)]!, [pick(1, 20), pick(1, 20), pick(1, 20)], pick(60, 400)),
    timeMinutes: pick(15, 90),
    calories: pick(300, 600),
  }));
  const prices = Array.from({ length: 20 }, (_, i) => price(i + 1, STORES[pick(0, 2)]!, rng() < 0.3));
  return { name: `synthetic-${size}`, recipes, prices, weeklyBudgetCzk: 1000 };
}

const allDays = (recipeId: number) => new Map([0, 1, 2, 3, 4, 5, 6].map((day) => [day, recipeId]));

const CASES: HarnessCase[] = [
  { name: "budget-repair", recipes: BUDGET_REPAIR_RECIPES, prices: [], weeklyBudgetCzk: 250, initial: allDays(10) },
  { name: "locked-meal", recipes: BUDGET_REPAIR_RECIPES, prices: [], weeklyBudgetCzk: 250, initial: allDays(10), protectedDays: [0] },
  {
    name: "store-coordination",
    recipes: [dinner(1, "chicken", [1]), dinner(2, "beef", [2]), dinner(3, "pork", [3]), dinner(4, "fish", [3])],
    prices: [price(1, "Lidl"), price(2, "Albert"), price(3, "Penny")],
    weeklyBudgetCzk: 10000,
    initial: new Map([[5, 1], [6, 2]]),
  },
  ...[5, 20, 50].map((size) => syntheticLibrary(size, size)),
];

const LEGACY_ITERATIONS = 500;
const LEGACY_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function legacyRandomSearch(assigned: Map<SlotKey, number>, ctx: PlannerContext, protectedKeys: Set<SlotKey>, rng: () => number, stats: SearchStats) {
  const freeKeys = [...assigned.keys()].filter((key) => !protectedKeys.has(key));
  const candidates = eligibleRecipes("dinner", ctx);
  let quality = evaluatePlan(assigned, ctx);
  for (let i = 0; i < LEGACY_ITERATIONS && freeKeys.length > 0; i++) {
    const key = freeKeys[Math.floor(rng() * freeKeys.length)]!;
    const candidate = candidates[Math.floor(rng() * candidates.length)];
    const previousRecipeId = assigned.get(key);
    if (!candidate || previousRecipeId === undefined || previousRecipeId === candidate.id) continue;
    assigned.set(key, candidate.id);
    const newQuality = evaluatePlan(assigned, ctx);
    stats.evaluations++;
    if (isBetter(newQuality, quality)) quality = newQuality;
    else assigned.set(key, previousRecipeId);
  }
}

function describeWeek(assigned: Map<SlotKey, number>, ctx: PlannerContext) {
  const recipes = [...assigned.values()].map((id) => ctx.recipesById.get(id)!);
  const cost = recipes.reduce((sum, recipe) => {
    const servings = computeMemberServings(recipe, ctx.targets.memberTargets).reduce((s, m) => s + m.servings, 0);
    return sum + scaleToServings(recipe.costCzk, recipe.baseServings, servings);
  }, 0);
  const { violationCount, severitySum, score } = evaluatePlan(assigned, ctx);
  return {
    violations: violationCount,
    severity: +severitySum.toFixed(3),
    score: +score.toFixed(2),
    costCzk: Math.round(cost),
    proteins: new Set(recipes.map((recipe) => recipe.proteinSource)).size,
    stores: countDistinctStores(assigned, ctx),
  };
}

const WARMUP_RUNS = 3;
const TIMED_RUNS = 20;

function timed(run: (week: Map<SlotKey, number>, stats: SearchStats) => void, initial: Map<SlotKey, number>) {
  for (let i = 0; i < WARMUP_RUNS; i++) run(new Map(initial), { passes: 0, evaluations: 0 });
  const samples: number[] = [];
  let week = new Map(initial);
  let stats: SearchStats = { passes: 0, evaluations: 0 };
  for (let i = 0; i < TIMED_RUNS; i++) {
    week = new Map(initial);
    stats = { passes: 0, evaluations: 0 };
    const start = performance.now();
    run(week, stats);
    samples.push(performance.now() - start);
  }
  const ms = samples.sort((a, b) => a - b)[Math.floor(TIMED_RUNS / 2)]!;
  return {
    week,
    row: {
      evaluations: stats.evaluations,
      passes: stats.passes || "-",
      evalsPerPass: stats.passes ? Math.round(stats.evaluations / stats.passes) : "-",
      ms: +ms.toFixed(3),
      usPerEval: stats.evaluations ? +((ms * 1000) / stats.evaluations).toFixed(1) : "-",
    },
  };
}

for (const harnessCase of CASES) {
  const ctx = buildPlannerContext(harnessCase.recipes, harnessCase.prices, { neverIngredientIds: [] }, { ...FIXTURE_TARGETS, weeklyBudgetCzk: harnessCase.weeklyBudgetCzk });
  const initial = new Map<SlotKey, number>([...(harnessCase.initial ?? [])].map(([day, id]) => [slotKey(day, "dinner"), id]));
  if (!harnessCase.initial) fillRemainingSlots(ctx, initial);
  const protectedKeys = new Set((harnessCase.protectedDays ?? []).map((day) => slotKey(day, "dinner")));
  const rows: Record<string, object> = { initial: describeWeek(initial, ctx) };

  const { week: systematic, row: systematicRun } = timed((week, stats) => Object.assign(stats, localSearch(week, ctx, protectedKeys)), initial);
  rows.systematic = { ...describeWeek(systematic, ctx), ...systematicRun };

  const legacy = LEGACY_SEEDS.map((seed) => {
    const { week, row: run } = timed((w, stats) => legacyRandomSearch(w, ctx, protectedKeys, createRng(seed), stats), initial);
    return { seed, quality: evaluatePlan(week, ctx), row: { ...describeWeek(week, ctx), ...run } };
  });
  const ranked = legacy.sort((a, b) => (isBetter(a.quality, b.quality) ? -1 : isBetter(b.quality, a.quality) ? 1 : 0));
  rows[`legacy best (seed ${ranked[0]!.seed})`] = ranked[0]!.row;
  rows[`legacy worst (seed ${ranked.at(-1)!.seed})`] = ranked.at(-1)!.row;

  const valid = legacy.filter((result) => result.quality.violationCount === 0).length;
  console.log(`\n${harnessCase.name}: ${harnessCase.recipes.length} recipes, ${protectedKeys.size} protected; legacy valid weeks ${valid}/${LEGACY_SEEDS.length}`);
  const systematicQuality = evaluatePlan(systematic, ctx);
  const better = legacy.filter((result) => isBetter(systematicQuality, result.quality)).length;
  const worse = legacy.filter((result) => isBetter(result.quality, systematicQuality)).length;
  console.log(`systematic vs legacy seeds: better ${better}, tied ${legacy.length - better - worse}, worse ${worse}`);
  console.table(rows);
}
