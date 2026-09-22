import { eq } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import { householdSettings } from "../db/schema.js";

const SETTINGS_ROW_ID = 1;

export interface HouseholdSettingsInput {
  weeklyBudgetCzk: number;
  startDayOfWeek: number;
  timezone: string;
}

export async function findHouseholdSettings() {
  const [settings] = await db
    .select()
    .from(householdSettings)
    .where(eq(householdSettings.id, SETTINGS_ROW_ID));
  return settings;
}

/** Always writes the one row (id is fixed), so callers never decide
 * between insert and update - there is only ever "the current settings". */
export async function upsertHouseholdSettings(data: HouseholdSettingsInput) {
  const [settings] = await db
    .insert(householdSettings)
    .values({ id: SETTINGS_ROW_ID, ...data })
    .onConflictDoUpdate({
      target: householdSettings.id,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return settings!;
}

export async function confirmStandardPortionTarget(targetKcal: number, client: DbClient = db) {
  const [settings] = await client
    .update(householdSettings)
    .set({
      standardPortionTargetKcal: targetKcal,
      standardPortionConfirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(householdSettings.id, SETTINGS_ROW_ID))
    .returning();
  return settings;
}
