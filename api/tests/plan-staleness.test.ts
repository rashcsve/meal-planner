import { describe, expect, it } from "vitest";
import { evaluateStaleness } from "../src/services/plan-staleness.js";

const T1 = new Date("2026-09-01T10:00:00Z");
const T2 = new Date("2026-09-02T10:00:00Z");
const versions = (r: Date | null, t: Date | null, e: Date | null) => ({
  recipesVersionAt: r,
  targetsVersionAt: t,
  exclusionsVersionAt: e,
});

describe("evaluateStaleness", () => {
  it("is not_evaluated for a week with no stored evaluation", () => {
    expect(evaluateStaleness(false, versions(null, null, null), versions(T2, T2, T2))).toEqual({
      status: "not_evaluated",
      staleInputs: [],
    });
  });

  it("is current when no live watermark is newer, including null on both sides", () => {
    expect(evaluateStaleness(true, versions(T1, T2, null), versions(T1, T1, null))).toEqual({
      status: "current",
      staleInputs: [],
    });
  });

  it("lists each category whose live watermark is newer", () => {
    expect(evaluateStaleness(true, versions(T1, T1, T1), versions(T2, T1, T2))).toEqual({
      status: "stale",
      staleInputs: ["recipes", "exclusions"],
    });
  });

  it("treats a category that was empty at generation and has data now as stale", () => {
    expect(evaluateStaleness(true, versions(T1, T1, null), versions(T1, T1, T1))).toEqual({
      status: "stale",
      staleInputs: ["exclusions"],
    });
  });

  it("treats a category that had data at generation and is empty now as stale", () => {
    expect(evaluateStaleness(true, versions(T1, T1, T1), versions(T1, T1, null))).toEqual({
      status: "stale",
      staleInputs: ["exclusions"],
    });
  });
});
