import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "../lib/cx";

export type Align = "left" | "right";

export type RowState = "none" | "check" | "promo" | "expiring";

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: Align;
  width?: string;
  sortable?: boolean;
  primary?: boolean;
  render: (row: T) => ReactNode;
}

export type SortDirection = "asc" | "desc";

export interface GroupRow {
  __group: true;
  label: string;
  subtotal: ReactNode;
}

function isGroupRow<T>(row: T | GroupRow): row is GroupRow {
  return typeof row === "object" && row !== null && "__group" in row;
}

function ariaSortValue(isSorted: boolean, direction: SortDirection | undefined): "ascending" | "descending" | "none" {
  if (!isSorted) return "none";
  return direction === "asc" ? "ascending" : "descending";
}

function SortArrow({ visible, direction }: { visible: boolean; direction: SortDirection | undefined }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "ml-1 inline-block",
        visible ? "opacity-100" : "opacity-0",
        direction === "desc" && "rotate-180",
      )}
    >
      ▲
    </span>
  );
}

export interface TableProps<T> {
  rows: (T | GroupRow)[];
  columns: ColumnDef<T>[];
  rowId: (row: T) => string | number;
  getRowState?: (row: T) => RowState;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSortChange?: (key: string, direction: SortDirection) => void;
  selectedIds?: Set<string | number>;
  onToggleSelect?: (id: string | number) => void;
  onRowClick?: (row: T) => void;
}

const rowStateShadow: Record<RowState, string> = {
  none: "",
  check: "shadow-[inset_2px_0_0_0_var(--color-check)]",
  promo: "shadow-[inset_2px_0_0_0_var(--color-promo)]",
  expiring: "shadow-[inset_2px_0_0_0_var(--color-promo)]",
};

export function Table<T>({
  rows,
  columns,
  rowId,
  getRowState,
  sortKey,
  sortDirection,
  onSortChange,
  selectedIds,
  onToggleSelect,
  onRowClick,
}: TableProps<T>) {
  const showCheckbox = Boolean(selectedIds && onToggleSelect);

  function handleHeaderClick(key: string) {
    const nextDirection: SortDirection = key === sortKey && sortDirection === "asc" ? "desc" : "asc";
    onSortChange?.(key, nextDirection);
  }

  return (
    <table className="w-full table-fixed rounded border-collapse border border-line bg-card text-12">
      <thead className="sticky top-0 z-10 bg-rail">
        <tr>
          {showCheckbox && (
            <th className="border-b border-line px-2.25 py-1.75" style={{ width: "26px" }} />
          )}
          {columns.map((col) => {
            const isSorted = sortKey === col.key;

            function handleKeyDown(e: KeyboardEvent) {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleHeaderClick(col.key);
              }
            }

            return (
              <th
                key={col.key}
                onClick={col.sortable ? () => handleHeaderClick(col.key) : undefined}
                onKeyDown={col.sortable ? handleKeyDown : undefined}
                tabIndex={col.sortable ? 0 : undefined}
                role={col.sortable ? "button" : undefined}
                aria-sort={col.sortable ? ariaSortValue(isSorted, sortDirection) : undefined}
                style={{ width: col.width }}
                className={cx(
                  "whitespace-nowrap border-b border-line px-2.25 py-1.75 text-9 font-bold font-stretch-88% tracking-[0.07em] text-faint uppercase",
                  col.align === "right" ? "text-right" : "text-left",
                  col.sortable &&
                    "cursor-pointer select-none hover:text-ink focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
                )}
              >
                {col.header}
                {col.sortable && (
                  <SortArrow visible={isSorted} direction={sortDirection} />
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="[&>tr:last-child>td]:border-b-0">
        {rows.map((row) => {
          if (isGroupRow(row)) {
            return (
              <tr key={`group-${row.label}`} className="bg-rail">
                <td
                  colSpan={columns.length + (showCheckbox ? 1 : 0)}
                  className="px-2.25 py-1.25"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-10 font-black font-stretch-76% tracking-wider text-ink uppercase">
                      {row.label}
                    </span>
                    <span className="text-right text-12 font-extrabold font-stretch-80% [font-feature-settings:'tnum']">
                      {row.subtotal}
                    </span>
                  </div>
                </td>
              </tr>
            );
          }

          const item: T = row;
          const id = rowId(item);
          const state = getRowState?.(item) ?? "none";
          const checked = selectedIds?.has(id) ?? false;

          function handleRowKeyDown(e: KeyboardEvent) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onRowClick?.(item);
            }
          }

          return (
            <tr
              key={id}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              onKeyDown={onRowClick ? handleRowKeyDown : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              className={cx(
                "hover:bg-rail",
                onRowClick &&
                  "cursor-pointer focus-visible:outline-thin focus-visible:outline-lock focus-visible:-outline-offset-1",
              )}
            >
              {showCheckbox && (
                <td className={cx("border-b border-hair px-2.25 py-1.5", rowStateShadow[state])}>
                  <label className="inline-flex cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelect?.(id)}
                      className="peer sr-only"
                    />
                    <span
                      className={cx(
                        "grid h-4 w-4 place-items-center rounded border-[1.5px] border-ink text-10 text-transparent",
                        "peer-checked:bg-ink peer-checked:text-paper",
                        "peer-focus-visible:outline-[1.5px] peer-focus-visible:outline-lock peer-focus-visible:-outline-offset-1",
                      )}
                    >
                      ✓
                    </span>
                  </label>
                </td>
              )}
              {columns.map((col, i) => (
                <td
                  key={col.key}
                  className={cx(
                    "border-b border-hair px-2.25 py-1.5",
                    col.align === "right"
                      ? "text-right font-bold font-stretch-84% [font-feature-settings:'tnum']"
                      : "text-left",
                    !showCheckbox && i === 0 && rowStateShadow[state],
                  )}
                >
                  {col.primary ? (
                    <span
                      className={cx(
                        "type-name block truncate",
                        checked && "text-faint line-through",
                      )}
                    >
                      {col.render(row)}
                    </span>
                  ) : (
                    col.render(row)
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
