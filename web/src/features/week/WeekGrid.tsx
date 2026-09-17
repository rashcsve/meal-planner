import { useEffect, useRef } from "react";
import { cx } from "../../shared/lib/cx";
import { isClickOutside } from "../../shared/lib/clickOutside";
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
            "flex cursor-pointer flex-col gap-1.5 rounded border bg-card p-2 text-left",
            "focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
            selectedDay === row.day
              ? "border-ink outline-2 -outline-offset-2 outline-ink"
              : "border-line",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="type-label text-9 text-faint">{row.dayLabel}</span>
            {row.locked && (
              <span className="flex items-center gap-0.5 text-9 font-bold text-lock">
                <span aria-hidden="true">🔒</span>
                Locked
              </span>
            )}
          </div>

          {row.recipeTitle ? (
            <span className="type-name text-11 leading-snug">{row.recipeTitle}</span>
          ) : (
            <span className="text-11 text-faint">No recipe assigned</span>
          )}

          {row.recipeTitle && (
            <div className="flex flex-wrap gap-x-2 text-10 text-muted">
              <span>{row.timeMinutes != null ? `${row.timeMinutes} min` : "time unknown"}</span>
              <span>{row.cost != null ? `${row.cost} Kč` : "cost unknown"}</span>
            </div>
          )}

          {row.members.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {row.members.map((m) => (
                <li key={m.memberId} className="flex justify-between text-10 text-muted">
                  <span>{m.memberName}</span>
                  <span className="type-num">
                    {m.servings}x · {m.calories != null ? `${m.calories} kcal` : "kcal unknown"}
                  </span>
                </li>
              ))}
            </ul>
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
        </button>
      ))}
    </div>
  );
}
