import { Hono } from "hono";
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

async function seedRecipe(
  overrides: Partial<{ title: string; time: number; servings: number }> = {},
) {
  const [recipe] = await db
    .insert(recipes)
    .values({ title: "Pancakes", time: 20, ...overrides })
    .returning();
  return recipe!;
}

async function seedIngredient(
  overrides: Partial<{ name: string; baseUnit: string; kcalPer100g: number | null }> = {},
) {
  const [ingredient] = await db
    .insert(ingredients)
    .values({ name: "Chicken breast", baseUnit: "g", kcalPer100g: 165, ...overrides })
    .returning();
  return ingredient!;
}

async function seedRecipeIngredient(overrides: {
  recipeId: number;
  ingredientId: number;
  amountBase?: number | null;
  displayAmount?: number | null;
  displayUnit?: string | null;
  isOptional?: boolean;
}) {
  const [line] = await db
    .insert(recipeIngredients)
    .values({ isOptional: false, ...overrides })
    .returning();
  return line!;
}

describe("GET /api/recipes", () => {
  it("returns the rows currently in the table", async () => {
    await seedRecipe({ title: "Pancakes" });
    await seedRecipe({ title: "Waffles" });

    const res = await app.request("/api/recipes");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { title: string }[];
    expect(body).toHaveLength(2);
    expect(body.map((r) => r.title).sort()).toEqual(["Pancakes", "Waffles"]);
  });

  it("reports zero kcal for a recipe with no ingredients yet", async () => {
    await seedRecipe({ title: "Pancakes" });

    const res = await app.request("/api/recipes");
    const body = (await res.json()) as { kcalTotal: number }[];
    expect(body[0]).toMatchObject({ kcalTotal: 0 });
  });

  it("computes kcal per recipe from that recipe's own ingredient lines", async () => {
    const pancakes = await seedRecipe({ title: "Pancakes" });
    await seedRecipe({ title: "Waffles" });
    const chicken = await seedIngredient({ name: "Chicken breast", kcalPer100g: 165 });
    await seedRecipeIngredient({
      recipeId: pancakes.id,
      ingredientId: chicken.id,
      amountBase: 200,
    });

    const res = await app.request("/api/recipes");
    const body = (await res.json()) as { title: string; kcalTotal: number }[];
    expect(body.find((r) => r.title === "Pancakes")).toMatchObject({ kcalTotal: 330 });
    expect(body.find((r) => r.title === "Waffles")).toMatchObject({ kcalTotal: 0 });
  });

  it("divides kcal by servings for kcalPerServing", async () => {
    const pancakes = await seedRecipe({ title: "Pancakes", servings: 2 });
    const chicken = await seedIngredient({ name: "Chicken breast", kcalPer100g: 165 });
    await seedRecipeIngredient({
      recipeId: pancakes.id,
      ingredientId: chicken.id,
      amountBase: 200,
    });

    const res = await app.request("/api/recipes");
    const body = (await res.json()) as { title: string; kcalPerServing: number | null }[];
    expect(body.find((r) => r.title === "Pancakes")).toMatchObject({ kcalPerServing: 165 });
  });
});

