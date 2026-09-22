import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateRecipeInput,
  RecipeIngredientLineInput,
  UpdateRecipeServingsInput,
} from "shared";
import { apiClient } from "../../app/apiClient";
import { unwrapEmptyResponse, unwrapResponse } from "../../shared/api/unwrapResponse";
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

export interface EditRecipeServingsVariables {
  recipeId: number;
  data: UpdateRecipeServingsInput;
}

async function putRecipeServings({ recipeId, data }: EditRecipeServingsVariables) {
  const res = await apiClient.api.recipes[":id"].$put({
    param: { id: String(recipeId) },
    json: data,
  });
  return unwrapResponse(res);
}

export function useEditRecipeServings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putRecipeServings,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: recipesKeys.detail(variables.recipeId) });
    },
  });
}

export interface AddIngredientLineVariables {
  recipeId: number;
  data: RecipeIngredientLineInput;
}

async function postIngredientLine({ recipeId, data }: AddIngredientLineVariables) {
  const res = await apiClient.api.recipes[":id"].ingredients.$post({
    param: { id: String(recipeId) },
    json: data,
  });
  return unwrapResponse(res);
}

export function useAddIngredientLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postIngredientLine,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: recipesKeys.detail(variables.recipeId) });
    },
  });
}

export interface EditIngredientLineVariables {
  recipeId: number;
  lineId: number;
  data: RecipeIngredientLineInput;
}

async function putIngredientLine({ recipeId, lineId, data }: EditIngredientLineVariables) {
  const res = await apiClient.api.recipes[":id"].ingredients[":lineId"].$put({
    param: { id: String(recipeId), lineId: String(lineId) },
    json: data,
  });
  return unwrapResponse(res);
}

export function useEditIngredientLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putIngredientLine,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: recipesKeys.detail(variables.recipeId) });
    },
  });
}

export interface RemoveIngredientLineVariables {
  recipeId: number;
  lineId: number;
}

async function deleteIngredientLine({ recipeId, lineId }: RemoveIngredientLineVariables) {
  const res = await apiClient.api.recipes[":id"].ingredients[":lineId"].$delete({
    param: { id: String(recipeId), lineId: String(lineId) },
  });
  return unwrapEmptyResponse(res);
}

export function useRemoveIngredientLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteIngredientLine,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: recipesKeys.detail(variables.recipeId) });
    },
  });
}
