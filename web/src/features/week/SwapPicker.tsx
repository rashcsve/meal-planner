import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MEAL_SLOTS, type MealSlot } from "shared";
import { Button } from "../../shared/ui/Button";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { cx } from "../../shared/lib/cx";
import { useRecipeCatalog } from "../../shared/api/recipeCatalog";
import { useHouseholdMembersCatalog } from "../../shared/api/household";
import { useReplaceSlot, useSlotCandidates, useWeek } from "./useWeek";

const PAGE_SIZE = 20;

function withDelta(value: string, delta: number | null) {
  return delta === null ? value : `${value} (${delta >= 0 ? "+" : ""}${delta})`;
}

export function SwapPicker() {
  const params = useParams();
  const navigate = useNavigate();
  const weekStartDate = params.week ?? "";
  const day = Number(params.day);
  const mealSlot = MEAL_SLOTS.find((m) => m === params.mealSlot) as MealSlot;
  const [offset, setOffset] = useState(0);
  const weekQuery = useWeek(weekStartDate);
  const recipesQuery = useRecipeCatalog();
  const membersQuery = useHouseholdMembersCatalog();
  const candidatesQuery = useSlotCandidates(weekStartDate, day, mealSlot, offset);
  const replaceSlot = useReplaceSlot();

  const backToWeek = () => navigate(`/plan?start=${weekStartDate}`);
  const recipeTitle = (id: number) => recipesQuery.data?.find((r) => r.id === id)?.title ?? "";
  const memberName = (id: number) => membersQuery.data?.find((m) => m.id === id)?.name ?? "";
  const week = weekQuery.data;
  const slot = week?.slots.find((s) => s.day === day && s.mealSlot === mealSlot);
  const total = candidatesQuery.data?.total ?? 0;

  function choose(recipeId: number) {
    if (!week) return;
    replaceSlot.mutate(
      { weekStartDate, day, mealSlot, recipeId, expectedRevision: week.revision },
      { onSuccess: backToWeek },
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="type-name text-15">Swap meal</h2>
        <Button variant="secondary" onClick={backToWeek}>
          Cancel
        </Button>
      </div>
      <p className="text-11 text-muted">
        {slot?.recipeId != null
          ? `Current: ${slot.recipeSnapshot?.title ?? recipeTitle(slot.recipeId)}`
          : "No recipe assigned for this day."}
      </p>

      {candidatesQuery.isLoading && <Skeleton className="h-8" />}
      {candidatesQuery.error && (
        <ErrorState title="Couldn't load replacements" message={candidatesQuery.error.message} />
      )}
      {replaceSlot.isError && (
        <ErrorState title="Couldn't replace meal" message={replaceSlot.error.message} />
      )}

      <ul className="flex flex-col gap-1">
        {candidatesQuery.data?.candidates.map((c) => (
          <li key={c.recipeId}>
            <button
              type="button"
              onClick={() => choose(c.recipeId)}
              disabled={!week || replaceSlot.isPending || c.recipeId === slot?.recipeId}
              className={cx(
                "flex w-full flex-col gap-0.5 rounded border px-2 py-1.5 text-left",
                "border-line bg-card hover:border-ink",
                "focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
                "disabled:cursor-default disabled:opacity-50",
              )}
            >
              <span className="type-name text-11">{recipeTitle(c.recipeId)}</span>
              <span className="text-10 text-muted">
                Week{" "}
                {withDelta(`${c.consequences.weekCostCzk} CZK`, c.consequences.weekCostDeltaCzk)}
                {c.consequences.members.map((m) => (
                  <span key={m.memberId}>
                    {" · "}
                    {memberName(m.memberId)} {withDelta(`${m.dinnerKcal} kcal`, m.dinnerKcalDelta)}
                  </span>
                ))}
              </span>
              {c.violations.map((v, i) => (
                <span key={i} className="text-10 text-promo">
                  {v.detail}
                </span>
              ))}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={offset + PAGE_SIZE >= total}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
