import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import type { CreatePantryItemInput } from "shared";
import { apiClient } from "../../app/apiClient";
import { unwrapEmptyResponse, unwrapResponse } from "../../shared/api/unwrapResponse";

export const pantryKeys = {
  list: ["pantry"] as const,
};

export type PantryItem = InferResponseType<typeof apiClient.api.pantry.$get>[number];

async function fetchPantryItems(): Promise<PantryItem[]> {
  const res = await apiClient.api.pantry.$get();
  return unwrapResponse(res);
}

export function usePantryItems() {
  return useQuery({
    queryKey: pantryKeys.list,
    queryFn: fetchPantryItems,
  });
}

async function postPantryItem(data: CreatePantryItemInput): Promise<void> {
  const res = await apiClient.api.pantry.$post({ json: data });
  return unwrapEmptyResponse(res);
}

export function useCreatePantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postPantryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.list });
    },
  });
}

async function deletePantryItem(id: number): Promise<void> {
  const res = await apiClient.api.pantry[":id"].$delete({ param: { id: String(id) } });
  return unwrapEmptyResponse(res);
}

export function useRemovePantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePantryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.list });
    },
  });
}
