import { categorizeReasons, type ReasonTagInfo } from "../../shared/lib/planReasons";
import { formatTime } from "../../shared/lib/formatTime";
import type {
  RecipeCatalogEntry,
  RecipeIngredient,
  RecipeWithIngredients,
} from "../../shared/api/recipeCatalog";
import type { HouseholdMemberEntry } from "../../shared/api/household";
import type { PlanSlot, SlotCandidate } from "./useWeek";

export interface MealDetailMemberRow {
  memberId: number;
  memberName: string;
  servings: number;
  calories: number | null;
}

export interface MealDetailIngredientRow {
  id: number;
  label: string;
  incomplete: boolean;
}

export interface MealDetail {
  title: string;
  meta: string;
  tags: string[];
  members: MealDetailMemberRow[];
  reasonTags: ReasonTagInfo[];
  ingredients: MealDetailIngredientRow[];
}

export interface CandidateRow {
  recipeId: number;
  title: string;
  meta: string;
  members: MealDetailMemberRow[];
}

function memberName(memberId: number, members: HouseholdMemberEntry[]): string {
  return members.find((m) => m.id === memberId)?.name ?? `Member ${memberId}`;
}

function membersFromServings(
  servings: { memberId: number; servings: number }[],
  members: HouseholdMemberEntry[],
  kcalPerServing: number | null,
): MealDetailMemberRow[] {
  return servings.map((s) => ({
    memberId: s.memberId,
    memberName: memberName(s.memberId, members),
    servings: s.servings,
    calories: kcalPerServing != null ? Math.round(kcalPerServing * s.servings) : null,
  }));
}

function ingredientRow(line: RecipeIngredient, ratio: number | null): MealDetailIngredientRow {
  const incomplete = line.amountBase == null;
  if (line.displayAmount == null) {
    return { id: line.id, label: line.ingredientName, incomplete };
  }
  const amount =
    ratio != null ? Math.round(line.displayAmount * ratio * 10) / 10 : line.displayAmount;
  const amountLabel = [amount, line.displayUnit].filter(Boolean).join(" ");
  return {
    id: line.id,
    label: [amountLabel, line.ingredientName].filter(Boolean).join(" "),
    incomplete,
  };
}

function recipeMeta(recipe: { time: number; meal: string | null; cost: number | null }): string {
  return [formatTime(recipe.time), recipe.meal, recipe.cost != null ? `${recipe.cost},-` : null]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function deriveMealDetail(
  slot: PlanSlot,
  recipe: RecipeWithIngredients | undefined,
  members: HouseholdMemberEntry[],
): MealDetail | null {
  if (!recipe) return null;

  const totalServings = slot.memberServings.reduce((sum, m) => sum + m.servings, 0);
  const ratio = recipe.servings && totalServings > 0 ? totalServings / recipe.servings : null;

  return {
    title: recipe.title,
    meta: recipeMeta(recipe),
    tags: [recipe.cuisine, recipe.proteinSource, recipe.diet].filter((tag): tag is string =>
      Boolean(tag),
    ),
    members: membersFromServings(slot.memberServings, members, recipe.kcalPerServing),
    reasonTags: categorizeReasons(slot.reasons),
    ingredients: recipe.ingredients.map((line) => ingredientRow(line, ratio)),
  };
}

export function deriveCandidateRows(
  candidates: SlotCandidate[],
  recipes: RecipeCatalogEntry[],
  members: HouseholdMemberEntry[],
): CandidateRow[] {
  const rows: CandidateRow[] = [];
  for (const candidate of candidates) {
    const recipe = recipes.find((r) => r.id === candidate.recipeId);
    if (!recipe) continue;
    rows.push({
      recipeId: candidate.recipeId,
      title: recipe.title,
      meta: recipeMeta(recipe),
      members: membersFromServings(candidate.memberServings, members, recipe.kcalPerServing),
    });
  }
  return rows;
}
