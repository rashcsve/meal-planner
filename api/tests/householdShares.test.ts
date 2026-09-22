import { describe, expect, it } from "vitest";
import { proposeHouseholdSharePlan } from "shared";

describe("proposeHouseholdSharePlan", () => {
  it("proposes the max target and rounds shares to the nearest quarter", () => {
    const plan = proposeHouseholdSharePlan([
      { memberId: 1, dinnerCalorieTarget: 500 },
      { memberId: 2, dinnerCalorieTarget: 800 },
    ]);
    expect(plan).toEqual({
      targetKcal: 800,
      shares: [
        { memberId: 1, share: 0.75 },
        { memberId: 2, share: 1 },
      ],
    });
  });

  it("gives a lone member a share of 1 against their own target", () => {
    const plan = proposeHouseholdSharePlan([{ memberId: 1, dinnerCalorieTarget: 600 }]);
    expect(plan).toEqual({ targetKcal: 600, shares: [{ memberId: 1, share: 1 }] });
  });

  it("clamps an implausibly small target's share down to the 0.25 floor", () => {
    const plan = proposeHouseholdSharePlan([
      { memberId: 1, dinnerCalorieTarget: 2000 },
      { memberId: 2, dinnerCalorieTarget: 100 },
    ]);
    expect(plan.shares).toContainEqual({ memberId: 2, share: 0.25 });
  });

  it("defaults to 520 kcal with no shares when there are no members yet", () => {
    expect(proposeHouseholdSharePlan([])).toEqual({ targetKcal: 520, shares: [] });
  });
});
