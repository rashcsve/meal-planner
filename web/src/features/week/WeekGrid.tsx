import { useEffect, useRef } from "react";
import { cx } from "../../shared/lib/cx";
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
}

export function WeekGrid({ rows, selectedDay, onSelectDay, onDeselect }: WeekGridProps) {
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
        <button
          key={row.day}
          type="button"
          aria-pressed={selectedDay === row.day}
          onClick={() => onSelectDay(row.day)}
          className={cx(
            "flex cursor-pointer flex-col overflow-hidden rounded-card border bg-surface text-left",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lock",
            selectedDay === row.day
              ? "border-ink outline-2 -outline-offset-2 outline-ink"
              : "border-divider",
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
      ))}
    </div>
  );
}
