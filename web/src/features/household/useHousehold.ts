import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateHouseholdSettingsInput } from "shared";
import { apiClient } from "../../app/apiClient";
import { unwrapResponse } from "../../shared/api/unwrapResponse";
import {
  householdCatalogKeys,
  useHouseholdSettingsCatalog,
  useHouseholdMembersCatalog,
  type HouseholdSettingsEntry,
  type HouseholdMemberEntry,
} from "../../shared/api/household";

export const householdKeys = householdCatalogKeys;

export type HouseholdSettings = HouseholdSettingsEntry;
export type HouseholdMember = HouseholdMemberEntry;

export const useHouseholdSettings = useHouseholdSettingsCatalog;
export const useHouseholdMembers = useHouseholdMembersCatalog;

async function putHouseholdSettings(
  data: UpdateHouseholdSettingsInput,
): Promise<HouseholdSettings> {
  const res = await apiClient.api.household.settings.$put({ json: data });
  return unwrapResponse(res);
}

export function useUpdateHouseholdSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putHouseholdSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.settings });
    },
  });
}

async function putMemberDinnerTarget(
  id: number,
  dinnerCalorieTarget: number,
): Promise<HouseholdMember> {
  const res = await apiClient.api.household.members[":id"].$put({
    param: { id: String(id) },
    json: { dinnerCalorieTarget },
  });
  return unwrapResponse(res);
}

export function useUpdateMemberDinnerTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dinnerCalorieTarget }: { id: number; dinnerCalorieTarget: number }) =>
      putMemberDinnerTarget(id, dinnerCalorieTarget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.members });
    },
  });
}
