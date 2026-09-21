import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateRecipeInput } from "shared";
import { apiClient } from "../../app/apiClient";
import { unwrapResponse } from "../../shared/api/unwrapResponse";
import {
  recipeCatalogKeys,
  useRecipeCatalog,
  useRecipeDetail,
  type RecipeCatalogEntry,
  type RecipeWithIngredients,
} from "../../shared/api/recipeCatalog";

export const recipesKeys = recipeCatalogKeys;

export type Recipe = RecipeCatalogEntry;
export type { RecipeWithIngredients };
export type RecipeIngredient = RecipeWithIngredients["ingredients"][number];

export const useRecipes = useRecipeCatalog;
export const useRecipe = useRecipeDetail;

async function postRecipe(data: CreateRecipeInput): Promise<RecipeWithIngredients> {
  const res = await apiClient.api.recipes.$post({ json: data });
  return unwrapResponse(res);
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
