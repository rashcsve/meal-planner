import type {
  PlannerIngredientPrice,
  PlannerPantryItem,
  PlannerPreferences,
  PlannerRecipe,
  PlannerTargets,
} from "shared";

// A small, hand-picked recipe book. Every meal slot has two "real" options
// plus one that contains the household's never-ingredient (shrimp) so tests
// can prove it's excluded rather than just unused by chance.
//
// Calories are chosen so one of each (breakfast + lunch + dinner + snack)
// sums to exactly the 2000 kcal daily target used in FIXTURE_TARGETS, and
// every same-slot pair ties on calories, timeMinutes, and promo-ingredient
// count. That keeps fillRemainingSlots' and localSearch's picks driven by
// the constraint under test (an expiring pantry item, a locked slot, a
// seed) instead of one recipe simply scoring better than its sibling.
export const RECIPE_ID = {
  breakfastEggs: 2,
  breakfastOatsWithYogurt: 1,
  breakfastShrimp: 3,
  lunchChicken: 4,
  lunchTofu: 5,
  lunchShrimp: 6,
  dinnerSalmon: 7,
  dinnerChicken: 8,
  dinnerShrimp: 9,
  snackApple: 10,
  dessertChocolate: 11,
  snackShrimp: 12,
} as const;

export const INGREDIENT_ID = {
  oats: 1,
  eggs: 2,
  chicken: 3,
  tofu: 4,
  salmon: 5,
  rice: 6,
  broccoli: 7,
  yogurt: 8,
  shrimp: 9,
  chocolate: 10,
  apple: 11,
} as const;

// Recipes containing the never-ingredient (shrimp). A hard-constraint test
// asserts none of these ids ever appear in a plan's slots.
export const NEVER_INGREDIENT_RECIPE_IDS = [
  RECIPE_ID.breakfastShrimp,
  RECIPE_ID.lunchShrimp,
  RECIPE_ID.dinnerShrimp,
  RECIPE_ID.snackShrimp,
];

export const FIXTURE_RECIPES: PlannerRecipe[] = [
  // breakfastEggs listed first so it's the tie-break default; the yogurt
  // recipe only shows up when something (the expiry constraint) forces it.
  {
    id: RECIPE_ID.breakfastEggs,
    mealType: "breakfast",
    proteinSource: "egg",
    timeMinutes: 10,
    costCzk: 35,
    calories: 420,
    ingredientIds: [INGREDIENT_ID.eggs],
  },
  {
    id: RECIPE_ID.breakfastOatsWithYogurt,
    mealType: "breakfast",
    proteinSource: "dairy",
    timeMinutes: 10,
    costCzk: 30,
    calories: 420,
    ingredientIds: [INGREDIENT_ID.oats, INGREDIENT_ID.yogurt],
  },
  {
    id: RECIPE_ID.breakfastShrimp,
    mealType: "breakfast",
    proteinSource: "shellfish",
    timeMinutes: 15,
    costCzk: 50,
    calories: 420,
    ingredientIds: [INGREDIENT_ID.shrimp, INGREDIENT_ID.oats],
  },

  {
    id: RECIPE_ID.lunchChicken,
    mealType: "lunch",
    proteinSource: "chicken",
    timeMinutes: 25,
    costCzk: 90,
    calories: 650,
    ingredientIds: [
      INGREDIENT_ID.chicken,
      INGREDIENT_ID.rice,
      INGREDIENT_ID.broccoli,
    ],
  },
  {
    id: RECIPE_ID.lunchTofu,
    mealType: "lunch",
    proteinSource: "tofu",
    timeMinutes: 25,
    costCzk: 90,
    calories: 650,
    ingredientIds: [
      INGREDIENT_ID.tofu,
      INGREDIENT_ID.rice,
      INGREDIENT_ID.broccoli,
    ],
  },
  {
    id: RECIPE_ID.lunchShrimp,
    mealType: "lunch",
    proteinSource: "shellfish",
    timeMinutes: 20,
    costCzk: 95,
    calories: 650,
    ingredientIds: [INGREDIENT_ID.shrimp, INGREDIENT_ID.rice],
  },

  {
    id: RECIPE_ID.dinnerSalmon,
    mealType: "dinner",
    proteinSource: "salmon",
    timeMinutes: 30,
    costCzk: 120,
    calories: 700,
    ingredientIds: [INGREDIENT_ID.salmon, INGREDIENT_ID.broccoli],
  },
  {
    id: RECIPE_ID.dinnerChicken,
    mealType: "dinner",
    proteinSource: "chicken",
    timeMinutes: 30,
    costCzk: 120,
    calories: 700,
    ingredientIds: [INGREDIENT_ID.chicken, INGREDIENT_ID.rice],
  },
  {
    id: RECIPE_ID.dinnerShrimp,
    mealType: "dinner",
    proteinSource: "shellfish",
    timeMinutes: 25,
    costCzk: 110,
    calories: 700,
    ingredientIds: [INGREDIENT_ID.shrimp],
  },

  {
    id: RECIPE_ID.snackApple,
    mealType: "snack",
    timeMinutes: 5,
    costCzk: 15,
    calories: 230,
    ingredientIds: [INGREDIENT_ID.apple],
  },
  {
    id: RECIPE_ID.dessertChocolate,
    mealType: "dessert",
    timeMinutes: 2,
    costCzk: 15,
    calories: 230,
    ingredientIds: [INGREDIENT_ID.chocolate],
  },
  {
    id: RECIPE_ID.snackShrimp,
    mealType: "snack",
    proteinSource: "shellfish",
    timeMinutes: 5,
    costCzk: 25,
    calories: 230,
    ingredientIds: [INGREDIENT_ID.shrimp],
  },
];

