import { expect, test } from "./fixtures.js";

const WEEK = "2026-11-16";

test("a generated preview is saved only after Accept", async ({
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
  expect((await api.get(`/api/plans/${WEEK}`)).status()).toBe(404);

  await page.getByRole("button", { name: "Accept" }).click();
  await expect(
    page.getByText("This is a preview. Nothing is saved until you accept."),
  ).toBeHidden();

  const res = await api.get(`/api/plans/${WEEK}`);
  expect(res.ok()).toBe(true);
  const week = (await res.json()) as {
    revision: number;
    slots: { day: number; mealSlot: string; recipeId: number | null }[];
  };
  const dinners = week.slots.filter((s) => s.mealSlot === "dinner");
  expect(week.revision).toBe(1);
  expect(dinners.map((s) => s.day).sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  for (const slot of dinners) expect(recipeIds).toContain(slot.recipeId);
});
