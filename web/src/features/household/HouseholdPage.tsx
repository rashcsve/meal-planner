import type { ReactNode } from "react";
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

const DEFAULT_SETTINGS: Partial<UpdateHouseholdSettingsInput> = {
  startDayOfWeek: 1,
  timezone: "Europe/Prague",
};

function HouseholdFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-auto bg-page p-8">
      <div className="flex flex-col gap-4">
        <header>
          <p className="type-label">Everything the planner reads before it runs</p>
          <h1 className="type-page-title text-ink">Household</h1>
        </header>
        {children}
      </div>
    </div>
  );
}

export function HouseholdPage() {
  const settingsQuery = useHouseholdSettings();
  const membersQuery = useHouseholdMembers();
  const proposalQuery = useHouseholdShareProposal();
  const updateSettings = useUpdateHouseholdSettings();
  const updateMemberTarget = useUpdateMemberDinnerTarget();
  const confirmShares = useConfirmHouseholdShares();

  if (settingsQuery.isLoading || membersQuery.isLoading) {
    return (
      <HouseholdFrame>
        <div role="status" aria-label="Loading household" className="flex flex-col gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </HouseholdFrame>
    );
  }

  if (settingsQuery.error || membersQuery.error) {
    return (
      <HouseholdFrame>
        <ErrorState
          title="Couldn't load household settings"
          message={(settingsQuery.error ?? membersQuery.error)!.message}
        />
      </HouseholdFrame>
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
    <HouseholdFrame>
      <div className="flex flex-col gap-3">
        <HouseholdSettingsForm
          defaultValues={defaultValues}
          onSubmit={(data) => updateSettings.mutate(data)}
          isSaving={updateSettings.isPending}
          error={updateSettings.error?.message}
        />

        <section
          aria-labelledby="who-eats-heading"
          className="flex flex-col gap-3 rounded-lg border border-divider bg-surface p-6"
        >
          <header className="flex flex-wrap items-baseline gap-x-3">
            <h2 id="who-eats-heading" className="type-section text-ink">
              Who eats
            </h2>
            <p className="type-small text-muted">Dinner calorie target for each person</p>
          </header>
          {membersQuery.data?.length === 0 && (
            <p className="type-body text-muted">No one in the household yet.</p>
          )}
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
        </section>

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
    </HouseholdFrame>
  );
}