// Every ingredient is on promo somewhere. That guarantees buildReasons has
// at least a promo line for every recipe, so "every slot carries a reason"
// isn't accidentally true only for the lunch/dinner slots that also get a
// protein-variety line.
export const FIXTURE_PRICES: PlannerIngredientPrice[] = [
  {
    ingredientId: INGREDIENT_ID.oats,
    ingredientName: "rolled oats",
    store: "Albert",
    pricePerUnit: 40,
    isPromo: true,
  },
  {
    ingredientId: INGREDIENT_ID.eggs,
    ingredientName: "eggs",
    store: "Albert",
    pricePerUnit: 60,
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
    ingredientId: INGREDIENT_ID.tofu,
    ingredientName: "tofu",
    store: "Lidl",
    pricePerUnit: 55,
    isPromo: true,
  },
  {
    ingredientId: INGREDIENT_ID.salmon,
    ingredientName: "salmon",
    store: "Albert",
    pricePerUnit: 280,
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
    ingredientId: INGREDIENT_ID.broccoli,
    ingredientName: "broccoli",
    store: "Lidl",
    pricePerUnit: 45,
    isPromo: true,
  },
  {
    ingredientId: INGREDIENT_ID.yogurt,
    ingredientName: "greek yogurt",
    store: "Albert",
    pricePerUnit: 25,
    isPromo: false,
  },
  {
    ingredientId: INGREDIENT_ID.shrimp,
    ingredientName: "shrimp",
    store: "Albert",
    pricePerUnit: 300,
    isPromo: true,
  },
  {
    ingredientId: INGREDIENT_ID.chocolate,
    ingredientName: "dark chocolate",
    store: "Lidl",
    pricePerUnit: 60,
    isPromo: true,
  },
  {
    ingredientId: INGREDIENT_ID.apple,
    ingredientName: "apple",
    store: "Albert",
    pricePerUnit: 20,
    isPromo: true,
  },
];

// Greek yogurt expires in 2 days - inside the 3-day must-use window - and
// is only used by breakfastOatsWithYogurt, so that recipe must be placed
// on day 0, 1, or 2.
export const FIXTURE_PANTRY: PlannerPantryItem[] = [
  { ingredientId: INGREDIENT_ID.yogurt, daysUntilExpiry: 2 },
];

// Shrimp is a household allergy: no recipe containing it may ever be
// scheduled, no matter how well it would otherwise fit.
export const FIXTURE_PREFERENCES: PlannerPreferences = {
  neverIngredientIds: [INGREDIENT_ID.shrimp],
};

// One of each meal (420 + 650 + 700 + 230) totals exactly 2000 kcal, so any
// valid combination of the non-shrimp recipes hits the daily target.
export const FIXTURE_TARGETS: PlannerTargets = {
  dailyCalories: 2000,
  weeklyBudgetCzk: 3000,
  startDayOfWeek: 1, // Monday
};
