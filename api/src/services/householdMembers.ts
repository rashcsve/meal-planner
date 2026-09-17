import {
  findAllHouseholdMembers,
  updateDinnerCalorieTarget,
} from "../repositories/householdMembers.js";
import { HouseholdMemberNotFoundError } from "../lib/errors.js";

export async function listHouseholdMembers() {
  return findAllHouseholdMembers();
}

export async function updateMemberDinnerTarget(id: number, dinnerCalorieTarget: number) {
  const member = await updateDinnerCalorieTarget(id, dinnerCalorieTarget);
  if (!member) throw new HouseholdMemberNotFoundError(id);
  return member;
}
