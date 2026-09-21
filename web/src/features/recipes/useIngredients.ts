import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import type { CreateIngredientInput } from "shared";
import { apiClient } from "../../app/apiClient";
import { unwrapResponse } from "../../shared/api/unwrapResponse";

export const ingredientsKeys = {
  list: ["ingredients"] as const,
};

export type Ingredient = InferResponseType<typeof apiClient.api.ingredients.$get>[number];

async function fetchIngredients(): Promise<Ingredient[]> {
  const res = await apiClient.api.ingredients.$get();
  return unwrapResponse(res);
}

export function useIngredients() {
  return useQuery({
    queryKey: ingredientsKeys.list,
    queryFn: fetchIngredients,
  });
}

async function postIngredient(data: CreateIngredientInput): Promise<Ingredient> {
  const res = await apiClient.api.ingredients.$post({ json: data });
  return unwrapResponse(res);
}

export function useCreateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postIngredient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientsKeys.list });
    },
  });
}
