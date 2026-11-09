import { expect, test } from "./fixtures.js";

const WEEK = "2026-11-16";

test("an input change before Accept asks for a new preview, and the second Accept saves", async ({
  page,
  api,
  seedPlannableHousehold,
}) => {
  const { recipeIds } = await seedPlannableHousehold();
  await page.goto(`/plan?start=${WEEK}`);

  await page.getByRole("button", { name: "Generate week" }).click();
  await expect(
    page.getByText("This is a preview. Nothing is saved until you accept."),
  ).toBeVisible();

  const changed = await api.put("/api/household/settings", {
    data: { weeklyBudgetCzk: 4000, startDayOfWeek: 1, timezone: "Europe/Prague" },
  });
  expect(changed.ok(), await changed.text()).toBe(true);

  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByRole("button", { name: "Preview again" })).toBeVisible();
  expect((await api.get(`/api/plans/${WEEK}`)).status()).toBe(404);

  await page.getByRole("button", { name: "Preview again" }).click();
  await expect(
    page.getByText("This is a preview. Nothing is saved until you accept."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(
    page.getByText("This is a preview. Nothing is saved until you accept."),
  ).toBeHidden();

  const res = await api.get(`/api/plans/${WEEK}`);
  expect(res.ok()).toBe(true);
  const week = (await res.json()) as {
    revision: number;
    slots: { mealSlot: string; recipeId: number | null }[];
  };
  expect(week.revision).toBe(1);
  const dinners = week.slots.filter((s) => s.mealSlot === "dinner");
  expect(dinners).toHaveLength(7);
  for (const slot of dinners) expect(recipeIds).toContain(slot.recipeId);
});
