import { Button } from "../../shared/ui/Button";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Skeleton } from "../../shared/ui/Skeleton";
import { Stat } from "../../shared/ui/Stat";
import type { HouseholdMember, HouseholdShareProposal as ShareProposalData } from "./useHousehold";

interface ShareProposalProps {
  proposal: ShareProposalData | undefined;
  isLoading: boolean;
  error?: string;
  members: HouseholdMember[];
  isConfirmed: boolean;
  confirmedAt: string | null;
  onConfirm: (proposal: ShareProposalData) => void;
  isConfirming: boolean;
  confirmError?: string;
}

export function ShareProposal({
  proposal,
  isLoading,
  error,
  members,
  isConfirmed,
  confirmedAt,
  onConfirm,
  isConfirming,
  confirmError,
}: ShareProposalProps) {
  const memberName = (memberId: number) =>
    members.find((m) => m.id === memberId)?.name ?? `Member ${memberId}`;
  const totalPortions = proposal?.shares.reduce((sum, s) => sum + s.share, 0);

  return (
    <div className="rounded border border-line bg-card">
      <div className="flex items-center justify-between border-b border-line px-2.5 py-1.75">
        <span className="type-label text-9 text-faint">Standard portion &amp; shares</span>
        {isConfirmed && confirmedAt && (
          <span className="type-label text-9 text-ok">
            Confirmed{" "}
            {new Date(confirmedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-1.5 p-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-2.5">
          <ErrorState title="Couldn't compute the share proposal" message={error} />
        </div>
      )}

      {proposal && !isLoading && !error && (
        <>
          <div className="flex items-center gap-4 border-b border-hair px-2.5 py-1.75">
            <Stat label="Standard portion target" value={proposal.targetKcal} unit="kcal" />
            <Stat label="Total portions" value={totalPortions} />
          </div>
          {proposal.shares.map((s) => (
            <div
              key={s.memberId}
              className="flex items-center gap-2 border-b border-hair px-2.5 py-1.75 last:border-b-0"
            >
              <span className="type-name flex-1 text-11">{memberName(s.memberId)}</span>
              <span className="type-num text-13">{s.share}</span>
              <span className="type-label text-9 text-faint">portions</span>
            </div>
          ))}
          {confirmError && (
            <div className="px-2.5 pt-1.75">
              <ErrorState title="Couldn't confirm" message={confirmError} />
            </div>
          )}
          <div className="flex items-center gap-1.5 border-t border-line px-2.5 py-1.75">
            <Button variant="ghost" onClick={() => onConfirm(proposal)} disabled={isConfirming}>
              {isConfirmed ? "Re-confirm" : "Confirm"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
