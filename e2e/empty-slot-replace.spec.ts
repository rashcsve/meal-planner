import { expect, test } from "./fixtures.js";

const WEEK = "2026-11-16";

type Slot = { day: number; mealSlot: string; recipeId: number | null };

test("choosing a recipe in the picker fills an empty slot and saves it", async ({
  page,
  api,
  seedPlannableHousehold,
}) => {
  const { recipeIds } = await seedPlannableHousehold();
  const preview = await (
    await api.post("/api/plans/generate/preview", { data: { weekStartDate: WEEK, seed: 1 } })
  ).json();
  const accepted = await api.post("/api/plans/accept", {
    data: {
      weekStartDate: WEEK,
      seed: preview.seed,
      baseRevision: preview.baseRevision,
      inputVersions: preview.inputVersions,
      slots: preview.slots.map((s: Slot) => ({
        day: s.day,
        mealSlot: s.mealSlot,
        recipeId: s.day === 0 && s.mealSlot === "dinner" ? null : s.recipeId,
      })),
    },
  });
  expect(accepted.ok(), await accepted.text()).toBe(true);
  const before = await (await api.get(`/api/plans/${WEEK}`)).json();

  await page.goto(`/week?start=${WEEK}`);
  await page.getByRole("button").filter({ hasText: "No recipe assigned" }).click();
  await page.getByRole("link", { name: "See all options" }).click();
  await expect(page.getByText("No recipe assigned for this day.")).toBeVisible();

  const choice = page.getByRole("listitem").getByRole("button").first();
  const chosenTitle = (await choice.locator("span").first().textContent()) ?? "";
  await choice.click();
  await expect(page).toHaveURL(new RegExp(`/week\\?start=${WEEK}$`));
  await expect(page.getByText("No recipe assigned")).toHaveCount(0);

  const after = await (await api.get(`/api/plans/${WEEK}`)).json();
  expect(after.revision).toBe(before.revision + 1);
  const filled = after.slots.find((s: Slot) => s.day === 0 && s.mealSlot === "dinner");
  expect(recipeIds).toContain(filled.recipeId);
  expect(filled.recipeSnapshot.title).toBe(chosenTitle);
});