describe("GET /api/recipes/:id", () => {
  it("returns the matching recipe", async () => {
    const seeded = await seedRecipe({ title: "Pancakes" });

    const res = await app.request(`/api/recipes/${seeded.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ id: seeded.id, title: "Pancakes" });
  });

  it("returns 404 for an id that does not exist", async () => {
    const res = await app.request("/api/recipes/999999");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: { message: "Recipe not found" } });
  });

  it("includes kcal computed from the ingredient lines", async () => {
    const recipe = await seedRecipe({ title: "Pancakes" });
    const flour = await seedIngredient({ name: "Flour", kcalPer100g: 364 });
    const egg = await seedIngredient({ name: "Egg", kcalPer100g: 155 });
    await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: flour.id, amountBase: 250 });
    await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: egg.id, amountBase: 50 });

    const res = await app.request(`/api/recipes/${recipe.id}`);
    const body = await res.json();
    // 250/100*364 + 50/100*155 = 910 + 77.5
    expect(body).toMatchObject({ kcalTotal: 987.5 });
  });

  it("includes optional ingredients in the kcal total", async () => {
    const recipe = await seedRecipe({ title: "Pancakes" });
    const chiliFlakes = await seedIngredient({ name: "Chili flakes", kcalPer100g: 282 });
    await seedRecipeIngredient({
      recipeId: recipe.id,
      ingredientId: chiliFlakes.id,
      amountBase: 5,
      isOptional: true,
    });

    const res = await app.request(`/api/recipes/${recipe.id}`);
    const body = (await res.json()) as { kcalTotal: number };
    expect(body.kcalTotal).toBeCloseTo(14.1);
  });

  it("includes the ingredient lines with their display amount and unit", async () => {
    const recipe = await seedRecipe({ title: "Pancakes" });
    const oliveOil = await seedIngredient({ name: "Olive oil", baseUnit: "g", kcalPer100g: 884 });
    const line = await seedRecipeIngredient({
      recipeId: recipe.id,
      ingredientId: oliveOil.id,
      amountBase: 27.6,
      displayAmount: 2,
      displayUnit: "lžíce",
    });

    const res = await app.request(`/api/recipes/${recipe.id}`);
    const body = (await res.json()) as {
      ingredients: {
        ingredientId: number;
        ingredientName: string;
        displayAmount: number;
        displayUnit: string;
        amountBase: number;
        isOptional: boolean;
      }[];
    };
    expect(body.ingredients).toEqual([
      {
        id: line.id,
        ingredientId: oliveOil.id,
        ingredientName: "Olive oil",
        displayAmount: 2,
        displayUnit: "lžíce",
        amountBase: 27.6,
        isOptional: false,
      },
    ]);
  });

  it("reports a null amount_base on an ingredient line rather than guessing", async () => {
    const recipe = await seedRecipe({ title: "Pancakes" });
    const saltToTaste = await seedIngredient({ name: "Salt", kcalPer100g: 0 });
    await seedRecipeIngredient({
      recipeId: recipe.id,
      ingredientId: saltToTaste.id,
      amountBase: null,
    });

    const res = await app.request(`/api/recipes/${recipe.id}`);
    const body = (await res.json()) as { ingredients: { amountBase: number | null }[] };
    expect(body.ingredients[0]?.amountBase).toBeNull();
  });

  it("excludes a line with no amount_base from the total", async () => {
    const recipe = await seedRecipe({ title: "Pancakes" });
    const flour = await seedIngredient({ name: "Flour", kcalPer100g: 364 });
    const saltToTaste = await seedIngredient({ name: "Salt", kcalPer100g: 0 });
    await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: flour.id, amountBase: 100 });
    await seedRecipeIngredient({
      recipeId: recipe.id,
      ingredientId: saltToTaste.id,
      amountBase: null,
    });

    const res = await app.request(`/api/recipes/${recipe.id}`);
    const body = await res.json();
    expect(body).toMatchObject({ kcalTotal: 364 });
  });
});

describe("PUT /api/recipes/:id", () => {
  it("updates servings and persists it", async () => {
    const recipe = await seedRecipe({ title: "Pancakes", servings: 2 });

    const putRes = await app.request(`/api/recipes/${recipe.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servings: 4 }),
    });
    expect(putRes.status).toBe(200);
    expect(await putRes.json()).toMatchObject({ servings: 4 });

    const getRes = await app.request(`/api/recipes/${recipe.id}`);
    expect(await getRes.json()).toMatchObject({ servings: 4 });
  });

  it("rescales kcalPerServing from the new servings without touching ingredient amounts", async () => {
    const recipe = await seedRecipe({ title: "Pancakes", servings: 2 });
    const chicken = await seedIngredient({ name: "Chicken breast", kcalPer100g: 165 });
    await seedRecipeIngredient({ recipeId: recipe.id, ingredientId: chicken.id, amountBase: 200 });

    await app.request(`/api/recipes/${recipe.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servings: 4 }),
    });

    const getRes = await app.request(`/api/recipes/${recipe.id}`);
    const body = (await getRes.json()) as {
      kcalTotal: number;
      kcalPerServing: number;
      ingredients: { amountBase: number }[];
    };
    expect(body.kcalTotal).toBe(330);
    expect(body.kcalPerServing).toBeCloseTo(82.5);
    expect(body.ingredients[0]?.amountBase).toBe(200);
  });

  it("returns 404 for an id that does not exist", async () => {
    const res = await app.request("/api/recipes/999999", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servings: 4 }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: { message: "No recipe with id 999999" } });
  });

  it("returns 422 for a non-positive servings value", async () => {
    const recipe = await seedRecipe({ title: "Pancakes" });

    const res = await app.request(`/api/recipes/${recipe.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servings: 0 }),
    });
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/recipes/:id", () => {
  it("archives the recipe instead of removing it", async () => {
    const recipe = await seedRecipe({ title: "Pancakes" });

    const deleteRes = await app.request(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(204);

    const listRes = await app.request("/api/recipes");
    expect(await listRes.json()).toEqual([]);

    const getRes = await app.request(`/api/recipes/${recipe.id}`);
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toMatchObject({ id: recipe.id, title: "Pancakes" });
  });

  it("returns 404 for an id that does not exist", async () => {
    const res = await app.request("/api/recipes/999999", { method: "DELETE" });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: { message: "No recipe with id 999999" } });
  });

  it("returns 404 when archiving an already-archived recipe", async () => {
    const recipe = await seedRecipe({ title: "Pancakes" });
    await app.request(`/api/recipes/${recipe.id}`, { method: "DELETE" });

    const res = await app.request(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/recipes", () => {
  it("creates a recipe and persists it", async () => {
    const postRes = await app.request("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Pancakes", time: 20 }),
    });
    expect(postRes.status).toBe(201);
    const created = (await postRes.json()) as { id: number };

    const getRes = await app.request(`/api/recipes/${created.id}`);
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched).toEqual(created);
  });

  it("returns 422 with field errors for an invalid body", async () => {
    const res = await app.request("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ time: -5 }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { message: string; details: unknown } };
    expect(body.error.message).toBe("Validation failed");
    expect(body.error.details).toBeDefined();
  });

  it("returns 409 for a duplicate title", async () => {
    await seedRecipe({ title: "Pancakes" });

    const res = await app.request("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Pancakes", time: 15 }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('A recipe titled "Pancakes" already exists');
  });
});
