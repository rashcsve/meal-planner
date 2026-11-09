import { expect, test } from "./fixtures.js";

test("an empty week offers to generate a plan", async ({ page }) => {
  await page.goto("/plan");

  await expect(page.getByText("No plan generated for this week yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate week" })).toBeEnabled();
});

test("the web app is served from the production build", async ({ request }) => {
  const html = await (await request.get("/")).text();

  expect(html).not.toContain("/@vite/client");
  expect(html).not.toContain("/src/main.tsx");
  const bundle = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
  expect(bundle, "no /assets/*.js script in index.html").toBeDefined();

  const js = await (await request.get(bundle!)).text();
  expect(js).toContain("http://localhost:3100");
});
