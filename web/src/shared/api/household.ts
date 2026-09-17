import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { apiClient } from "../../app/apiClient";
import { unwrapResponse } from "./unwrapResponse";

export const householdCatalogKeys = {
  settings: ["household", "settings"] as const,
  members: ["household", "members"] as const,
};

export type HouseholdSettingsEntry = InferResponseType<
  typeof apiClient.api.household.settings.$get
>;
export type HouseholdMemberEntry = InferResponseType<
  typeof apiClient.api.household.members.$get
>[number];

async function fetchHouseholdSettings(): Promise<HouseholdSettingsEntry> {
  const res = await apiClient.api.household.settings.$get();
  return unwrapResponse(res);
}

export function useHouseholdSettingsCatalog() {
  return useQuery({
    queryKey: householdCatalogKeys.settings,
    queryFn: fetchHouseholdSettings,
  });
}

async function fetchHouseholdMembers(): Promise<HouseholdMemberEntry[]> {
  const res = await apiClient.api.household.members.$get();
  return unwrapResponse(res);
}

export function useHouseholdMembersCatalog() {
  return useQuery({
    queryKey: householdCatalogKeys.members,
    queryFn: fetchHouseholdMembers,
  });
}
