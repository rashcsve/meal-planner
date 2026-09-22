import type {
  PlannerIngredientPrice,
  PlannerPantryItem,
  PlannerPreferences,
  PlannerRecipe,
  PlannerTargets,
} from "shared";

// Dinner-only fixture book (step 27.1): two "real" options, one excluded by
// a never-ingredient (shrimp), and one excluded by implausible per-member
// portions (dinnerTooBig). Both real options share calories, timeMinutes and
// promo-ingredient count, so fillRemainingSlots'/localSearch's picks are
// driven by the constraint under test (an expiring pantry item, a locked
// slot, a seed, protein variety) instead of one recipe simply scoring
// better than its sibling.
export const RECIPE_ID = {
  dinnerSalmon: 1,
  dinnerChicken: 2,
  dinnerShrimp: 3,
  dinnerTooBig: 4,
} as const;

export const INGREDIENT_ID = {
  chicken: 1,
  salmon: 2,
  rice: 3,
  broccoli: 4,
  shrimp: 5,
  tofu: 6,
} as const;

// Recipes containing the never-ingredient (shrimp). A hard-constraint test
// asserts none of these ids ever appear in a plan's slots.
export const NEVER_INGREDIENT_RECIPE_IDS = [RECIPE_ID.dinnerShrimp];

// calories=400 is chosen so both fixture members' dinner targets (500 and
// 800, see FIXTURE_TARGETS) divide into it at an exact multiple of the
// 0.25-serving rounding step: 500/400=1.25 servings exactly, 800/400=2.0
// servings exactly - no rounding artifact in the happy path.
export const FIXTURE_RECIPES: PlannerRecipe[] = [
  {
    id: RECIPE_ID.dinnerSalmon,
    mealType: "dinner",
    proteinSource: "salmon",
    timeMinutes: 30,
    costCzk: 400,
    calories: 400,
    baseServings: 4,
    ingredientIds: [INGREDIENT_ID.salmon, INGREDIENT_ID.broccoli],
  },
  {
    id: RECIPE_ID.dinnerChicken,
    mealType: "dinner",
    proteinSource: "chicken",
    timeMinutes: 30,
    costCzk: 400,
    calories: 400,
    baseServings: 4,
    ingredientIds: [INGREDIENT_ID.chicken, INGREDIENT_ID.rice],
  },
  {
    id: RECIPE_ID.dinnerShrimp,
    mealType: "dinner",
    proteinSource: "shellfish",
    timeMinutes: 25,
    costCzk: 400,
    calories: 400,
    baseServings: 4,
    ingredientIds: [INGREDIENT_ID.shrimp],
  },
  // 50 kcal/serving means member two (800 kcal target) would need 16
  // servings - far past the plausible-portion bound - so this recipe must
  // never appear in a dinner slot, no matter how well it might otherwise
  // score.
  {
    id: RECIPE_ID.dinnerTooBig,
    mealType: "dinner",
    proteinSource: "tofu",
    timeMinutes: 20,
    costCzk: 50,
    calories: 50,
    baseServings: 1,
    ingredientIds: [INGREDIENT_ID.tofu],
  },
];

// Every ingredient is on promo somewhere, so buildReasons always has a
// promo line to give the "reasons" tests something to find.
export const FIXTURE_PRICES: PlannerIngredientPrice[] = [
  {
    ingredientId: INGREDIENT_ID.salmon,
    ingredientName: "salmon",
    store: "Albert",
    pricePerUnit: 280,
    isPromo: true,
  },
  {
    ingredientId: INGREDIENT_ID.broccoli,
    ingredientName: "broccoli",
    store: "Lidl",
    pricePerUnit: 45,
    isPromo: true,
  },
  {
    ingredientId: INGREDIENT_ID.chicken,
    ingredientName: "chicken breast",
    store: "Lidl",
    pricePerUnit: 150,
    isPromo: true,
  },
  {
    ingredientId: INGREDIENT_ID.rice,
    ingredientName: "white rice",
    store: "Lidl",
    pricePerUnit: 35,
    isPromo: true,
  },
  {
    ingredientId: INGREDIENT_ID.shrimp,
    ingredientName: "shrimp",
    store: "Albert",
    pricePerUnit: 300,
    isPromo: true,
  },
  {
    ingredientId: INGREDIENT_ID.tofu,
    ingredientName: "tofu",
    store: "Lidl",
    pricePerUnit: 55,
    isPromo: true,
  },
];

// Salmon expires in 2 days - inside the 3-day must-use window - and is only
// used by dinnerSalmon, so that recipe must be placed on day 0, 1, or 2.
export const FIXTURE_PANTRY: PlannerPantryItem[] = [
  { ingredientId: INGREDIENT_ID.salmon, daysUntilExpiry: 2 },
];

// Shrimp is a household allergy: no recipe containing it may ever be
// scheduled, no matter how well it would otherwise fit.
export const FIXTURE_PREFERENCES: PlannerPreferences = {
  neverIngredientIds: [INGREDIENT_ID.shrimp],
};

// Two household members, mirroring the real scope (step 27.1): one 500
// kcal/dinner target, one 800 kcal/dinner target.
export const FIXTURE_MEMBER_TARGETS = [
  { memberId: 1, dinnerCalorieTarget: 500 },
  { memberId: 2, dinnerCalorieTarget: 800 },
];

export const FIXTURE_TARGETS: PlannerTargets = {
  memberTargets: FIXTURE_MEMBER_TARGETS,
  weeklyBudgetCzk: 3000,
  startDayOfWeek: 1, // Monday
  weekStartDate: "2026-09-21", // also a Monday
};
