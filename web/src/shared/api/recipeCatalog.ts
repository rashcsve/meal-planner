import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { apiClient } from "../../app/apiClient";
import { unwrapResponse } from "./unwrapResponse";

export const recipeCatalogKeys = {
  list: ["recipes"] as const,
  detail: (id: number) => ["recipes", id] as const,
};

export type RecipeCatalogEntry = InferResponseType<typeof apiClient.api.recipes.$get>[number];
export type RecipeWithIngredients = InferResponseType<
  (typeof apiClient.api.recipes)[":id"]["$get"]
>;
export type RecipeIngredient = RecipeWithIngredients["ingredients"][number];

async function fetchRecipeCatalog(): Promise<RecipeCatalogEntry[]> {
  const res = await apiClient.api.recipes.$get();
  return unwrapResponse(res);
}

export function useRecipeCatalog() {
  return useQuery({
    queryKey: recipeCatalogKeys.list,
    queryFn: fetchRecipeCatalog,
  });
}

async function fetchRecipe(id: number): Promise<RecipeWithIngredients> {
  const res = await apiClient.api.recipes[":id"].$get({ param: { id: String(id) } });
  return unwrapResponse(res);
}

// Shared because more than one feature (recipes, week) needs a single
// recipe's full ingredient list, not just the catalog summary row.
export function useRecipeDetail(id: number | undefined) {
  return useQuery({
    queryKey: recipeCatalogKeys.detail(id ?? -1),
    queryFn: () => fetchRecipe(id!),
    enabled: id != null,
  });
}
