export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack_or_dessert"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export interface PlannerRecipe {
  id: number;
  mealType: string;
  proteinSource?: string;
  timeMinutes: number;
  costCzk: number;
  calories: number;
  ingredientIds: number[];
}

export interface PlannerIngredientPrice {
  ingredientId: number;
  ingredientName: string;
  store: string;
  pricePerUnit: number;
  isPromo: boolean;
}

export interface PlannerPantryItem {
  ingredientId: number;
  daysUntilExpiry: number | null;
}

export interface PlannerPreferences {
  neverIngredientIds: number[];
}

export interface LockedSlot {
  day: number;
  mealSlot: MealSlot;
  recipeId: number;
}

export interface PlannerTargets {
  dailyCalories: number;
  weeklyBudgetCzk: number;
  startDayOfWeek: number;
}

export const PLANNER_VERSION = "1.0.0";

export interface PlannedSlot {
  day: number;
  mealSlot: MealSlot;
  recipeId: number | null;
  locked: boolean;
  reasons: string[];
}

export interface PlanViolation {
  slot: { day: number; mealSlot: MealSlot } | null;
  constraint: string;
  detail: string;
}

export interface PlanResult {
  slots: PlannedSlot[];
  violations: PlanViolation[];
  seed: number;
  plannerVersion: string;
}
