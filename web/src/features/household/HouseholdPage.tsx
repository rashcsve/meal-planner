import type { UpdateHouseholdSettingsInput } from "shared";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { HouseholdSettingsForm } from "./HouseholdSettingsForm";
import { MemberTargetRow } from "./MemberTargetRow";
import { ShareProposal } from "./ShareProposal";
import {
  useHouseholdSettings,
  useHouseholdMembers,
  useHouseholdShareProposal,
  useUpdateHouseholdSettings,
  useUpdateMemberDinnerTarget,
  useConfirmHouseholdShares,
} from "./useHousehold";

const DEFAULT_SETTINGS: UpdateHouseholdSettingsInput = {
  weeklyBudgetCzk: 0,
  startDayOfWeek: 1,
  timezone: "Europe/Prague",
};

export function HouseholdPage() {
  const settingsQuery = useHouseholdSettings();
  const membersQuery = useHouseholdMembers();
  const proposalQuery = useHouseholdShareProposal();
  const updateSettings = useUpdateHouseholdSettings();
  const updateMemberTarget = useUpdateMemberDinnerTarget();
  const confirmShares = useConfirmHouseholdShares();

  if (settingsQuery.isLoading || membersQuery.isLoading) {
    return (
      <div className="h-full overflow-auto p-3.5">
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </div>
    );
  }

  if (settingsQuery.error || membersQuery.error) {
    return (
      <div className="h-full overflow-auto p-3.5">
        <ErrorState
          title="Couldn't load household settings"
          message={(settingsQuery.error ?? membersQuery.error)!.message}
        />
      </div>
    );
  }

  const defaultValues = settingsQuery.data
    ? {
        weeklyBudgetCzk: settingsQuery.data.weeklyBudgetCzk,
        startDayOfWeek: settingsQuery.data.startDayOfWeek,
        timezone: settingsQuery.data.timezone,
      }
    : DEFAULT_SETTINGS;

  return (
    <div className="h-full overflow-auto p-3.5">
      <div className="flex flex-col gap-3">
        <HouseholdSettingsForm
          defaultValues={defaultValues}
          onSubmit={(data) => updateSettings.mutate(data)}
          isSaving={updateSettings.isPending}
          error={updateSettings.error?.message}
        />

        <div className="rounded border border-line bg-card">
          <div className="border-b border-line px-2.5 py-1.75">
            <span className="type-label text-9 text-faint">Dinner calorie targets</span>
          </div>
          {(membersQuery.data ?? []).map((member) => (
            <MemberTargetRow
              key={member.id}
              member={member}
              isSaving={
                updateMemberTarget.isPending && updateMemberTarget.variables?.id === member.id
              }
              error={
                updateMemberTarget.isError && updateMemberTarget.variables?.id === member.id
                  ? updateMemberTarget.error.message
                  : undefined
              }
              onSave={(dinnerCalorieTarget) =>
                updateMemberTarget.mutate({ id: member.id, dinnerCalorieTarget })
              }
            />
          ))}
        </div>

        <ShareProposal
          proposal={proposalQuery.data}
          isLoading={proposalQuery.isLoading}
          error={proposalQuery.error?.message}
          members={membersQuery.data ?? []}
          isConfirmed={settingsQuery.data?.standardPortionTargetKcal != null}
          confirmedAt={settingsQuery.data?.standardPortionConfirmedAt ?? null}
          onConfirm={(proposal) => confirmShares.mutate(proposal)}
          isConfirming={confirmShares.isPending}
          confirmError={confirmShares.error?.message}
        />
      </div>
    </div>
  );
}
