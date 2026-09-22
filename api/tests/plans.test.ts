import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../src/db/index.js";
import {
  recipes,
  ingredients,
  recipeIngredients,
  householdMembers,
  householdSettings,
  ingredientPrices,
  planWeeks,
  planSlots,
} from "../src/db/schema.js";
import { plansRoute } from "../src/routes/plans.js";
import { errorHandler } from "../src/lib/errorHandler.js";

const app = new Hono().onError(errorHandler).route("/api/plans", plansRoute);

afterEach(async () => {
  await db.delete(planSlots);
  await db.delete(planWeeks);
  await db.delete(ingredientPrices);
  await db.delete(householdSettings);
  await db.delete(householdMembers);
  await db.delete(recipeIngredients);
  await db.delete(recipes);
  await db.delete(ingredients);
});

// Just enough for generatePlan to succeed; planner.test.ts covers feasibility and scoring.
// Two dinner recipes exist so replaceSlot/candidates tests can swap between
// them: dinnerRecipe (400 kcal/serving, no promo) and dinnerRecipe2 (800
// kcal/serving, its ingredient on promo) give distinct, hand-checkable
// memberServings/reasons depending on which one a test picks.
async function seedPlannableHousehold(dinnerCalorieTarget: number | null = 400) {
  const [lunchIngredient] = await db
    .insert(ingredients)
    .values({ name: "Lunch base", baseUnit: "g", kcalPer100g: 500 })
    .returning();
  const [dinnerIngredient] = await db
    .insert(ingredients)
    .values({ name: "Dinner base", baseUnit: "g", kcalPer100g: 400 })
    .returning();
  const [dinnerIngredient2] = await db
    .insert(ingredients)
    .values({ name: "Dinner base 2", baseUnit: "g", kcalPer100g: 800 })
    .returning();

  const [lunchRecipe] = await db
    .insert(recipes)
    .values({ title: "Test lunch", time: 20, cost: 100, meal: "lunch", servings: 1 })
    .returning();
  const [dinnerRecipe] = await db
    .insert(recipes)
    .values({ title: "Test dinner", time: 20, cost: 100, meal: "dinner", servings: 1 })
    .returning();
  const [dinnerRecipe2] = await db
    .insert(recipes)
    .values({ title: "Test dinner 2", time: 20, cost: 100, meal: "dinner", servings: 1 })
    .returning();

  await db.insert(recipeIngredients).values([
    {
      recipeId: lunchRecipe!.id,
      ingredientId: lunchIngredient!.id,
      amountBase: 100,
      isOptional: false,
    },
    {
      recipeId: dinnerRecipe!.id,
      ingredientId: dinnerIngredient!.id,
      amountBase: 100,
      isOptional: false,
    },
    {
      recipeId: dinnerRecipe2!.id,
      ingredientId: dinnerIngredient2!.id,
      amountBase: 100,
      isOptional: false,
    },
  ]);

  const [member] = await db
    .insert(householdMembers)
    .values({ name: "Tester", dailyCalorieTarget: 900, dinnerCalorieTarget })
    .returning();
  await db.insert(householdSettings).values({ id: 1, weeklyBudgetCzk: 5000, startDayOfWeek: 1 });
  await db.insert(ingredientPrices).values([
    {
      ingredientId: lunchIngredient!.id,
      store: "Store",
      amount: 1,
      unit: "g",
      price: 10,
      validFrom: "2020-01-01",
    },
    {
      ingredientId: dinnerIngredient!.id,
      store: "Store",
      amount: 1,
      unit: "g",
      price: 10,
      validFrom: "2020-01-01",
    },
    {
      ingredientId: dinnerIngredient2!.id,
      store: "Store",
      amount: 1,
      unit: "g",
      price: 10,
      validFrom: "2020-01-01",
      isPromo: true,
    },
  ]);

  return {
    lunchRecipe: lunchRecipe!,
    dinnerRecipe: dinnerRecipe!,
    dinnerRecipe2: dinnerRecipe2!,
    member: member!,
  };
}

async function seedPlanWeek(overrides: Partial<{ weekStartDate: string; revision: number }> = {}) {
  const [week] = await db
    .insert(planWeeks)
    .values({
      weekStartDate: "2026-01-05",
      seed: 1,
      plannerVersion: "test",
      revision: 1,
      ...overrides,
    })
    .returning();
  return week!;
}

async function seedPlanSlot(
  planWeekId: number,
  overrides: Partial<{
    day: number;
    mealSlot: "lunch" | "dinner";
    recipeId: number | null;
    locked: boolean;
  }> = {},
) {
  const [slot] = await db
    .insert(planSlots)
    .values({
      planWeekId,
      day: 0,
      mealSlot: "lunch",
      recipeId: null,
      locked: false,
      reasons: [],
      ...overrides,
    })
    .returning();
  return slot!;
}

