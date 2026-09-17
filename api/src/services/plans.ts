import type { LockedSlot, MealSlot } from "shared";
import { plan } from "./planner.js";
import { getPlanInputs } from "./plan-inputs.js";
import { db } from "../db/index.js";
import {
  findPlanWeekByDate,
  insertPlanWeek,
  casIncrementRevision,
} from "../repositories/planWeeks.js";
import {
  findSlotsByWeekId,
  findLockedSlotsByWeekId,
  updateSlotLocked,
  updateSlotRecipe,
  upsertPlanSlots,
} from "../repositories/planSlots.js";
import {
  PlanWeekNotFoundError,
  PlanSlotNotFoundError,
  StaleRevisionError,
  ExpectedRevisionRequiredError,
} from "../lib/errors.js";

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

export async function generatePlan(weekStartDate: string, seed: number, expectedRevision?: number) {
  const existingWeek = await findPlanWeekByDate(weekStartDate);
  if (existingWeek && expectedRevision === undefined) {
    throw new ExpectedRevisionRequiredError(weekStartDate);
  }

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
    let week;
    if (existingWeek) {
      week = await casIncrementRevision(
        existingWeek.id,
        expectedRevision!,
        { seed: result.seed, plannerVersion: result.plannerVersion },
        tx,
      );
      if (!week) {
        throw new StaleRevisionError(weekStartDate, expectedRevision!);
      }
    } else {
      week = await insertPlanWeek(
        {
          weekStartDate,
          seed: result.seed,
          plannerVersion: result.plannerVersion,
        },
        tx,
      );
    }

    const slots = await upsertPlanSlots(week.id, result.slots, tx);
    return { ...week, slots, violations: result.violations };
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
  expectedRevision: number,
) {
  const week = await findWeekOrThrow(weekStartDate);
  return db.transaction(async (tx) => {
    const updatedWeek = await casIncrementRevision(week.id, expectedRevision, {}, tx);
    if (!updatedWeek) throw new StaleRevisionError(weekStartDate, expectedRevision);

    const slot = await updateSlotLocked(week.id, day, mealSlot, locked, tx);
    if (!slot) throw new PlanSlotNotFoundError(day, mealSlot);
    return { ...slot, revision: updatedWeek.revision };
  });
}

export async function replaceSlot(
  weekStartDate: string,
  day: number,
  mealSlot: MealSlot,
  recipeId: number,
  expectedRevision: number,
) {
  const week = await findWeekOrThrow(weekStartDate);
  return db.transaction(async (tx) => {
    const updatedWeek = await casIncrementRevision(week.id, expectedRevision, {}, tx);
    if (!updatedWeek) throw new StaleRevisionError(weekStartDate, expectedRevision);

    const slot = await updateSlotRecipe(week.id, day, mealSlot, recipeId, tx);
    if (!slot) throw new PlanSlotNotFoundError(day, mealSlot);
    return { ...slot, revision: updatedWeek.revision };
  });
}
