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
    <table className="w-full border-collapse text-12">
      <thead className="sticky top-0 z-10 bg-rail">
        <tr>
          {showCheckbox && (
            <th className="border-b border-line px-3 py-2" style={{ width: "26px" }} />
          )}
          {columns.map((col) => (
            <th
              key={col.key}
              onClick={col.sortable ? () => onSort?.(col.key) : undefined}
              style={{ width: col.width }}
              className={[
                "type-label border-b border-line px-3 py-2 text-9 text-faint",
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
      <tbody>
        {rows.map((row) => {
          if (isGroupRow(row)) {
            return (
              <tr key={`group-${row.label}`} className="bg-sink">
                <td
                  colSpan={columns.length + (showCheckbox ? 1 : 0)}
                  className="px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="type-label text-9 text-muted">{row.label}</span>
                    <span className="type-num text-right">{row.subtotal}</span>
                  </div>
                </td>
              </tr>
            );
          }

          const id = rowId(row);
          const state = getRowState?.(row) ?? "none";
          const checked = selectedIds?.has(id) ?? false;
          return (
            <tr key={id} className="hover:bg-sink">
              {showCheckbox && (
                <td
                  className={[
                    "border-b border-hair px-3 py-2",
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
                        "grid h-[16px] w-[16px] place-items-center rounded border-[1.5px] border-ink text-10 text-transparent",
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
                    "border-b border-hair px-3 py-2",
                    col.align === "right" ? "type-num text-right" : "text-left",
                    !showCheckbox && i === 0 ? rowStateShadow[state] : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {col.primary && checked ? (
                    <span className="text-faint line-through">{col.render(row)}</span>
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
