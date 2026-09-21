import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../src/db/index.js";
import { ingredients, recipeIngredients, recipes } from "../src/db/schema.js";
import { recipesRoute } from "../src/routes/recipes.js";
import { errorHandler } from "../src/lib/errorHandler.js";

const app = new Hono().onError(errorHandler).route("/api/recipes", recipesRoute);

afterEach(async () => {
  await db.delete(recipes);
  await db.delete(ingredients);
});

async function seedRecipe(overrides: Partial<{ title: string; time: number }> = {}) {
  const [recipe] = await db
    .insert(recipes)
    .values({ title: "Pancakes", time: 20, ...overrides })
    .returning();
  return recipe!;
}

async function seedIngredient(overrides: Partial<{ name: string; baseUnit: string }> = {}) {
  const [ingredient] = await db
    .insert(ingredients)
    .values({ name: "Flour", baseUnit: "g", ...overrides })
    .returning();
  return ingredient!;
}

async function seedRecipeIngredient(overrides: { recipeId: number; ingredientId: number }) {
  const [line] = await db.insert(recipeIngredients).values(overrides).returning();
  return line!;
}

describe("POST /api/recipes/:id/ingredients", () => {
  it("adds a line and returns it with a 201", async () => {
    const recipe = await seedRecipe();
    const flour = await seedIngredient();

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientId: flour.id,
        amountBase: 250,
        displayAmount: 2,
        displayUnit: "cups",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { amountBase: number; displayUnit: string };
    expect(body).toMatchObject({ amountBase: 250, displayUnit: "cups" });
  });

  it("adds a line with no amount, leaving it null rather than invented", async () => {
    const recipe = await seedRecipe();
    const saltToTaste = await seedIngredient({ name: "Salt" });

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: saltToTaste.id }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { amountBase: number | null };
    expect(body.amountBase).toBeNull();
  });

  it("404s for a recipe that does not exist", async () => {
    const flour = await seedIngredient();

    const res = await app.request("/api/recipes/999999/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: flour.id }),
    });
    expect(res.status).toBe(404);
  });

  it("404s for an ingredient that does not exist", async () => {
    const recipe = await seedRecipe();

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: 999999 }),
    });
    expect(res.status).toBe(404);
  });

  it("422s for a missing ingredientId", async () => {
    const recipe = await seedRecipe();

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountBase: 250 }),
    });
    expect(res.status).toBe(422);
  });

  it("422s for a display amount with no display unit", async () => {
    const recipe = await seedRecipe();
    const flour = await seedIngredient();

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: flour.id, displayAmount: 2 }),
    });
    expect(res.status).toBe(422);
  });

  it("422s for a display unit with no display amount", async () => {
    const recipe = await seedRecipe();
    const flour = await seedIngredient();

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: flour.id, displayUnit: "cups" }),
    });
    expect(res.status).toBe(422);
  });
});

describe("PUT /api/recipes/:id/ingredients/:lineId validation", () => {
  it("422s for a missing ingredientId", async () => {
    const recipe = await seedRecipe();
    const flour = await seedIngredient();
    const line = await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: flour.id });

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients/${line.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountBase: 250 }),
    });
    expect(res.status).toBe(422);
  });

  it("422s for a display amount with no display unit", async () => {
    const recipe = await seedRecipe();
    const flour = await seedIngredient();
    const line = await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: flour.id });

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients/${line.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: flour.id, displayAmount: 2 }),
    });
    expect(res.status).toBe(422);
  });
});

describe("PUT /api/recipes/:id/ingredients/:lineId", () => {
  it("replaces the line's fields", async () => {
    const recipe = await seedRecipe();
    const flour = await seedIngredient({ name: "Flour" });
    const sugar = await seedIngredient({ name: "Sugar" });
    const line = await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: flour.id });

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients/${line.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: sugar.id, amountBase: 50, isOptional: true }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ingredientId: number;
      amountBase: number;
      isOptional: boolean;
    };
    expect(body).toMatchObject({ ingredientId: sugar.id, amountBase: 50, isOptional: true });
  });

  it("clears an omitted amount back to null", async () => {
    const recipe = await seedRecipe();
    const flour = await seedIngredient();
    const line = await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: flour.id });
    await db
      .update(recipeIngredients)
      .set({ amountBase: 250 })
      .where(eq(recipeIngredients.id, line.id));

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients/${line.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: flour.id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { amountBase: number | null };
    expect(body.amountBase).toBeNull();
  });

  it("404s for a line that does not exist", async () => {
    const recipe = await seedRecipe();
    const flour = await seedIngredient();

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients/999999`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: flour.id }),
    });
    expect(res.status).toBe(404);
  });

  it("404s for a line that belongs to a different recipe", async () => {
    const recipe = await seedRecipe({ title: "Pancakes" });
    const otherRecipe = await seedRecipe({ title: "Waffles" });
    const flour = await seedIngredient();
    const line = await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: flour.id });

    const res = await app.request(`/api/recipes/${otherRecipe.id}/ingredients/${line.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredientId: flour.id }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/recipes/:id/ingredients/:lineId", () => {
  it("removes the line and returns 204", async () => {
    const recipe = await seedRecipe();
    const flour = await seedIngredient();
    const line = await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: flour.id });

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients/${line.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);

    const getRes = await app.request(`/api/recipes/${recipe.id}`);
    const body = (await getRes.json()) as { ingredients: unknown[] };
    expect(body.ingredients).toEqual([]);
  });

  it("404s for a line that does not exist", async () => {
    const recipe = await seedRecipe();

    const res = await app.request(`/api/recipes/${recipe.id}/ingredients/999999`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  it("404s for a line that belongs to a different recipe", async () => {
    const recipe = await seedRecipe({ title: "Pancakes" });
    const otherRecipe = await seedRecipe({ title: "Waffles" });
    const flour = await seedIngredient();
    const line = await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: flour.id });

    const res = await app.request(`/api/recipes/${otherRecipe.id}/ingredients/${line.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);

    const getRes = await app.request(`/api/recipes/${recipe.id}`);
    const body = (await getRes.json()) as { ingredients: unknown[] };
    expect(body.ingredients).toHaveLength(1);
  });
});
