import type { MemberDinnerTarget } from "./planner.js";

export interface ProposedMemberShare {
  memberId: number;
  share: number;
}

export interface ProposedHouseholdSharePlan {
  targetKcal: number;
  shares: ProposedMemberShare[];
}

const DEFAULT_TARGET_KCAL = 520;
const SHARE_STEP = 0.25;
const MIN_SHARE = 0.25;

export function proposeHouseholdSharePlan(
  members: MemberDinnerTarget[],
): ProposedHouseholdSharePlan {
  if (members.length === 0) {
    return { targetKcal: DEFAULT_TARGET_KCAL, shares: [] };
  }

  const targetKcal = Math.max(...members.map((member) => member.dinnerCalorieTarget));
  const shares = members.map((member) => {
    const rawShare = Math.round(member.dinnerCalorieTarget / targetKcal / SHARE_STEP) * SHARE_STEP;
    return { memberId: member.memberId, share: Math.max(MIN_SHARE, rawShare) };
  });

  return { targetKcal, shares };
}
