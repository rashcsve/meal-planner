import type { ConfirmHouseholdSharesInput } from "shared";
import { proposeHouseholdSharePlan } from "shared";
import { db } from "../db/index.js";
import { findAllHouseholdMembers, confirmMemberShare } from "../repositories/householdMembers.js";
import { confirmStandardPortionTarget } from "../repositories/householdSettings.js";
import {
  HouseholdMemberMissingDinnerTargetError,
  HouseholdMemberNotFoundError,
  HouseholdSettingsNotConfiguredError,
  InvalidStandardPortionTargetError,
  HouseholdShareMemberMismatchError,
} from "../lib/errors.js";

const TARGET_BAND_RATIO = 0.1;

export async function getHouseholdShareProposal() {
  const members = await findAllHouseholdMembers();
  const memberTargets = members.map((member) => {
    if (member.dinnerCalorieTarget === null) {
      throw new HouseholdMemberMissingDinnerTargetError(member.name);
    }
    return { memberId: member.id, dinnerCalorieTarget: member.dinnerCalorieTarget };
  });
  return proposeHouseholdSharePlan(memberTargets);
}

export async function confirmHouseholdShares(input: ConfirmHouseholdSharesInput) {
  const proposal = await getHouseholdShareProposal();

  const lowerBound = proposal.targetKcal * (1 - TARGET_BAND_RATIO);
  const upperBound = proposal.targetKcal * (1 + TARGET_BAND_RATIO);
  if (input.targetKcal < lowerBound || input.targetKcal > upperBound) {
    throw new InvalidStandardPortionTargetError(
      input.targetKcal,
      proposal.targetKcal,
      TARGET_BAND_RATIO,
    );
  }

  const proposedMemberIds = new Set(proposal.shares.map((s) => s.memberId));
  const inputMemberIds = new Set(input.shares.map((s) => s.memberId));
  const sameMembers =
    inputMemberIds.size === input.shares.length &&
    inputMemberIds.size === proposedMemberIds.size &&
    [...inputMemberIds].every((id) => proposedMemberIds.has(id));
  if (!sameMembers) {
    throw new HouseholdShareMemberMismatchError();
  }

  return db.transaction(async (tx) => {
    const settings = await confirmStandardPortionTarget(input.targetKcal, tx);
    if (!settings) throw new HouseholdSettingsNotConfiguredError();

    const members = await Promise.all(
      input.shares.map(async (s) => {
        const member = await confirmMemberShare(s.memberId, s.share, tx);
        if (!member) throw new HouseholdMemberNotFoundError(s.memberId);
        return member;
      }),
    );
    return { settings, members };
  });
}
