import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { apiClient } from "../../app/apiClient";
import { unwrapResponse } from "./unwrapResponse";

export const recipeCatalogKeys = {
  list: ["recipes"] as const,
};

export type RecipeCatalogEntry = InferResponseType<typeof apiClient.api.recipes.$get>[number];

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
