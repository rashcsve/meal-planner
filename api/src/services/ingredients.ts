import type { CreateIngredientInput } from "shared";
import { findAllIngredients, insertIngredient } from "../repositories/ingredients.js";

export async function listIngredients() {
  return findAllIngredients();
}

export async function createIngredient(data: CreateIngredientInput) {
  return insertIngredient(data);
}
