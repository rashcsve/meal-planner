import { expect, test } from "./fixtures.js";

test("an empty week offers to generate a plan", async ({ page }) => {
  await page.goto("/week");

  await expect(page.getByText("No plan generated for this week yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate week" })).toBeEnabled();
});
