import { categorizeReasons, type ReasonTagInfo } from "../../shared/lib/planReasons";
import { dayDate, formatDayLabel } from "../../shared/lib/week";
import type { RecipeCatalogEntry } from "../../shared/api/recipeCatalog";
import type { HouseholdMemberEntry } from "../../shared/api/household";
import type { PlanSlot } from "./useWeek";

export interface MemberServingRow {
  memberId: number;
  memberName: string;
  servings: number;
  calories: number | null;
}

export interface WeekDayRow {
  day: number;
  date: string;
  dayLabel: string;
  locked: boolean;
  recipeTitle: string | null;
  timeMinutes: number | null;
  cost: number | null;
  members: MemberServingRow[];
  reasonTags: ReasonTagInfo[];
}

function memberName(memberId: number, members: HouseholdMemberEntry[]): string {
  return members.find((m) => m.id === memberId)?.name ?? `Member ${memberId}`;
}

export function deriveWeekRows(
  weekStartDate: string,
  slots: PlanSlot[],
  recipes: RecipeCatalogEntry[],
  members: HouseholdMemberEntry[],
): WeekDayRow[] {
  return slots
    .filter((slot) => slot.mealSlot === "dinner")
    .map((slot) => {
      const recipe = slot.recipeId != null ? recipes.find((r) => r.id === slot.recipeId) : null;
      const totalServings = slot.memberServings.reduce((sum, m) => sum + m.servings, 0);
      const cost =
        recipe?.cost != null && recipe.servings
          ? Math.round(((recipe.cost * totalServings) / recipe.servings) * 100) / 100
          : null;

      const date = dayDate(weekStartDate, slot.day);
      return {
        day: slot.day,
        date,
        dayLabel: formatDayLabel(date),
        locked: slot.locked,
        recipeTitle: recipe?.title ?? null,
        timeMinutes: recipe?.time ?? null,
        cost,
        members: slot.memberServings.map((m) => ({
          memberId: m.memberId,
          memberName: memberName(m.memberId, members),
          servings: m.servings,
          calories:
            recipe?.kcalPerServing != null ? Math.round(recipe.kcalPerServing * m.servings) : null,
        })),
        reasonTags: categorizeReasons(slot.reasons),
      };
    });
}
