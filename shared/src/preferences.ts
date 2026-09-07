export const INGREDIENT_PREFERENCE_RULES = ["never", "dislike"] as const;
export type IngredientPreferenceRule = (typeof INGREDIENT_PREFERENCE_RULES)[number];
