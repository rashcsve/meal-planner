import { Table, type ColumnDef, type RowState } from "../../shared/ui/Table";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { EmptyState } from "../../shared/ui/EmptyState";
import { CloseButton } from "../../shared/ui/CloseButton";
import { daysUntil, expiryRowState, formatExpiry } from "../../shared/lib/expiry";
import type { ReactNode } from "react";
import { usePantryItems, useRemovePantryItem, type PantryItem } from "./usePantry";
import { AddToFridgeForm } from "./AddToFridgeForm";

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

const expiryTone: Record<RowState, string> = {
  none: "",
  check: "text-warning",
  promo: "text-danger",
  expiring: "text-danger",
};

function urgencyLabel(state: RowState): string | null {
  if (state === "promo") return "expires very soon";
  if (state === "check") return "expiring soon";
  return null;
}

function FridgeCard({ count, children }: { count?: number; children: ReactNode }) {
  return (
    <div className="h-full overflow-auto bg-page p-8">
      <section className="flex flex-col gap-4 rounded-card border border-divider bg-surface p-6">
        <header>
          {count != null && (
            <p className="type-label">{count === 1 ? "1 item" : `${count} items`}</p>
          )}
          <h1 className="type-page-title text-ink">Fridge</h1>
        </header>
        {children}
      </section>
    </div>
  );
}

export function PantryPage() {
  const { data, isLoading, error } = usePantryItems();
  const removeItem = useRemovePantryItem();

  const columns: ColumnDef<PantryItem>[] = [
    { key: "ingredientName", header: "Item", primary: true, render: (i) => i.ingredientName },
    { key: "amount", header: "Amount", align: "right", width: "100px", render: formatAmount },
    {
      key: "expiresOn",
      header: "Expires",
      width: "120px",
      render: (i) => {
        const state = rowState(i);
        const label = urgencyLabel(state);
        return (
          <>
            <span className={expiryTone[state]}>
              {i.expiresOn ? formatExpiry(i.expiresOn) : "—"}
            </span>
            {label && <span className="sr-only"> — {label}</span>}
          </>
        );
      },
    },
    {
      key: "remove",
      header: "Take it out",
      width: "100px",
      align: "right",
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
      <FridgeCard>
        <div role="status" aria-label="Loading fridge" className="flex flex-col gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      </FridgeCard>
    );
  }

  if (error) {
    return (
      <FridgeCard>
        <ErrorState title="Couldn't load fridge" message={error.message} />
      </FridgeCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <FridgeCard count={0}>
        <AddToFridgeForm />
        <EmptyState message="Your fridge is empty." action={null} />
      </FridgeCard>
    );
  }

  return (
    <FridgeCard count={data.length}>
      <AddToFridgeForm />
      <Table rows={data} columns={columns} rowId={(i) => i.id} getRowState={rowState} />
    </FridgeCard>
  );
}
