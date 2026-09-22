import { eq } from "drizzle-orm";
import { db, type DbClient } from "../db/index.js";
import { householdMembers } from "../db/schema.js";

export async function findAllHouseholdMembers() {
  return db.select().from(householdMembers);
}

export async function updateDinnerCalorieTarget(id: number, dinnerCalorieTarget: number) {
  const [member] = await db
    .update(householdMembers)
    .set({ dinnerCalorieTarget, updatedAt: new Date() })
    .where(eq(householdMembers.id, id))
    .returning();
  return member;
}

export async function confirmMemberShare(id: number, share: number, client: DbClient = db) {
  const [member] = await client
    .update(householdMembers)
    .set({ confirmedShare: share, shareConfirmedAt: new Date(), updatedAt: new Date() })
    .where(eq(householdMembers.id, id))
    .returning();
  return member;
}
