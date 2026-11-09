import { useEffect, useRef } from "react";
import { cx } from "../../shared/lib/cx";
import { Button } from "../../shared/ui/Button";
import { isClickOutside } from "../../shared/lib/clickOutside";
import { DishPhoto } from "../../shared/ui/DishPhoto";
import { ReasonTag } from "../../shared/ui/ReasonTag";
import type { WeekDayRow } from "./deriveWeekRows";

const IGNORE_SELECTOR = "[data-week-grid-ignore]";

interface WeekGridProps {
  rows: WeekDayRow[];
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onDeselect: () => void;
  onSetLocked?: (day: number, locked: boolean) => void;
  lockError?: { day: number; locked: boolean } | null;
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
      <rect
        x="3"
        y="7"
        width="10"
        height="7"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function WeekGrid({
  rows,
  selectedDay,
  onSelectDay,
  onDeselect,
  onSetLocked,
  lockError,
}: WeekGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDay === null) return;
    function handlePointerDown(e: MouseEvent) {
      if (isClickOutside(e.target, gridRef.current, IGNORE_SELECTOR)) {
        onDeselect();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [selectedDay, onDeselect]);

  return (
    <div ref={gridRef} className="grid grid-cols-1 gap-1.5 md:grid-cols-7">
      {rows.map((row) => (
        <div
          key={row.day}
          data-day-card
          className={cx(
            "flex flex-col overflow-hidden rounded-card border bg-surface",
            selectedDay === row.day
              ? "border-ink outline-2 -outline-offset-2 outline-ink"
              : "border-divider",
          )}
        >
          <button
            type="button"
            aria-pressed={selectedDay === row.day}
            onClick={() => onSelectDay(row.day)}
            className={cx(
              "flex flex-1 cursor-pointer flex-col text-left",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lock",
            )}
          >
            <div className="relative h-24 bg-fill">
              {row.recipeTitle && (
                <div aria-hidden="true" className="size-full">
                  <DishPhoto name={row.recipeTitle} />
                </div>
              )}
              <span className="absolute top-2 left-2 rounded-tag bg-surface px-1.5 py-0.5 type-label text-ink">
                {row.dayLabel}
              </span>
              {row.locked && (
                <span className="absolute top-2 right-2 rounded-tag bg-lock-tint px-1.5 py-0.5 text-xs font-semibold text-lock">
                  Locked
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 p-3">
              {row.recipeTitle ? (
                <>
                  <span className="type-section text-ink">{row.recipeTitle}</span>
                  <span className="type-small text-muted">
                    {row.kcalPerPortion != null ? `${row.kcalPerPortion} kcal a portion · ` : ""}
                    {row.timeMinutes} min
                  </span>
                  <span className="self-start rounded-tag bg-fill px-1.5 py-0.5 text-xs font-semibold text-ink">
                    {row.portions} {row.portions === 1 ? "portion" : "portions"}
                  </span>
                </>
              ) : (
                <span className="type-small text-muted">No recipe assigned</span>
              )}

              {row.reasonTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {row.reasonTags.map((tag) => (
                    <ReasonTag key={tag.variant} variant={tag.variant} title={tag.detail}>
                      {tag.label}
                    </ReasonTag>
                  ))}
                </div>
              )}
            </div>
          </button>
          {onSetLocked && (
            <div className="flex flex-col gap-2 px-3 pb-3">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  aria-label={`Swap ${row.dayLabel}`}
                  className="flex-1"
                  onClick={() => onSelectDay(row.day)}
                >
                  Swap
                </Button>
                {row.recipeTitle && (
                  <Button
                    variant={row.locked ? "primary" : "secondary"}
                    aria-pressed={row.locked}
                    aria-label={`${row.locked ? "Unlock" : "Lock"} ${row.dayLabel}`}
                    className="w-11 shrink-0 px-0"
                    onClick={() => onSetLocked(row.day, !row.locked)}
                  >
                    <LockIcon />
                  </Button>
                )}
              </div>
              {lockError?.day === row.day && (
                <p role="alert" className="type-small text-danger">
                  {lockError.locked ? "Couldn't lock meal" : "Couldn't unlock meal"}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
