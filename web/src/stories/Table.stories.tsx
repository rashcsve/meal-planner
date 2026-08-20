import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Table,
  type ColumnDef,
  type GroupRow,
  type RowState,
} from "../shared/ui/Table";

interface Ingredient {
  id: string;
  name: string;
  qty: string;
  price: number;
  expires: string;
  expiresInDays: number;
  state: RowState;
}

type IngredientColumn = ColumnDef<Ingredient> & {
  sortValue?: (row: Ingredient) => number;
};

const rows: (Ingredient | GroupRow)[] = [
  { __group: true, label: "Protein", subtotal: "89 Kč" },
  {
    id: "1",
    name: "Chicken thighs",
    qty: "600 g",
    price: 89,
    expires: "in 6 days",
    expiresInDays: 6,
    state: "none",
  },
  { __group: true, label: "Pantry", subtotal: "276 Kč" },
  {
    id: "2",
    name: "Basmati rice",
    qty: "500 g",
    price: 45,
    expires: "in 2 days",
    expiresInDays: 2,
    state: "check",
  },
  {
    id: "3",
    name: "Olive oil",
    qty: "1 L",
    price: 199,
    expires: "tomorrow",
    expiresInDays: 1,
    state: "promo",
  },
  {
    id: "4",
    name: "Greek yogurt",
    qty: "400 g",
    price: 32,
    expires: "in 1 day",
    expiresInDays: 1,
    state: "expiring",
  },
];

const columns: IngredientColumn[] = [
  { key: "name", header: "Ingredient", primary: true, render: (r) => r.name },
  {
    key: "qty",
    header: "Qty",
    render: (r) => <span className="text-muted">{r.qty}</span>,
  },
  {
    key: "price",
    header: "Price",
    align: "right",
    width: "90px",
    sortable: true,
    sortValue: (r) => r.price,
    render: (r) => `${r.price} Kč`,
  },
  {
    key: "expires",
    header: "Expires",
    width: "100px",
    sortable: true,
    sortValue: (r) => r.expiresInDays,
    render: (r) => {
      const className =
        r.state === "check"
          ? "font-bold text-check"
          : r.state === "promo" || r.state === "expiring"
            ? "font-bold text-promo"
            : "text-muted";
      return <span className={className}>{r.expires}</span>;
    },
  },
];

// sorts within each group so group headers stay put
function sortRows(
  items: (Ingredient | GroupRow)[],
  getValue: (row: Ingredient) => number,
  direction: "asc" | "desc",
) {
  const sorted: (Ingredient | GroupRow)[] = [];
  let bucket: Ingredient[] = [];
  const flush = () => {
    bucket.sort((a, b) =>
      direction === "asc"
        ? getValue(a) - getValue(b)
        : getValue(b) - getValue(a),
    );
    sorted.push(...bucket);
    bucket = [];
  };
  for (const item of items) {
    if ("__group" in item) {
      flush();
      sorted.push(item);
    } else {
      bucket.push(item);
    }
  }
  flush();
  return sorted;
}

function FullTableStory() {
  const [sortKey, setSortKey] = useState("price");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );

  const sortedRows = useMemo(() => {
    const getValue = columns.find((c) => c.key === sortKey)?.sortValue;
    return getValue ? sortRows(rows, getValue, sortDirection) : rows;
  }, [sortKey, sortDirection]);

  function handleSortChange(key: string, direction: "asc" | "desc") {
    setSortKey(key);
    setSortDirection(direction);
  }

  function toggle(id: string | number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <Table
      rows={sortedRows}
      columns={columns}
      rowId={(r) => r.id}
      getRowState={(r) => r.state}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
      selectedIds={selectedIds}
      onToggleSelect={toggle}
    />
  );
}

function BasicTableStory() {
  const plainRows = rows.filter((r): r is Ingredient => !("__group" in r));
  return <Table rows={plainRows} columns={columns} rowId={(r) => r.id} />;
}

const meta: Meta<typeof FullTableStory> = {
  title: "shared/ui/Table",
  component: FullTableStory,
};

export default meta;
type Story = StoryObj<typeof FullTableStory>;

export const Basic: Story = { render: () => <BasicTableStory /> };
export const Ingredients: Story = {};
