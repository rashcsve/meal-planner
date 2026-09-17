import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
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
