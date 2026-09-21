import { describe, expect, it } from "vitest";
import { scaleToServings } from "shared";

describe("scaleToServings", () => {
  it("scales an amount from a recipe's base yield to the total servings needed", () => {
    // r01-fixtures.md §2: baseServings 4, rice amountBase 200g, totalServings 3.25
    expect(scaleToServings(200, 4, 3.25)).toBe(162.5);
  });

  it("returns the original amount unchanged when totalServings equals baseServings", () => {
    expect(scaleToServings(400, 4, 4)).toBe(400);
  });

  it("scales cost the same way as ingredient amounts", () => {
    // matches validateWeeklyBudget's own worked example in planner.ts
    expect(scaleToServings(400, 4, 2.25)).toBe(225);
  });
});
