import type { HouseholdSettingsInput } from "../repositories/householdSettings.js";
import {
  findHouseholdSettings,
  upsertHouseholdSettings,
} from "../repositories/householdSettings.js";

export async function getHouseholdSettings() {
  const settings = await findHouseholdSettings();
  return settings ?? null;
}

export async function updateHouseholdSettings(data: HouseholdSettingsInput) {
  return upsertHouseholdSettings(data);
}
