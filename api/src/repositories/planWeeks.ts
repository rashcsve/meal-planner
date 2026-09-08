import { eq } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import { planWeeks } from "../db/schema.js";
import { WeekAlreadyGeneratedError } from "../lib/errors.js";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../lib/db.js";

export interface PlanWeekInput {
  weekStartDate: string;
  seed: number;
  plannerVersion: string;
}

export async function findPlanWeekByDate(weekStartDate: string) {
  const [week] = await db
    .select()
    .from(planWeeks)
    .where(eq(planWeeks.weekStartDate, weekStartDate));
  return week;
}

export async function insertPlanWeek(data: PlanWeekInput, client: DbClient = db) {
  try {
    const [week] = await client.insert(planWeeks).values(data).returning();
    return week!;
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      throw new WeekAlreadyGeneratedError(data.weekStartDate);
    }
    throw err;
  }
}

export async function updatePlanWeek(
  id: number,
  data: Pick<PlanWeekInput, "seed" | "plannerVersion">,
  client: DbClient = db,
) {
  const [week] = await client
    .update(planWeeks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(planWeeks.id, id))
    .returning();
  return week!;
}
