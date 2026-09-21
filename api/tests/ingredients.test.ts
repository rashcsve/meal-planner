import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../src/db/index.js";
import { ingredients } from "../src/db/schema.js";
import { ingredientsRoute } from "../src/routes/ingredients.js";
import { errorHandler } from "../src/lib/errorHandler.js";

const app = new Hono().onError(errorHandler).route("/api/ingredients", ingredientsRoute);

afterEach(async () => {
  await db.delete(ingredients);
});

async function seedIngredient(
  overrides: Partial<{ name: string; baseUnit: string; kcalPer100g: number | null }> = {},
) {
  const [ingredient] = await db
    .insert(ingredients)
    .values({ name: "Chicken breast", baseUnit: "g", kcalPer100g: 165, ...overrides })
    .returning();
  return ingredient!;
}

describe("GET /api/ingredients", () => {
  it("returns an empty list when no ingredients exist", async () => {
    const res = await app.request("/api/ingredients");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns seeded ingredients", async () => {
    await seedIngredient({ name: "Rice" });
    await seedIngredient({ name: "Chickpeas" });

    const res = await app.request("/api/ingredients");
    const body = (await res.json()) as { name: string }[];
    expect(body.map((i) => i.name).sort()).toEqual(["Chickpeas", "Rice"]);
  });
});

describe("POST /api/ingredients", () => {
  it("creates an ingredient and returns it with a 201", async () => {
    const res = await app.request("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Oats", baseUnit: "g", kcalPer100g: 389 }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { name: string; baseUnit: string; kcalPer100g: number };
    expect(body.name).toBe("Oats");
    expect(body.baseUnit).toBe("g");
    expect(body.kcalPer100g).toBe(389);
  });

  it("creates an ingredient with no nutrition data", async () => {
    const res = await app.request("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Mystery spice", baseUnit: "g" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { kcalPer100g: number | null };
    expect(body.kcalPer100g).toBeNull();
  });

  it("409s for a duplicate name", async () => {
    await seedIngredient({ name: "Rice" });

    const res = await app.request("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Rice", baseUnit: "g" }),
    });
    expect(res.status).toBe(409);
  });

  it("409s for a duplicate name that differs only in case", async () => {
    await seedIngredient({ name: "Rice" });

    const res = await app.request("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "RICE", baseUnit: "g" }),
    });
    expect(res.status).toBe(409);
  });

  it("422s for an invalid base unit", async () => {
    const res = await app.request("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Broth", baseUnit: "cups" }),
    });
    expect(res.status).toBe(422);
  });

  it("422s for a missing name", async () => {
    const res = await app.request("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseUnit: "g" }),
    });
    expect(res.status).toBe(422);
  });
});
