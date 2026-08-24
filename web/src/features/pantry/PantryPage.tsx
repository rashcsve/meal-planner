import { Table, type ColumnDef, type RowState } from "../../shared/ui/Table";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { EmptyState } from "../../shared/ui/EmptyState";
import { CloseButton } from "../../shared/ui/CloseButton";
import { daysUntil, expiryRowState, formatExpiry } from "../../shared/lib/expiry";
import { usePantryItems, useRemovePantryItem, type PantryItem } from "./usePantry";

function formatAmount(item: PantryItem): string {
  if (item.displayAmount != null && item.displayUnit) {
    return `${item.displayAmount} ${item.displayUnit}`;
  }
  return `${item.amountBase}`;
}

function rowState(item: PantryItem): RowState {
  if (!item.expiresOn) return "none";
  return expiryRowState(daysUntil(item.expiresOn));
}

function urgencyLabel(state: RowState): string | null {
  if (state === "promo") return "expires very soon";
  if (state === "check") return "expiring soon";
  return null;
}

export function PantryPage() {
  const { data, isLoading, error } = usePantryItems();
  const removeItem = useRemovePantryItem();

  const columns: ColumnDef<PantryItem>[] = [
    { key: "ingredientName", header: "Ingredient", primary: true, render: (i) => i.ingredientName },
    { key: "amount", header: "Amount", align: "right", width: "100px", render: formatAmount },
    {
      key: "expiresOn",
      header: "Expires",
      width: "100px",
      render: (i) => {
        const label = urgencyLabel(rowState(i));
        return (
          <>
            {i.expiresOn ? formatExpiry(i.expiresOn) : "—"}
            {label && <span className="sr-only"> — {label}</span>}
          </>
        );
      },
    },
    {
      key: "remove",
      header: "",
      width: "40px",
      render: (i) => (
        <CloseButton
          aria-label={`Remove ${i.ingredientName}`}
          onClick={() => removeItem.mutate(i.id)}
        />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-3.5">
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-auto p-3.5">
        <ErrorState title="Couldn't load pantry" message={error.message} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full overflow-auto p-3.5">
        <EmptyState message="No items in your pantry yet." action={null} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-3.5">
      <Table
        rows={data}
        columns={columns}
        rowId={(i) => i.id}
        getRowState={rowState}
      />
    </div>
  );
}
