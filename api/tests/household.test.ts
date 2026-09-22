import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../src/db/index.js";
import { householdMembers, householdSettings } from "../src/db/schema.js";
import { householdRoute } from "../src/routes/household.js";
import { errorHandler } from "../src/lib/errorHandler.js";
import { confirmHouseholdShares } from "../src/services/householdShares.js";

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

  it("keeps list order stable after updating one member's target", async () => {
    const a = await seedMember({ name: "A", dinnerCalorieTarget: 500 });
    const b = await seedMember({ name: "B", dinnerCalorieTarget: 800 });

    await app.request(`/api/household/members/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dinnerCalorieTarget: 510 }),
    });

    const res = await app.request("/api/household/members");
    const body = (await res.json()) as { id: number }[];
    expect(body.map((m) => m.id)).toEqual([a.id, b.id]);
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

describe("GET /api/household/share-proposal", () => {
  it("returns the default target and no shares when there are no members", async () => {
    const res = await app.request("/api/household/share-proposal");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ targetKcal: 520, shares: [] });
  });

  it("proposes the max target and each member's derived share", async () => {
    const a = await seedMember({ name: "A", dinnerCalorieTarget: 500 });
    const b = await seedMember({ name: "B", dinnerCalorieTarget: 800 });

    const res = await app.request("/api/household/share-proposal");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      targetKcal: number;
      shares: { memberId: number; share: number }[];
    };
    expect(body.targetKcal).toBe(800);
    expect(body.shares).toEqual(
      expect.arrayContaining([
        { memberId: a.id, share: 0.75 },
        { memberId: b.id, share: 1 },
      ]),
    );
  });

  it("422s when a member has no dinner calorie target", async () => {
    await seedMember({ dinnerCalorieTarget: null });

    const res = await app.request("/api/household/share-proposal");
    expect(res.status).toBe(422);
  });
});

async function seedSettings() {
  await db.insert(householdSettings).values({ id: 1, weeklyBudgetCzk: 2500, startDayOfWeek: 1 });
}

describe("POST /api/household/confirm-shares", () => {
  it("persists the target and each member's share in one call", async () => {
    await seedSettings();
    const a = await seedMember({ name: "A", dinnerCalorieTarget: 500 });
    const b = await seedMember({ name: "B", dinnerCalorieTarget: 800 });

    const res = await app.request("/api/household/confirm-shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetKcal: 800,
        shares: [
          { memberId: a.id, share: 0.75 },
          { memberId: b.id, share: 1 },
        ],
      }),
    });
    expect(res.status).toBe(200);

    const settingsRes = await app.request("/api/household/settings");
    const settingsBody = (await settingsRes.json()) as {
      standardPortionTargetKcal: number;
      standardPortionConfirmedAt: string;
    };
    expect(settingsBody.standardPortionTargetKcal).toBe(800);
    expect(settingsBody.standardPortionConfirmedAt).not.toBeNull();

    const membersRes = await app.request("/api/household/members");
    const membersBody = (await membersRes.json()) as { id: number; confirmedShare: number }[];
    expect(membersBody.find((m) => m.id === a.id)?.confirmedShare).toBe(0.75);
    expect(membersBody.find((m) => m.id === b.id)?.confirmedShare).toBe(1);
  });

  it("422s when the target is outside the ±10% band around the current proposal", async () => {
    await seedSettings();
    const member = await seedMember({ dinnerCalorieTarget: 520 });

    const res = await app.request("/api/household/confirm-shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetKcal: 600, shares: [{ memberId: member.id, share: 1 }] }),
    });
    expect(res.status).toBe(422);
  });

  it("422s when the shares don't cover exactly the current members", async () => {
    await seedSettings();
    const a = await seedMember({ name: "A", dinnerCalorieTarget: 500 });
    await seedMember({ name: "B", dinnerCalorieTarget: 800 });

    const res = await app.request("/api/household/confirm-shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetKcal: 800, shares: [{ memberId: a.id, share: 0.75 }] }),
    });
    expect(res.status).toBe(422);
  });

  it("422s when household settings have never been configured", async () => {
    const member = await seedMember({ dinnerCalorieTarget: 520 });

    const res = await app.request("/api/household/confirm-shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetKcal: 520, shares: [{ memberId: member.id, share: 1 }] }),
    });
    expect(res.status).toBe(422);
  });

  it("rolls back the settings write when a later member write fails", async () => {
    await seedSettings();
    const a = await seedMember({ name: "A", dinnerCalorieTarget: 500 });
    const b = await seedMember({ name: "B", dinnerCalorieTarget: 800 });

    await expect(
      confirmHouseholdShares({
        targetKcal: 800,
        shares: [
          { memberId: a.id, share: 0.75 },
          { memberId: b.id, share: 10 },
        ],
      }),
    ).rejects.toThrow();

    const settingsRes = await app.request("/api/household/settings");
    const settingsBody = (await settingsRes.json()) as { standardPortionTargetKcal: number | null };
    expect(settingsBody.standardPortionTargetKcal).toBeNull();

    const membersRes = await app.request("/api/household/members");
    const membersBody = (await membersRes.json()) as {
      id: number;
      confirmedShare: number | null;
    }[];
    expect(membersBody.find((m) => m.id === a.id)?.confirmedShare).toBeNull();
  });
});
