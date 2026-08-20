interface NutritionSource {
  kcalPer100g: number | null
  weightG: number | null
  servings: number | null
}

function computeKcalTotal({ kcalPer100g, weightG }: NutritionSource): number | null {
  if (kcalPer100g == null || weightG == null) return null
  return Math.round((kcalPer100g * weightG) / 100)
}

function computeKcalPerServing(kcalTotal: number | null, servings: number | null): number | null {
  if (kcalTotal == null || servings == null) return null
  return Math.round(kcalTotal / servings)
}

export function withKcalFigures<T extends NutritionSource>(recipe: T) {
  const kcalTotal = computeKcalTotal(recipe)
  const kcalPerServing = computeKcalPerServing(kcalTotal, recipe.servings)
  return { ...recipe, kcalTotal, kcalPerServing }
}
