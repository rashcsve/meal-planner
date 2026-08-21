import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import type { CreateRecipeInput } from "shared";
import { apiClient } from "../../app/apiClient";
import { parseErrorResponse } from "../../shared/api/parseErrorResponse";

export const recipesKeys = {
  list: ["recipes"] as const,
  detail: (id: number) => ["recipes", id] as const,
};

export type Recipe = InferResponseType<typeof apiClient.api.recipes.$get>[number];

async function fetchRecipes(): Promise<Recipe[]> {
  const res = await apiClient.api.recipes.$get();
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  return res.json();
}

export function useRecipes() {
  return useQuery({
    queryKey: recipesKeys.list,
    queryFn: fetchRecipes,
  });
}

async function fetchRecipe(id: number): Promise<Recipe> {
  const res = await apiClient.api.recipes[":id"].$get({ param: { id: String(id) } });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  return res.json();
}

export function useRecipe(id: number | undefined) {
  return useQuery({
    queryKey: recipesKeys.detail(id ?? -1),
    queryFn: () => fetchRecipe(id!),
    enabled: id != null,
  });
}

async function postRecipe(data: CreateRecipeInput): Promise<Recipe> {
  const res = await apiClient.api.recipes.$post({ json: data });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  return res.json();
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipesKeys.list });
    },
  });
}
