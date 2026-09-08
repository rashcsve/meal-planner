import { and, eq, sql } from "drizzle-orm";
import type { MealSlot } from "shared";
import { db } from "../db/index.js";
import { planSlots } from "../db/schema.js";
import { RecipeNotFoundError } from "../lib/errors.js";
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from "../lib/db.js";

export interface PlanSlotInput {
  day: number;
  mealSlot: MealSlot;
  recipeId: number | null;
  locked: boolean;
  reasons: string[];
}

function slotAddress(planWeekId: number, day: number, mealSlot: MealSlot) {
  return and(
    eq(planSlots.planWeekId, planWeekId),
    eq(planSlots.day, day),
    eq(planSlots.mealSlot, mealSlot),
  );
}

export async function findSlotsByWeekId(planWeekId: number) {
  return db
    .select()
    .from(planSlots)
    .where(eq(planSlots.planWeekId, planWeekId));
}

export async function findLockedSlotsByWeekId(planWeekId: number) {
  return db
    .select()
    .from(planSlots)
    .where(
      and(eq(planSlots.planWeekId, planWeekId), eq(planSlots.locked, true)),
    );
}

export async function upsertPlanSlots(
  planWeekId: number,
  slots: PlanSlotInput[],
) {
  return db
    .insert(planSlots)
    .values(slots.map((slot) => ({ planWeekId, ...slot })))
    .onConflictDoUpdate({
      target: [planSlots.planWeekId, planSlots.day, planSlots.mealSlot],
      set: {
        recipeId: sql`excluded.recipe_id`,
        locked: sql`excluded.locked`,
        reasons: sql`excluded.reasons`,
        updatedAt: new Date(),
      },
    })
    .returning();
}

export async function updateSlotLocked(
  planWeekId: number,
  day: number,
  mealSlot: MealSlot,
  locked: boolean,
) {
  const [slot] = await db
    .update(planSlots)
    .set({ locked, updatedAt: new Date() })
    .where(slotAddress(planWeekId, day, mealSlot))
    .returning();
  return slot;
}

export async function updateSlotRecipe(
  planWeekId: number,
  day: number,
  mealSlot: MealSlot,
  recipeId: number,
) {
  try {
    const [slot] = await db
      .update(planSlots)
      .set({ recipeId, reasons: [], updatedAt: new Date() })
      .where(slotAddress(planWeekId, day, mealSlot))
      .returning();
    return slot;
  } catch (err) {
    if (pgErrorCode(err) === PG_FOREIGN_KEY_VIOLATION) {
      throw new RecipeNotFoundError(recipeId);
    }
    throw err;
  }
}
