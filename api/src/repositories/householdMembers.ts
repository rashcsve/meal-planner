import { db } from '../db/index.js'
import { householdMembers } from '../db/schema.js'

export async function findAllHouseholdMembers() {
  return db.select().from(householdMembers)
}
