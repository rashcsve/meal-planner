import { describe, expect, it } from "vitest";
import { computeKcalPerServing, summarizeKcal } from "../src/services/nutrition.js";

describe("summarizeKcal", () => {
  it("sums amount_base / 100 * kcal_per_100g across lines", () => {
    const result = summarizeKcal([
      { amountBase: 200, kcalPer100g: 165, baseUnit: "g" }, // 330
      { amountBase: 50, kcalPer100g: 350, baseUnit: "g" }, // 175
    ]);
    expect(result).toEqual({ kcalTotal: 505, status: "complete" });
  });

  it("includes optional ingredients the same as required ones", () => {
    // summarizeKcal never sees isOptional at all — every resolved line counts
    const result = summarizeKcal([{ amountBase: 100, kcalPer100g: 200, baseUnit: "g" }]);
    expect(result).toEqual({ kcalTotal: 200, status: "complete" });
  });

  it("treats a null amount_base as contributing nothing", () => {
    const result = summarizeKcal([{ amountBase: null, kcalPer100g: 165, baseUnit: "g" }]);
    expect(result).toEqual({ kcalTotal: 0, status: "unknown" });
  });

  it("treats a missing ingredient kcal figure as contributing nothing, not zero", () => {
    const result = summarizeKcal([{ amountBase: 200, kcalPer100g: null, baseUnit: "g" }]);
    expect(result).toEqual({ kcalTotal: 0, status: "unknown" });
  });

  it("sums only the computable lines, skipping the rest", () => {
    const result = summarizeKcal([
      { amountBase: 200, kcalPer100g: 165, baseUnit: "g" }, // 330, computable
      { amountBase: null, kcalPer100g: 165, baseUnit: "g" }, // skipped
      { amountBase: 100, kcalPer100g: null, baseUnit: "g" }, // skipped
    ]);
    expect(result).toEqual({ kcalTotal: 330, status: "partial" });
  });

  it("returns zero total for no lines", () => {
    expect(summarizeKcal([])).toEqual({ kcalTotal: 0, status: "complete" });
  });

  it("does not treat an ml ingredient's figure as gram-equivalent", () => {
    const result = summarizeKcal([{ amountBase: 100, kcalPer100g: 50, baseUnit: "ml" }]);
    expect(result).toEqual({ kcalTotal: 0, status: "unknown" });
  });

  it("does not treat a pcs ingredient's figure as gram-equivalent", () => {
    const result = summarizeKcal([{ amountBase: 3, kcalPer100g: 70, baseUnit: "pcs" }]);
    expect(result).toEqual({ kcalTotal: 0, status: "unknown" });
  });

  it("reports partial when a gram line is computable but an ml line is not", () => {
    const result = summarizeKcal([
      { amountBase: 200, kcalPer100g: 165, baseUnit: "g" }, // 330, computable
      { amountBase: 100, kcalPer100g: 50, baseUnit: "ml" }, // not gram-based, skipped
    ]);
    expect(result).toEqual({ kcalTotal: 330, status: "partial" });
  });
});

describe("computeKcalPerServing", () => {
  it("divides the total by servings", () => {
    expect(computeKcalPerServing(800, 4)).toBe(200);
  });

  it("returns null when servings is null", () => {
    expect(computeKcalPerServing(800, null)).toBeNull();
  });

  it("returns null instead of dividing by zero", () => {
    expect(computeKcalPerServing(800, 0)).toBeNull();
  });
});
