import type { CreatePantryItemInput } from "shared";
import {
  deletePantryItem,
  findAllPantryItems,
  insertPantryItem,
} from "../repositories/pantryItems.js";

export async function listPantryItems() {
  return findAllPantryItems();
}

export async function createPantryItem(data: CreatePantryItemInput) {
  return insertPantryItem(data);
}

export async function removePantryItem(id: number) {
  const item = await deletePantryItem(id);
  return item ?? null;
}
