import { findAllHouseholdMembers } from '../repositories/householdMembers.js'

export async function listHouseholdMembers() {
  return findAllHouseholdMembers()
}
