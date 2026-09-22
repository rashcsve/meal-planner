import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import type { ConfirmHouseholdSharesInput, UpdateHouseholdSettingsInput } from "shared";
import { apiClient } from "../../app/apiClient";
import { unwrapResponse } from "../../shared/api/unwrapResponse";
import {
  householdCatalogKeys,
  useHouseholdSettingsCatalog,
  useHouseholdMembersCatalog,
  type HouseholdSettingsEntry,
  type HouseholdMemberEntry,
} from "../../shared/api/household";

export const householdKeys = {
  ...householdCatalogKeys,
  shareProposal: ["household", "share-proposal"] as const,
};

export type HouseholdSettings = HouseholdSettingsEntry;
export type HouseholdMember = HouseholdMemberEntry;
export type HouseholdShareProposal = InferResponseType<
  (typeof apiClient.api.household)["share-proposal"]["$get"]
>;

export const useHouseholdSettings = useHouseholdSettingsCatalog;
export const useHouseholdMembers = useHouseholdMembersCatalog;

async function fetchHouseholdShareProposal(): Promise<HouseholdShareProposal> {
  const res = await apiClient.api.household["share-proposal"].$get();
  return unwrapResponse(res);
}

export function useHouseholdShareProposal() {
  return useQuery({
    queryKey: householdKeys.shareProposal,
    queryFn: fetchHouseholdShareProposal,
  });
}

async function postConfirmHouseholdShares(data: ConfirmHouseholdSharesInput) {
  const res = await apiClient.api.household["confirm-shares"].$post({ json: data });
  return unwrapResponse(res);
}

export function useConfirmHouseholdShares() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postConfirmHouseholdShares,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdKeys.settings });
      queryClient.invalidateQueries({ queryKey: householdKeys.members });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: householdKeys.shareProposal });
    },
  });
}
