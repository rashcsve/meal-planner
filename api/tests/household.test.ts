import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../src/db/index.js";
import { householdMembers, householdSettings } from "../src/db/schema.js";
import { householdRoute } from "../src/routes/household.js";
import { errorHandler } from "../src/lib/errorHandler.js";

const app = new Hono().onError(errorHandler).route("/api/household", householdRoute);

afterEach(async () => {
  await db.delete(householdSettings);
  await db.delete(householdMembers);
});

async function seedMember(
  overrides: Partial<{
    name: string;
    dailyCalorieTarget: number;
    dinnerCalorieTarget: number | null;
  }> = {},
) {
  const [member] = await db
    .insert(householdMembers)
    .values({ name: "Svetlana", dailyCalorieTarget: 1500, ...overrides })
    .returning();
  return member!;
}

describe("GET /api/household/settings", () => {
  it("returns null when household settings have never been set", async () => {
    const res = await app.request("/api/household/settings");
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });
});

describe("PUT /api/household/settings", () => {
  it("persists settings and returns them on a later GET", async () => {
    const putRes = await app.request("/api/household/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyBudgetCzk: 2500, startDayOfWeek: 1, timezone: "Europe/Prague" }),
    });
    expect(putRes.status).toBe(200);
    const putBody = (await putRes.json()) as { timezone: string };
    expect(putBody.timezone).toBe("Europe/Prague");

    const getRes = await app.request("/api/household/settings");
    const getBody = (await getRes.json()) as { weeklyBudgetCzk: number; startDayOfWeek: number };
    expect(getBody.weeklyBudgetCzk).toBe(2500);
    expect(getBody.startDayOfWeek).toBe(1);
  });

  it("rejects a negative weekly budget with 422", async () => {
    const res = await app.request("/api/household/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyBudgetCzk: -1, startDayOfWeek: 1, timezone: "Europe/Prague" }),
    });
    expect(res.status).toBe(422);
  });
});

describe("GET /api/household/members", () => {
  it("returns an empty list when no members exist", async () => {
    const res = await app.request("/api/household/members");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns seeded members", async () => {
    await seedMember({ name: "Svetlana" });
    await seedMember({ name: "Partner" });

    const res = await app.request("/api/household/members");
    const body = (await res.json()) as { name: string }[];
    expect(body.map((m) => m.name).sort()).toEqual(["Partner", "Svetlana"]);
  });
});

describe("PUT /api/household/members/:id", () => {
  it("updates the dinner calorie target", async () => {
    const member = await seedMember({ dinnerCalorieTarget: null });

    const res = await app.request(`/api/household/members/${member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dinnerCalorieTarget: 600 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { dinnerCalorieTarget: number };
    expect(body.dinnerCalorieTarget).toBe(600);
  });

  it("404s for an id that doesn't exist", async () => {
    const res = await app.request("/api/household/members/999999", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dinnerCalorieTarget: 600 }),
    });
    expect(res.status).toBe(404);
  });

  it("400s for a non-numeric id param", async () => {
    const res = await app.request("/api/household/members/not-a-number", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dinnerCalorieTarget: 600 }),
    });
    expect(res.status).toBe(400);
  });

  it("422s for a non-positive dinner calorie target", async () => {
    const member = await seedMember();

    const res = await app.request(`/api/household/members/${member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dinnerCalorieTarget: 0 }),
    });
    expect(res.status).toBe(422);
  });
});
