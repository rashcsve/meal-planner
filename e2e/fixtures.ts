import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { Pool } from "pg";

const API_URL = "http://localhost:3100";
const TABLES = [
  "plan_slots",
  "plan_weeks",
  "ingredient_prices",
  "ingredient_preferences",
  "pantry_items",
  "recipe_ingredients",
  "recipes",
  "unit_conversions",
  "ingredients",
  "household_members",
  "household_settings",
];

async function send<T>(api: APIRequestContext, method: "post" | "put", url: string, data: object) {
  const res = await api[method](url, { data });
  expect(res.ok(), `${method.toUpperCase()} ${url}: ${res.status()} ${await res.text()}`).toBe(
    true,
  );
  return (await res.json()) as T;
}

export const test = base.extend<{
  db: Pool;
  api: APIRequestContext;
  seedPlannableHousehold: () => Promise<{ recipeIds: number[] }>;
}>({
  db: [
    async ({}, use) => {
      const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL });
      await pool.query(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
      await use(pool);
      await pool.end();
    },
    { auto: true },
  ],
  api: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({ baseURL: API_URL });
    await use(api);
    await api.dispose();
  },
  seedPlannableHousehold: async ({ api, db }, use) => {
    await use(async () => {
      await send(api, "put", "/api/household/settings", {
        weeklyBudgetCzk: 5000,
        startDayOfWeek: 1,
        timezone: "Europe/Prague",
      });
      await db.query(
        "INSERT INTO household_members (name, daily_calorie_target, dinner_calorie_target) VALUES ('Tester', 2000, 600)",
      );
      const ingredient = await send<{ id: number }>(api, "post", "/api/ingredients", {
        name: "Dinner base",
        baseUnit: "g",
        kcalPer100g: 400,
      });
      const recipeIds: number[] = [];
      for (let i = 1; i <= 7; i++) {
        const recipe = await send<{ id: number }>(api, "post", "/api/recipes", {
          title: `Dinner ${i}`,
          time: 20,
          cost: 100,
          meal: "dinner",
          servings: 1,
        });
        await send(api, "post", `/api/recipes/${recipe.id}/ingredients`, {
          ingredientId: ingredient.id,
          amountBase: 150,
        });
        recipeIds.push(recipe.id);
      }
      return { recipeIds };
    });
  },
});

export { expect };