function postJson(url: string, body: unknown) {
  return app.request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function putJson(url: string, body: unknown) {
  return app.request(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteJson(url: string, body: unknown) {
  return app.request(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("revision contract", () => {
  it("requires expectedRevision to lock, unlock or replace a slot", async () => {
    const week = await seedPlanWeek();
    await seedPlanSlot(week.id, { day: 0, mealSlot: "lunch" });

    const lockRes = await putJson(`/api/plans/${week.weekStartDate}/slots/0/lunch/lock`, {});
    expect(lockRes.status).toBe(422);

    const unlockRes = await deleteJson(`/api/plans/${week.weekStartDate}/slots/0/lunch/lock`, {});
    expect(unlockRes.status).toBe(422);

    const replaceRes = await putJson(`/api/plans/${week.weekStartDate}/slots/0/lunch`, {
      recipeId: 1,
    });
    expect(replaceRes.status).toBe(422);
  });

  it("rejects a regenerate against an existing plan with no expectedRevision", async () => {
    await seedPlannableHousehold();
    const week = await seedPlanWeek();
    const res = await postJson("/api/plans/generate", {
      weekStartDate: week.weekStartDate,
      seed: 2,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string; details?: { code?: string } } };
    expect(body.error.details?.code).toBe("EXPECTED_REVISION_REQUIRED");
    expect(body.error.message).toContain("expectedRevision");
    expect(body.error.message).not.toContain("-1");

    const getRes = await app.request(`/api/plans/${week.weekStartDate}`);
    const getBody = (await getRes.json()) as { revision: number; seed: number };
    expect(getBody.revision).toBe(1);
    expect(getBody.seed).toBe(1);
  });

  it("rejects a malformed expectedRevision as a validation error, not a conflict", async () => {
    await seedPlannableHousehold();
    const week = await seedPlanWeek();

    const zero = await postJson("/api/plans/generate", {
      weekStartDate: week.weekStartDate,
      seed: 2,
      expectedRevision: 0,
    });
    expect(zero.status).toBe(400);

    const notInteger = await postJson("/api/plans/generate", {
      weekStartDate: week.weekStartDate,
      seed: 2,
      expectedRevision: 1.5,
    });
    expect(notInteger.status).toBe(400);
    const body = (await notInteger.json()) as { error: { message: string } };
    expect(body.error.message).toBe("Validation failed");

    const getRes = await app.request(`/api/plans/${week.weekStartDate}`);
    const getBody = (await getRes.json()) as { revision: number; seed: number };
    expect(getBody.revision).toBe(1);
    expect(getBody.seed).toBe(1);
  });

  it("returns the new revision from a successful lock", async () => {
    const week = await seedPlanWeek({ revision: 1 });
    await seedPlanSlot(week.id, { day: 0, mealSlot: "lunch" });

    const res = await putJson(`/api/plans/${week.weekStartDate}/slots/0/lunch/lock`, {
      expectedRevision: 1,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { locked: boolean; revision: number };
    expect(body).toMatchObject({ locked: true, revision: 2 });
  });
});

describe("stale mutations", () => {
  it("rejects a lock with a stale revision and does not apply it", async () => {
    const week = await seedPlanWeek({ revision: 3 });
    await seedPlanSlot(week.id, { day: 0, mealSlot: "lunch", locked: false });

    const res = await putJson(`/api/plans/${week.weekStartDate}/slots/0/lunch/lock`, {
      expectedRevision: 1,
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { details?: { code?: string } } };
    expect(body.error.details?.code).toBe("STALE_PLAN_REVISION");

    const getRes = await app.request(`/api/plans/${week.weekStartDate}`);
    const getBody = (await getRes.json()) as { revision: number; slots: { locked: boolean }[] };
    expect(getBody.revision).toBe(3);
    expect(getBody.slots[0]!.locked).toBe(false);
  });

  it("leaves no partial change when the slot write fails after the revision check", async () => {
    const week = await seedPlanWeek({ revision: 1 });
    await seedPlanSlot(week.id, { day: 0, mealSlot: "lunch" });

    const res = await putJson(`/api/plans/${week.weekStartDate}/slots/0/lunch`, {
      recipeId: 999_999,
      expectedRevision: 1,
    });
    expect(res.status).toBe(404);

    const getRes = await app.request(`/api/plans/${week.weekStartDate}`);
    const getBody = (await getRes.json()) as { revision: number };
    // The FK failure on the slot write must roll back the CAS too, not just fail to report it.
    expect(getBody.revision).toBe(1);
  });

  it("does not let a regeneration overwrite a lock made after its snapshot", async () => {
    await seedPlannableHousehold();
    const generateRes = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 1,
    });
    expect(generateRes.status).toBe(200);
    const generated = (await generateRes.json()) as {
      revision: number;
      slots: { day: number; mealSlot: string; recipeId: number | null }[];
    };
    expect(generated.revision).toBe(1);
    // Either seeded dinner recipe is a valid pick; lock preservation is what
    // this test checks, not which one the planner scored higher.
    const assignedRecipeId = generated.slots.find(
      (s) => s.day === 0 && s.mealSlot === "dinner",
    )!.recipeId;

    const lockRes = await putJson("/api/plans/2026-01-05/slots/0/dinner/lock", {
      expectedRevision: 1,
    });
    expect(lockRes.status).toBe(200);

    // Simulates a client regenerating from revision 1, taken before the lock above.
    const staleRegenRes = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 2,
      expectedRevision: 1,
    });
    expect(staleRegenRes.status).toBe(409);
    const staleBody = (await staleRegenRes.json()) as { error: { details?: { code?: string } } };
    expect(staleBody.error.details?.code).toBe("STALE_PLAN_REVISION");

    const getRes = await app.request("/api/plans/2026-01-05");
    const getBody = (await getRes.json()) as {
      revision: number;
      seed: number;
      slots: { day: number; mealSlot: string; locked: boolean; recipeId: number | null }[];
    };
    expect(getBody.revision).toBe(2);
    expect(getBody.seed).toBe(1);
    const lockedSlot = getBody.slots.find((s) => s.day === 0 && s.mealSlot === "dinner");
    expect(lockedSlot).toMatchObject({ locked: true, recipeId: assignedRecipeId });
  });
});

describe("concurrent mutations", () => {
  it("lets only one of two same-revision locks succeed", async () => {
    const week = await seedPlanWeek({ revision: 1 });
    await seedPlanSlot(week.id, { day: 0, mealSlot: "lunch" });
    await seedPlanSlot(week.id, { day: 1, mealSlot: "lunch" });

    const [resA, resB] = await Promise.all([
      putJson(`/api/plans/${week.weekStartDate}/slots/0/lunch/lock`, { expectedRevision: 1 }),
      putJson(`/api/plans/${week.weekStartDate}/slots/1/lunch/lock`, { expectedRevision: 1 }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    // Deterministic, not flaky: Postgres row locking guarantees only one of
    // two same-WHERE UPDATEs on the same row can win.
    expect(statuses).toEqual([200, 409]);

    const getRes = await app.request(`/api/plans/${week.weekStartDate}`);
    const getBody = (await getRes.json()) as {
      revision: number;
      slots: { day: number; locked: boolean }[];
    };
    expect(getBody.revision).toBe(2);
    const lockedSlots = getBody.slots.filter((s) => s.locked);
    expect(lockedSlots).toHaveLength(1);
  });

  it("never silently loses a lock raced against a regeneration", async () => {
    await seedPlannableHousehold();
    const generateRes = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 1,
    });
    const generated = (await generateRes.json()) as { revision: number };
    expect(generated.revision).toBe(1);

    const [lockRes, regenRes] = await Promise.all([
      putJson("/api/plans/2026-01-05/slots/0/dinner/lock", { expectedRevision: 1 }),
      postJson("/api/plans/generate", {
        weekStartDate: "2026-01-05",
        seed: 2,
        expectedRevision: 1,
      }),
    ]);

    const statuses = [lockRes.status, regenRes.status].sort();
    expect(statuses).toEqual([200, 409]);

    const getRes = await app.request("/api/plans/2026-01-05");
    const getBody = (await getRes.json()) as {
      revision: number;
      slots: { day: number; mealSlot: string; locked: boolean }[];
    };
    expect(getBody.revision).toBe(2);
    const slot = getBody.slots.find((s) => s.day === 0 && s.mealSlot === "dinner")!;

    if (lockRes.status === 200) {
      // Lock committed first: must survive, not get overwritten by the rejected regen.
      expect(slot.locked).toBe(true);
    } else {
      // Regen committed first: the lock request is told to retry, not silently dropped.
      expect(slot.locked).toBe(false);
    }
  });
});

describe("existing behaviour preserved", () => {
  it("still rejects concurrent initial creation of the same week via the unique constraint", async () => {
    await seedPlannableHousehold();

    const [resA, resB] = await Promise.all([
      postJson("/api/plans/generate", { weekStartDate: "2026-01-05", seed: 1 }),
      postJson("/api/plans/generate", { weekStartDate: "2026-01-05", seed: 2 }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  it("still preserves a locked slot across regeneration with a valid revision", async () => {
    await seedPlannableHousehold();
    const generateRes = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 1,
    });
    const generated = (await generateRes.json()) as {
      revision: number;
      slots: { day: number; mealSlot: string; recipeId: number | null }[];
    };
    const assignedRecipeId = generated.slots.find(
      (s) => s.day === 0 && s.mealSlot === "dinner",
    )!.recipeId;

    const lockRes = await putJson("/api/plans/2026-01-05/slots/0/dinner/lock", {
      expectedRevision: generated.revision,
    });
    const locked = (await lockRes.json()) as { revision: number };

    const regenRes = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 3,
      expectedRevision: locked.revision,
    });
    expect(regenRes.status).toBe(200);

    const getRes = await app.request("/api/plans/2026-01-05");
    const getBody = (await getRes.json()) as {
      slots: { day: number; mealSlot: string; locked: boolean; recipeId: number | null }[];
    };
    const slot = getBody.slots.find((s) => s.day === 0 && s.mealSlot === "dinner");
    expect(slot).toMatchObject({ locked: true, recipeId: assignedRecipeId });
  });
});

describe("household configuration", () => {
  it("rejects generation with 422 when a household member has no dinner calorie target", async () => {
    await seedPlannableHousehold(null);

    const res = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 1,
    });

    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toContain("dinner calorie target");
  });
});

describe("member servings persistence", () => {
  it("persists each member's servings and returns them from generate and a subsequent GET", async () => {
    const { dinnerRecipe, member } = await seedPlannableHousehold();
    const generateRes = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 1,
    });
    const generated = (await generateRes.json()) as {
      slots: {
        day: number;
        mealSlot: string;
        recipeId: number | null;
        memberServings: { memberId: number; servings: number }[];
      }[];
    };
    const generatedDinner = generated.slots.find((s) => s.day === 0 && s.mealSlot === "dinner")!;
    // dinnerIngredient is 400 kcal/100g, dinnerIngredient2 is 800 kcal/100g
    // (both recipes use 100g, so that's kcal/serving); the seeded member's
    // dinnerCalorieTarget is 400, so exactly 1 serving of dinnerRecipe or
    // 0.5 of dinnerRecipe2, whichever the planner picked.
    const expectedServings = generatedDinner.recipeId === dinnerRecipe.id ? 1 : 0.5;
    expect(generatedDinner.memberServings).toEqual([
      { memberId: member.id, servings: expectedServings },
    ]);

    const getRes = await app.request("/api/plans/2026-01-05");
    const getBody = (await getRes.json()) as {
      slots: {
        day: number;
        mealSlot: string;
        memberServings: { memberId: number; servings: number }[];
      }[];
    };
    const fetchedDinner = getBody.slots.find((s) => s.day === 0 && s.mealSlot === "dinner")!;
    expect(fetchedDinner.memberServings).toEqual([
      { memberId: member.id, servings: expectedServings },
    ]);
  });

  it("recomputes memberServings and reasons for the newly assigned recipe, not the old one", async () => {
    const { dinnerRecipe, dinnerRecipe2, member } = await seedPlannableHousehold();
    const generateRes = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 1,
    });
    const generated = (await generateRes.json()) as {
      revision: number;
      slots: { day: number; mealSlot: string; recipeId: number | null }[];
    };
    const assignedId = generated.slots.find(
      (s) => s.day === 0 && s.mealSlot === "dinner",
    )!.recipeId!;
    // Swap to whichever of the two dinner recipes the planner didn't already
    // pick, so this test exercises a real change, not a no-op reassignment.
    const target = assignedId === dinnerRecipe.id ? dinnerRecipe2 : dinnerRecipe;
    // dinnerIngredient is 400 kcal/100g (no promo), dinnerIngredient2 is 800
    // kcal/100g (on promo) - both recipes use 100g, so calories/serving equal
    // the ingredient's kcalPer100g. Member target is 400 (seedPlannableHousehold's default).
    const expectedServings = target.id === dinnerRecipe.id ? 1 : 0.5;
    const expectedReasons =
      target.id === dinnerRecipe2.id ? ["promo: Dinner base 2 on sale at Store"] : [];

    const replaceRes = await putJson("/api/plans/2026-01-05/slots/0/dinner", {
      recipeId: target.id,
      expectedRevision: generated.revision,
    });
    expect(replaceRes.status).toBe(200);
    const replaced = (await replaceRes.json()) as {
      recipeId: number;
      reasons: string[];
      memberServings: { memberId: number; servings: number }[];
    };
    expect(replaced.recipeId).toBe(target.id);
    expect(replaced.memberServings).toEqual([{ memberId: member.id, servings: expectedServings }]);
    expect(replaced.reasons).toEqual(expectedReasons);

    const getRes = await app.request("/api/plans/2026-01-05");
    const getBody = (await getRes.json()) as {
      slots: { day: number; mealSlot: string; memberServings: unknown[] }[];
    };
    const slot = getBody.slots.find((s) => s.day === 0 && s.mealSlot === "dinner")!;
    expect(slot.memberServings).toEqual([{ memberId: member.id, servings: expectedServings }]);
  });
});

