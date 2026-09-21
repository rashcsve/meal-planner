import { DetailRail } from "../../shared/layout/DetailRail";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Button } from "../../shared/ui/Button";
import { Pill } from "../../shared/ui/Pill";
import { ReasonTag } from "../../shared/ui/ReasonTag";
import { rowStateShadow } from "../../shared/ui/Table";
import { cx } from "../../shared/lib/cx";
import { useRecipeDetail, type RecipeCatalogEntry } from "../../shared/api/recipeCatalog";
import type { HouseholdMemberEntry } from "../../shared/api/household";
import { useReplaceSlot, useSetSlotLocked, useSlotCandidates } from "./useWeek";
import type { PlanSlot } from "./useWeek";
import { deriveMealDetail, deriveCandidateRows } from "./deriveMealDetail";

const RAIL_CLASSES =
  "w-full border-t border-line bg-rail md:w-73 md:shrink-0 md:border-t-0 md:border-l";

interface MealDetailRailProps {
  weekStartDate: string;
  revision: number;
  slot: PlanSlot;
  members: HouseholdMemberEntry[];
  recipes: RecipeCatalogEntry[];
  onClose: () => void;
}

export function MealDetailRail({
  weekStartDate,
  revision,
  slot,
  members,
  recipes,
  onClose,
}: MealDetailRailProps) {
  const mealSlot = "dinner" as const;
  const recipeQuery = useRecipeDetail(slot.recipeId ?? undefined);
  const candidatesQuery = useSlotCandidates(weekStartDate, slot.locked ? null : slot.day, mealSlot);
  const replaceSlot = useReplaceSlot();
  const setSlotLocked = useSetSlotLocked();

  const detail = deriveMealDetail(slot, recipeQuery.data, members);
  const candidateRows = deriveCandidateRows(
    candidatesQuery.data?.candidates ?? [],
    recipes,
    members,
  );

  function handleUnlock() {
    setSlotLocked.mutate({
      weekStartDate,
      day: slot.day,
      mealSlot,
      locked: false,
      expectedRevision: revision,
    });
  }

  function handleReplace(recipeId: number) {
    replaceSlot.mutate({
      weekStartDate,
      day: slot.day,
      mealSlot,
      recipeId,
      expectedRevision: revision,
    });
  }

  return (
    <DetailRail label="Meal" onClose={onClose} className={RAIL_CLASSES}>
      <div data-week-grid-ignore className="flex flex-col gap-3">
        {slot.recipeId === null && (
          <p className="text-11 text-faint">No recipe assigned for this day.</p>
        )}

        {recipeQuery.isLoading && (
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5" />
            <Skeleton className="h-4" />
          </div>
        )}
        {recipeQuery.error && (
          <ErrorState title="Couldn't load meal" message={recipeQuery.error.message} />
        )}

        {detail && (
          <>
            <div>
              <h3 className="type-name text-15">{detail.title}</h3>
              <p className="mt-1 text-11 text-muted">{detail.meta}</p>
            </div>

            {detail.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {detail.tags.map((tag) => (
                  <Pill key={tag}>{tag}</Pill>
                ))}
              </div>
            )}

            {detail.reasonTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {detail.reasonTags.map((tag) => (
                  <ReasonTag key={tag.variant} variant={tag.variant} title={tag.detail}>
                    {tag.label}
                  </ReasonTag>
                ))}
              </div>
            )}

            {detail.members.length > 0 && (
              <div className="border-t border-hair pt-2.5">
                <span className="type-label text-9 text-faint">Servings</span>
                <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2">
                  {detail.members.map((m) => (
                    <div key={m.memberId}>
                      <span className="type-label block text-9 text-faint">{m.memberName}</span>
                      <span className="type-num text-13">
                        {m.servings}x
                        {m.calories != null && (
                          <span className="ml-1 text-10 text-faint">{m.calories} kcal</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.ingredients.length > 0 && (
              <div className="border-t border-hair pt-2.5">
                <span className="type-label text-9 text-faint">Ingredients</span>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {detail.ingredients.map((line) => (
                    <li
                      key={line.id}
                      className={cx("pl-1.5 text-11", line.incomplete && rowStateShadow.check)}
                    >
                      {line.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {slot.recipeId !== null && (
          <div className="border-t border-hair pt-2.5">
            {slot.locked ? (
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-11 font-bold text-lock">
                  <span aria-hidden="true">🔒</span>
                  Locked
                </span>
                <Button variant="ghost" onClick={handleUnlock} disabled={setSlotLocked.isPending}>
                  Unlock to edit
                </Button>
              </div>
            ) : (
              <>
                <span className="type-label text-9 text-faint">Replace with</span>
                {candidatesQuery.isLoading && (
                  <div className="mt-1.5 flex flex-col gap-1">
                    <Skeleton className="h-8" />
                    <Skeleton className="h-8" />
                  </div>
                )}
                {candidatesQuery.error && (
                  <ErrorState
                    title="Couldn't load replacements"
                    message={candidatesQuery.error.message}
                  />
                )}
                {!candidatesQuery.isLoading &&
                  !candidatesQuery.error &&
                  candidateRows.length === 0 && (
                    <p className="mt-1.5 text-11 text-faint">No eligible replacements found.</p>
                  )}
                <ul className="mt-1.5 flex flex-col gap-1">
                  {candidateRows.map((row) => (
                    <li key={row.recipeId}>
                      <button
                        type="button"
                        onClick={() => handleReplace(row.recipeId)}
                        disabled={replaceSlot.isPending || row.recipeId === slot.recipeId}
                        className={cx(
                          "flex w-full flex-col gap-0.5 rounded border px-2 py-1.5 text-left",
                          "border-line bg-card hover:border-ink",
                          "focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
                          "disabled:cursor-default disabled:opacity-50",
                        )}
                      >
                        <span className="type-name text-11">{row.title}</span>
                        <span className="text-10 text-muted">{row.meta}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {replaceSlot.isError && (
              <div className="mt-2">
                <ErrorState title="Couldn't replace meal" message={replaceSlot.error.message} />
              </div>
            )}
            {setSlotLocked.isError && (
              <div className="mt-2">
                <ErrorState title="Couldn't unlock meal" message={setSlotLocked.error.message} />
              </div>
            )}
          </div>
        )}
      </div>
    </DetailRail>
  );
}
