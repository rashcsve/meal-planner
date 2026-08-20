import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { apiClient } from "../../app/apiClient";
import { parseErrorResponse } from "../../shared/api/parseErrorResponse";

export const recipesKeys = {
  list: ["recipes"] as const,
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
