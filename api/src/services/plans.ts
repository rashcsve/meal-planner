import type { LockedSlot, MealSlot } from "shared";
import { plan } from "./planner.js";
import { getPlanInputs } from "./plan-inputs.js";
import { db } from "../db/index.js";
import {
  findPlanWeekByDate,
  insertPlanWeek,
  updatePlanWeek,
} from "../repositories/planWeeks.js";
import {
  findSlotsByWeekId,
  findLockedSlotsByWeekId,
  updateSlotLocked,
  updateSlotRecipe,
  upsertPlanSlots,
} from "../repositories/planSlots.js";
import { PlanWeekNotFoundError, PlanSlotNotFoundError } from "../lib/errors.js";

async function getLockedSlots(planWeekId: number): Promise<LockedSlot[]> {
  const rows = await findLockedSlotsByWeekId(planWeekId);
  return rows
    .filter((row) => row.recipeId !== null)
    .map((row) => ({
      day: row.day,
      mealSlot: row.mealSlot as MealSlot,
      recipeId: row.recipeId!,
    }));
}

export async function generatePlan(weekStartDate: string, seed: number) {
  const existingWeek = await findPlanWeekByDate(weekStartDate);
  // A lock/unlock that happens right after this line, before the write
  // below finishes, gets overwritten and lost. Fine for a single-user app.
  const locked = existingWeek ? await getLockedSlots(existingWeek.id) : [];
  const inputs = await getPlanInputs(weekStartDate);

  const result = plan(
    inputs.recipes,
    inputs.prices,
    inputs.pantry,
    inputs.preferences,
    locked,
    inputs.targets,
    seed,
  );

  return db.transaction(async (tx) => {
    const week = existingWeek
      ? await updatePlanWeek(
          existingWeek.id,
          { seed: result.seed, plannerVersion: result.plannerVersion },
          tx,
        )
      : await insertPlanWeek(
          {
            weekStartDate,
            seed: result.seed,
            plannerVersion: result.plannerVersion,
          },
          tx,
        );

    const slots = await upsertPlanSlots(week.id, result.slots, tx);

    return { ...week, slots };
  });
}

async function findWeekOrThrow(weekStartDate: string) {
  const week = await findPlanWeekByDate(weekStartDate);
  if (!week) throw new PlanWeekNotFoundError(weekStartDate);
  return week;
}

export async function getWeek(weekStartDate: string) {
  const week = await findWeekOrThrow(weekStartDate);
  const slots = await findSlotsByWeekId(week.id);
  return { ...week, slots };
}

export async function setSlotLocked(
  weekStartDate: string,
  day: number,
  mealSlot: MealSlot,
  locked: boolean,
) {
  const week = await findWeekOrThrow(weekStartDate);
  const slot = await updateSlotLocked(week.id, day, mealSlot, locked);
  if (!slot) throw new PlanSlotNotFoundError(day, mealSlot);
  return slot;
}

export async function replaceSlot(
  weekStartDate: string,
  day: number,
  mealSlot: MealSlot,
  recipeId: number,
) {
  const week = await findWeekOrThrow(weekStartDate);
  const slot = await updateSlotRecipe(week.id, day, mealSlot, recipeId);
  if (!slot) throw new PlanSlotNotFoundError(day, mealSlot);
  return slot;
}
