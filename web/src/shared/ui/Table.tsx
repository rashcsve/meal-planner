import type { ReactNode } from "react";

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

export interface TableProps<T> {
  rows: (T | GroupRow)[];
  columns: ColumnDef<T>[];
  rowId: (row: T) => string | number;
  getRowState?: (row: T) => RowState;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  selectedIds?: Set<string | number>;
  onToggleSelect?: (id: string | number) => void;
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
  onSort,
  selectedIds,
  onToggleSelect,
}: TableProps<T>) {
  const showCheckbox = Boolean(selectedIds && onToggleSelect);

  return (
    <table className="w-full rounded border-collapse border border-line bg-card text-12">
      <thead className="sticky top-0 z-10 bg-rail">
        <tr>
          {showCheckbox && (
            <th className="border-b border-line px-2.25 py-1.75" style={{ width: "26px" }} />
          )}
          {columns.map((col) => (
            <th
              key={col.key}
              onClick={col.sortable ? () => onSort?.(col.key) : undefined}
              style={{ width: col.width }}
              className={[
                "border-b border-line px-2.25 py-1.75 text-9 font-bold font-stretch-88% tracking-[0.07em] text-faint uppercase",
                col.align === "right" ? "text-right" : "text-left",
                col.sortable ? "cursor-pointer select-none hover:text-ink" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {col.header}
              {sortKey === col.key
                ? sortDirection === "asc"
                  ? " ▲"
                  : " ▼"
                : ""}
            </th>
          ))}
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

          const id = rowId(row);
          const state = getRowState?.(row) ?? "none";
          const checked = selectedIds?.has(id) ?? false;
          return (
            <tr key={id} className="hover:bg-rail">
              {showCheckbox && (
                <td
                  className={[
                    "border-b border-hair px-2.25 py-1.5",
                    rowStateShadow[state],
                  ].join(" ")}
                >
                  <label className="inline-flex cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelect?.(id)}
                      className="peer sr-only"
                    />
                    <span
                      className={[
                        "grid h-4 w-4 place-items-center rounded border-[1.5px] border-ink text-10 text-transparent",
                        "peer-checked:bg-ink peer-checked:text-paper",
                        "peer-focus-visible:outline-[1.5px] peer-focus-visible:outline-lock peer-focus-visible:-outline-offset-1",
                      ].join(" ")}
                    >
                      ✓
                    </span>
                  </label>
                </td>
              )}
              {columns.map((col, i) => (
                <td
                  key={col.key}
                  className={[
                    "border-b border-hair px-2.25 py-1.5",
                    col.align === "right"
                      ? "text-right font-bold font-stretch-84% [font-feature-settings:'tnum']"
                      : "text-left",
                    !showCheckbox && i === 0 ? rowStateShadow[state] : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {col.primary ? (
                    <span
                      className={[
                        "type-name",
                        checked ? "text-faint line-through" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
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
