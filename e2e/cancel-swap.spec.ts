import { expect, test } from "./fixtures.js";

const WEEK = "2026-11-16";

test("Cancel in the swap picker leaves the saved week untouched", async ({
  page,
  api,
  seedPlannableHousehold,
}) => {
  await seedPlannableHousehold();
  const preview = await (
    await api.post("/api/plans/generate/preview", { data: { weekStartDate: WEEK, seed: 1 } })
  ).json();
  const accepted = await api.post("/api/plans/accept", {
    data: {
      weekStartDate: WEEK,
      seed: preview.seed,
      baseRevision: preview.baseRevision,
      inputVersions: preview.inputVersions,
      slots: preview.slots.map((s: { day: number; mealSlot: string; recipeId: number | null }) => ({
        day: s.day,
        mealSlot: s.mealSlot,
        recipeId: s.recipeId,
      })),
    },
  });
  expect(accepted.ok(), await accepted.text()).toBe(true);
  const before = await (await api.get(`/api/plans/${WEEK}`)).json();
  const firstDinner = before.slots.find(
    (s: { day: number; mealSlot: string }) => s.day === 0 && s.mealSlot === "dinner",
  );

  await page.goto(`/week?start=${WEEK}`);
  await page
    .getByRole("button")
    .filter({ hasText: firstDinner.recipeSnapshot.title })
    .first()
    .click();
  await page.getByRole("link", { name: "See all options" }).click();
  await expect(page.getByRole("heading", { name: "Swap meal" })).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(new RegExp(`/week\\?start=${WEEK}$`));

  const after = await (await api.get(`/api/plans/${WEEK}`)).json();
  expect(after.revision).toBe(before.revision);
  expect(after.slots).toEqual(before.slots);
});