describe("slot replacement validation", () => {
  it("rejects replacing a locked slot, requiring an explicit unlock first", async () => {
    const { dinnerRecipe2 } = await seedPlannableHousehold();
    const generateRes = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 1,
    });
    const generated = (await generateRes.json()) as { revision: number };

    const lockRes = await putJson("/api/plans/2026-01-05/slots/0/dinner/lock", {
      expectedRevision: generated.revision,
    });
    const locked = (await lockRes.json()) as { revision: number };

    const replaceRes = await putJson("/api/plans/2026-01-05/slots/0/dinner", {
      recipeId: dinnerRecipe2.id,
      expectedRevision: locked.revision,
    });
    expect(replaceRes.status).toBe(409);
    const body = (await replaceRes.json()) as { error: { details?: { code?: string } } };
    expect(body.error.details?.code).toBe("SLOT_LOCKED");

    const getRes = await app.request("/api/plans/2026-01-05");
    const getBody = (await getRes.json()) as { revision: number };
    // A rejected replace must not bump the revision either.
    expect(getBody.revision).toBe(locked.revision);
  });

  it("rejects replacing a dinner slot with a recipe of the wrong meal type", async () => {
    const { lunchRecipe } = await seedPlannableHousehold();
    const generateRes = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 1,
    });
    const generated = (await generateRes.json()) as { revision: number };

    const replaceRes = await putJson("/api/plans/2026-01-05/slots/0/dinner", {
      recipeId: lunchRecipe.id,
      expectedRevision: generated.revision,
    });
    expect(replaceRes.status).toBe(422);
    const body = (await replaceRes.json()) as {
      error: { message: string; details?: { code?: string } };
    };
    expect(body.error.details?.code).toBe("RECIPE_NOT_ELIGIBLE");
    expect(body.error.message).toContain("meal type");
  });

  it("rejects a replace with a stale revision without writing anything", async () => {
    const { dinnerRecipe2 } = await seedPlannableHousehold();
    const generateRes = await postJson("/api/plans/generate", {
      weekStartDate: "2026-01-05",
      seed: 1,
    });
    const generated = (await generateRes.json()) as { revision: number };

    const replaceRes = await putJson("/api/plans/2026-01-05/slots/0/dinner", {
      recipeId: dinnerRecipe2.id,
      expectedRevision: generated.revision + 1,
    });
    expect(replaceRes.status).toBe(409);
    const body = (await replaceRes.json()) as { error: { details?: { code?: string } } };
    expect(body.error.details?.code).toBe("STALE_PLAN_REVISION");

    const getRes = await app.request("/api/plans/2026-01-05");
    const getBody = (await getRes.json()) as { revision: number };
    expect(getBody.revision).toBe(generated.revision);
  });
});

describe("slot candidates", () => {
  it("returns only recipes eligible for the slot, best-scoring first", async () => {
    const { dinnerRecipe, dinnerRecipe2 } = await seedPlannableHousehold();
    await postJson("/api/plans/generate", { weekStartDate: "2026-01-05", seed: 1 });

    const res = await app.request("/api/plans/2026-01-05/slots/0/dinner/candidates");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      candidates: { recipeId: number; memberServings: unknown[] }[];
    };

    const ids = body.candidates.map((c) => c.recipeId);
    expect(ids).toContain(dinnerRecipe.id);
    expect(ids).toContain(dinnerRecipe2.id);
    expect(ids).toHaveLength(2); // the lunch-only recipe is excluded
    // dinnerRecipe2's ingredient is on promo, giving it a higher scoreSlot.
    expect(body.candidates[0]!.recipeId).toBe(dinnerRecipe2.id);
  });

  it("404s for a week with no plan yet", async () => {
    const res = await app.request("/api/plans/2026-01-05/slots/0/dinner/candidates");
    expect(res.status).toBe(404);
  });
});
